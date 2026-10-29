namespace CentralDatos.Application.Features.Auth.DTOs;

public sealed record LoginRequestDto(
    string Username,
    string? Password,
    bool IsSso = false
);

public sealed record LoginResponseDto(
    bool Success,
    string? Token,
    CurrentUserDto? User,
    string? ErrorMessage
);

public sealed record CurrentUserDto(
    int IdEmpleado,
    string Username,
    string FullName,
    string? Email,
    string Role,
    bool IsSupervisor,
    IReadOnlyList<string> AllowedStations
);

public sealed record AuditLogRequestDto(
    string Action,
    string? MenuRoute,
    string? CodEstacion,
    long? DurationMs,
    string? Details
);

