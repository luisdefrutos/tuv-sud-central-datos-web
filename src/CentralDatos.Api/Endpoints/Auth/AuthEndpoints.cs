using System.Security.Claims;
using CentralDatos.Application.Features.Auth.DTOs;
using CentralDatos.Application.Features.Auth.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CentralDatos.Api.Endpoints.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth")
                       .WithTags("Autenticación y Sesión");

        group.MapPost("/login", async (
            [FromBody] LoginRequestDto request,
            [FromServices] IAuthService authService,
            HttpContext httpContext,
            CancellationToken cancellationToken) =>
        {
            var ip = httpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = httpContext.Request.Headers.UserAgent.ToString();

            var result = await authService.LoginAsync(request, ip, userAgent, cancellationToken);
            return result.Success
                ? Results.Ok(result)
                : Results.BadRequest(result);
        })
        .WithName("Login")
        .WithSummary("Inicia sesión mediante Active Directory corporativo, usuario propio o clave de sistema");

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
}

