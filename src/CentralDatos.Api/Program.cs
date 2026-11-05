using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using System.Text;
using CentralDatos.Api.Endpoints.Auth;
using CentralDatos.Api.Endpoints.Estaciones;
using CentralDatos.Api.Endpoints.Health;
using CentralDatos.Api.Endpoints.Informes;
using CentralDatos.Api.Extensions;
using CentralDatos.Application;
using CentralDatos.Infrastructure;
using CentralDatos.Infrastructure.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
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

    var app = builder.Build();

    // Manejo global de excepciones seguras (Protección contra Information Disclosure / CWE-209 en Pentests)
    app.UseExceptionHandler(exceptionHandlerApp =>
    {
        exceptionHandlerApp.Run(async context =>
        {
            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalSecurityExceptionHandler");
            var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();

            if (exceptionFeature?.Error != null)
            {
                // El error técnico completo (stack trace, ORA errors) se escribe SOLO en el archivo .log del servidor
                logger.LogError(exceptionFeature.Error, "Excepción no controlada en la ruta {Path}", context.Request.Path);
            }

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            // Al cliente/pentester solo le llega un mensaje genérico sin datos del sistema
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                errorMessage = "No ha sido posible procesar la solicitud en el servidor. Por favor, contacte con el soporte técnico si la incidencia persiste."
            });
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
