using CentralDatos.Application.Features.Auth.DTOs;
using CentralDatos.Domain.Entities.Auth;

namespace CentralDatos.Application.Features.Auth.Interfaces;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request, string? clientIp, string? userAgent, CancellationToken cancellationToken = default);
    Task LogoutAsync(long? accessLogId, CancellationToken cancellationToken = default);
    Task LogAuditAsync(int? idEmpleado, string username, string role, AuditLogRequestDto request, string? clientIp, string? userAgent, CancellationToken cancellationToken = default);
}

public interface IJwtTokenGenerator
{
    string GenerateToken(AuthenticatedUser user);
}

