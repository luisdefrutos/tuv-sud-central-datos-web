using System.Security.Claims;
using System.Security.Principal;
using CentralDatos.Application.Features.Auth.DTOs;
using CentralDatos.Application.Features.Auth.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;

namespace CentralDatos.Api.Endpoints.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth")
                       .WithTags("Autenticación y Sesión");

        // 1. Login Normal (Anónimo — Nunca solicita credenciales de Windows al navegador)
        group.MapPost("/login", async (
            [FromBody] LoginRequestDto request,
            [FromServices] IAuthService authService,
            [FromServices] IHostEnvironment env,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();

            // Si alguien llama a /login normal con IsSso=true, solo miramos si ya viene autenticado (sin lanzar Challenge)
            var winIdentity = await ResolveVerifiedWindowsUserAsync(httpContext, env);
            var verifiedWinUser = winIdentity.IsAuthenticated ? winIdentity.Username : null;

            var result = await authService.LoginAsync(request, ip, userAgent, verifiedWinUser, cancellationToken);
            return result.Success
                ? Results.Ok(result)
                : Results.BadRequest(result);
        })
        .WithName("Login")
        .WithSummary("Inicia sesión mediante Active Directory corporativo, usuario propio o clave de sistema");

        // 2. Login SSO Windows Bajo Demanda (Solo negocia Kerberos/NTLM cuando el usuario marca el check y pulsa Iniciar Sesión)
        group.MapPost("/sso-login", async (
            [FromBody] LoginRequestDto request,
            [FromServices] IAuthService authService,
            [FromServices] IHostEnvironment env,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var winIdentity = await ResolveVerifiedWindowsUserAsync(httpContext, env);

            // Si la petición aún es anónima en IIS, devolvemos Challenge("Windows") (HTTP 401 WWW-Authenticate: Negotiate, NTLM)
            // para que el navegador envíe automáticamente el ticket Kerberos/NTLM de la sesión de Windows activa en el PC.
            if (!winIdentity.IsAuthenticated || string.IsNullOrWhiteSpace(winIdentity.Username))
            {
                try
                {
                    return Results.Challenge(
                        properties: null,
                        authenticationSchemes: new[] { "Windows" });
                }
                catch
                {
                    // Si no corre bajo IIS con Windows Auth habilitado, informar limpiamente
                    return Results.BadRequest(new LoginResponseDto(
                        false,
                        null,
                        null,
                        "No se ha podido verificar la sesión de Windows en el servidor. Desmarque la casilla SSO e introduzca su contraseña."));
                }
            }

            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();

            var ssoRequest = request with { IsSso = true };
            var result = await authService.LoginAsync(ssoRequest, ip, userAgent, winIdentity.Username, cancellationToken);
            return result.Success
                ? Results.Ok(result)
                : Results.BadRequest(result);
        })
        .WithName("SsoLogin")
        .WithSummary("Inicia sesión mediante Single Sign-On de Windows validando que el usuario coincida con la sesión activa del PC");

        group.MapPost("/logout", async (
            [FromQuery] long? accessLogId,
            [FromServices] IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            await authService.LogoutAsync(accessLogId, cancellationToken);
            return Results.Ok(new { message = "Sesión cerrada correctamente" });
        })
        .WithName("Logout")
        .WithSummary("Cierra la sesión y actualiza el timestamp de finalización en auditoría");

        group.MapGet("/me", (ClaimsPrincipal user) =>
        {
            if (user.Identity?.IsAuthenticated != true)
            {
                return Results.Unauthorized();
            }

            var idEmpleadoStr = user.FindFirstValue(ClaimTypes.NameIdentifier);
            _ = int.TryParse(idEmpleadoStr, out var idEmpleado);
            var username = user.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
            var fullName = user.FindFirstValue(ClaimTypes.GivenName) ?? username;
            var email = user.FindFirstValue(ClaimTypes.Email);
            var role = user.FindFirstValue(ClaimTypes.Role) ?? "Operador";
            var isSupervisor = user.FindFirstValue("is_supervisor") == "true";

            var stationsJson = user.FindFirstValue("stations");
            var stations = !string.IsNullOrEmpty(stationsJson)
                ? System.Text.Json.JsonSerializer.Deserialize<IReadOnlyList<string>>(stationsJson) ?? Array.Empty<string>()
                : Array.Empty<string>();

            return Results.Ok(new CurrentUserDto(
                idEmpleado,
                username,
                fullName,
                email,
                role,
                isSupervisor,
                stations
            ));
        })
        .RequireAuthorization()
        .WithName("GetCurrentUser")
        .WithSummary("Obtiene la información del usuario autenticado actual desde el token JWT");

        group.MapPost("/audit", async (
            [FromBody] AuditLogRequestDto request,
            [FromServices] IAuthService authService,
            ClaimsPrincipal user,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            int? idEmpleado = null;
            if (int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedId))
            {
                idEmpleado = parsedId;
            }

            var username = user.FindFirstValue(ClaimTypes.Name) ?? "ANÓNIMO";
            var role = user.FindFirstValue(ClaimTypes.Role) ?? "Público";
            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();

            await authService.LogAuditAsync(idEmpleado, username, role, request, ip, userAgent, cancellationToken);
            return Results.Ok(new { logged = true });
        })
        .WithName("LogAuditActivity")
        .WithSummary("Registra una acción o navegación de menú en la auditoría del sistema");

        group.MapPost("/audit/batch", async (
            [FromBody] IReadOnlyList<AuditLogRequestDto> requests,
            [FromServices] IAuthService authService,
            ClaimsPrincipal user,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            if (requests == null || requests.Count == 0)
            {
                return Results.Ok(new { processed = 0 });
            }

            int? idEmpleado = null;
            if (int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedId))
            {
                idEmpleado = parsedId;
            }

            var username = user.FindFirstValue(ClaimTypes.Name) ?? "ANÓNIMO";
            var role = user.FindFirstValue(ClaimTypes.Role) ?? "Público";
            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();

            foreach (var req in requests)
            {
                await authService.LogAuditAsync(idEmpleado, username, role, req, ip, userAgent, cancellationToken);
            }

            return Results.Ok(new { processed = requests.Count });
        })
        .WithName("LogAuditBatch")
        .WithSummary("Registra en lote múltiples acciones acumuladas en modo offline");

        return app;
    }

    private static async Task<WindowsIdentityDto> ResolveVerifiedWindowsUserAsync(HttpContext httpContext, IHostEnvironment env)
    {
        // 1. Intentar autenticar explícitamente contra el esquema IISServer ("Windows") si IIS ya adjuntó el token Windows
        try
        {
            var winAuthResult = await httpContext.AuthenticateAsync("Windows");
            if (winAuthResult.Succeeded && winAuthResult.Principal?.Identity is { IsAuthenticated: true } winPrincipal && !string.IsNullOrWhiteSpace(winPrincipal.Name))
            {
                return ParseDomainAndUser(winPrincipal.Name);
            }
        }
        catch
        {
            // Ignorar si el esquema "Windows" no está registrado fuera de IIS
        }

        // 2. Comprobar identidad Windows autenticada directamente en HttpContext.User (Negotiate / NTLM / Kerberos)
        var identity = httpContext.User.Identity;
        if (identity is { IsAuthenticated: true } && !string.IsNullOrWhiteSpace(identity.Name))
        {
            var authType = identity.AuthenticationType ?? string.Empty;
            if (identity is WindowsIdentity ||
                authType.Contains("Windows", StringComparison.OrdinalIgnoreCase) ||
                authType.Contains("Negotiate", StringComparison.OrdinalIgnoreCase) ||
                authType.Contains("NTLM", StringComparison.OrdinalIgnoreCase) ||
                authType.Contains("Kerberos", StringComparison.OrdinalIgnoreCase) ||
                identity.Name.Contains('\\'))
            {
                return ParseDomainAndUser(identity.Name);
            }
        }

        // 3. Comprobar variables de servidor IIS (LOGON_USER / AUTH_USER)
        var logonUser = httpContext.GetServerVariable("LOGON_USER") ??
                        httpContext.GetServerVariable("AUTH_USER") ??
                        httpContext.Request.Headers["X-IIS-WindowsAuthUser"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(logonUser))
        {
            return ParseDomainAndUser(logonUser);
        }

        // 4. Si estamos ejecutando en localhost en la propia máquina del desarrollador y está en dominio corporativo
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString();
        bool isLocalhost = remoteIp is "127.0.0.1" or "::1" || httpContext.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
        if (env.IsDevelopment() && isLocalhost)
        {
            var envDomain = Environment.UserDomainName;
            var envUser = Environment.UserName;
            if (!string.IsNullOrWhiteSpace(envUser) &&
                !envUser.Equals("Usuario", StringComparison.OrdinalIgnoreCase) &&
                !envUser.Equals("Administrator", StringComparison.OrdinalIgnoreCase) &&
                !envUser.Equals("Administrador", StringComparison.OrdinalIgnoreCase) &&
                !envDomain.Equals("IIS APPPOOL", StringComparison.OrdinalIgnoreCase) &&
                !envDomain.Equals("NT AUTHORITY", StringComparison.OrdinalIgnoreCase))
            {
                return new WindowsIdentityDto(true, envUser.ToUpperInvariant(), envDomain.ToUpperInvariant());
            }
        }

        return new WindowsIdentityDto(false, null, null);
    }

    private static WindowsIdentityDto ParseDomainAndUser(string rawIdentity)
    {
        var trimmed = rawIdentity.Trim();
        if (trimmed.Contains('\\'))
        {
            var parts = trimmed.Split('\\', 2);
            return new WindowsIdentityDto(true, parts[1].Trim().ToUpperInvariant(), parts[0].Trim().ToUpperInvariant());
        }
        if (trimmed.Contains('@'))
        {
            var parts = trimmed.Split('@', 2);
            return new WindowsIdentityDto(true, parts[0].Trim().ToUpperInvariant(), parts[1].Trim().ToUpperInvariant());
        }
        return new WindowsIdentityDto(true, trimmed.ToUpperInvariant(), null);
    }
}
