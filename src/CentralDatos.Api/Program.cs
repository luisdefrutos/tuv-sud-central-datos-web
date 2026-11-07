using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.Threading.RateLimiting;
using System.Text;
using CentralDatos.Api.Endpoints.Auth;
using CentralDatos.Api.Endpoints.Estaciones;
using CentralDatos.Api.Endpoints.Health;
using CentralDatos.Api.Endpoints.Informes;
using CentralDatos.Api.Extensions;
using CentralDatos.Application;
using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Domain.Entities.Audit;
using CentralDatos.Infrastructure;
using CentralDatos.Infrastructure.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Oracle.ManagedDataAccess.Client;
using Scalar.AspNetCore;
using Serilog;

// 1. Configuración de Serilog: Consola + Archivos .log rotativos diarios en logs/
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File(
        path: "logs/central-datos-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        fileSizeLimitBytes: 52_428_800, // 50 MB
        rollOnFileSizeLimit: true,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz}] [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    Log.Information("Iniciando aplicación Web Central Datos ITV (TÜV SÜD)...");

    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog();

    // Servicios del sistema y OpenAPI
    builder.Services.AddOpenApi();
    builder.Services.AddCorsPolicy(builder.Configuration);

    // Configuración de Autenticación JWT Bearer
    var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
    var secretKey = jwtSection.GetValue<string>("SecretKey") ?? "TuvSud_CentralDatos_SuperSecret_JwtKey_2026_KeyMustBeAtLeast32BytesLong!";
    var issuer = jwtSection.GetValue<string>("Issuer") ?? "TuvSud.CentralDatos.Api";
    var audience = jwtSection.GetValue<string>("Audience") ?? "TuvSud.CentralDatos.Web";

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = false;
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5)
            };
        });

    builder.Services.AddAuthorization();

    // Limitador de concurrencia para exportaciones pesadas a Excel (Configurable ad-hoc desde appsettings.json)
    var excelRateLimit = builder.Configuration.GetSection("RateLimiting:ExcelExport");
    var permitLimit = excelRateLimit.GetValue<int?>("PermitLimit") ?? 20;
    var queueLimit = excelRateLimit.GetValue<int?>("QueueLimit") ?? 50;

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddConcurrencyLimiter("excel-export-policy", opt =>
        {
            opt.PermitLimit = permitLimit;
            opt.QueueLimit = queueLimit;
            opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        });
    });

    // Inyección de dependencias Clean Architecture con IConfiguration
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddSingleton<LocalizacionExportJobQueue>();
    builder.Services.AddHostedService(provider => provider.GetRequiredService<LocalizacionExportJobQueue>());

    var app = builder.Build();

    // Manejo global de excepciones seguras (Protección contra Information Disclosure / CWE-209 en Pentests)
    app.UseExceptionHandler(exceptionHandlerApp =>
    {
        exceptionHandlerApp.Run(async context =>
        {
            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalSecurityExceptionHandler");
            var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
            var ex = exceptionFeature?.Error;

            // Extraer identidad del usuario autenticado (si existe token JWT en la petición)
            var user = context.User;
            int? idEmpleado = int.TryParse(user?.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedId) ? parsedId : null;
            var username = user?.FindFirstValue(ClaimTypes.Name) ?? "ANÓNIMO";
            var role = user?.FindFirstValue(ClaimTypes.Role) ?? "Sistema";
            var ip = context.Connection.RemoteIpAddress?.ToString();
            var userAgent = context.Request.Headers.UserAgent.ToString();
            var path = context.Request.Path.Value ?? "/";

            // 1. Caso A: Cancelación de petición por cliente (AbortController, cambio rápido de filtro, F5 o ORA-01013)
            bool isClientCancellation = ex is OperationCanceledException ||
                                        context.RequestAborted.IsCancellationRequested ||
                                        (ex is OracleException oraCancel && (oraCancel.Number == 1013 || oraCancel.Number == 12570) && context.RequestAborted.IsCancellationRequested);

            if (isClientCancellation)
            {
                logger.LogInformation(
                    "Solicitud cancelada por el cliente [HTTP 499] | Usuario: '{Username}' | Ruta: {Path}",
                    username,
                    path);

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = 499; // Client Closed Request
                }
                return;
            }

            // 2. Caso B: Excepción no controlada real (HTTP 500)
            if (ex != null)
            {
                // El error técnico completo (stack trace, ORA errors) se escribe enriquecido en el archivo .log del servidor
                logger.LogError(
                    ex,
                    "Excepción no controlada [HTTP 500] | Usuario: '{Username}' (ID: {IdEmpleado}, Rol: {Role}) | IP: {Ip} | Método: {Method} | Ruta: {Path}",
                    username,
                    idEmpleado?.ToString() ?? "-",
                    role,
                    ip ?? "-",
                    context.Request.Method,
                    path);

                // Registrar también en CENTRALITV.LOG_AUDITORIA_WEB si el error NO es una caída de conexión/listener de Oracle
                // (evitando dependencia circular cuando la propia BBDD está inaccesible)
                bool isOracleConnectionDown = ex is OracleException oraEx &&
                                              oraEx.Number is 12170 or 12541 or 12514 or 12571 or 3113 or 3114 or 1033 or 1034;

                if (!isOracleConnectionDown)
                {
                    try
                    {
                        var auditRepo = context.RequestServices.GetService<IAuditRepository>();
                        if (auditRepo != null)
                        {
                            var errorSummary = $"{ex.GetType().Name}: {ex.Message}";
                            if (errorSummary.Length > 480) errorSummary = errorSummary[..480] + "...";

                            await auditRepo.LogActivityAsync(new AuditLogEntry
                            {
                                IdEmpleado = idEmpleado,
                                Username = username,
                                Role = role,
                                Action = "ERROR_SISTEMA",
                                MenuRoute = path,
                                IpAddress = ip,
                                UserAgent = userAgent,
                                Details = errorSummary
                            }, CancellationToken.None);
                        }
                    }
                    catch
                    {
                        // Fail-safe: nunca bloquear la respuesta de error si falla la escritura en tabla de auditoría
                    }
                }
            }

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "application/json";

                // Al cliente/pentester solo le llega un mensaje genérico sin datos internos del sistema (CWE-209)
                await context.Response.WriteAsJsonAsync(new
                {
                    success = false,
                    errorMessage = "No ha sido posible procesar la solicitud en el servidor. Por favor, contacte con el soporte técnico si la incidencia persiste."
                });
            }
        });
    });

    // OpenAPI y Swagger UI habilitados para desarrollo y pruebas IIS
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("openapi/v1.json", "TÜV SÜD Central Datos API v1");
        options.RoutePrefix = "swagger";
    });
    app.MapScalarApiReference();

    // Habilitar CORS siempre
    app.UseCors(CorsExtensions.PolicyName);

    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }

    app.UseAuthentication();
    app.UseAuthorization();
    app.UseRateLimiter();

    // Endpoint raíz informativo y redirección relativa a swagger
    if (app.Environment.IsDevelopment())
    {
        app.MapGet("/", () => Results.Redirect("http://localhost:5173"));
    }
    else
    {
        app.MapGet("/", () => Results.Redirect("swagger"));
    }

    // Registro modular de Endpoints desacoplados por características
    app.MapHealthEndpoints();
    app.MapEstacionesEndpoints();
    app.MapAuthEndpoints();
    app.MapInformesEndpoints();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "La aplicación terminó inesperadamente.");
}
finally
{
    Log.CloseAndFlush();
}
