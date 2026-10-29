namespace CentralDatos.Domain.Entities.Auth;

/// <summary>
/// Roles de usuario en Central Datos Web.
/// </summary>
public enum UserRole
{
    /// <summary>
    /// Operador o inspector ordinario de estación.
    /// </summary>
    Operador = 1,

    /// <summary>
    /// Responsable de zona o de estación con capacidad de delegar permisos.
    /// </summary>
    Responsable = 2,

    /// <summary>
    /// Supervisor global con acceso irrestricto a todas las estaciones y módulos.
    /// </summary>
    Supervisor = 3
}

/// <summary>
/// Tipo de origen de la credencial de autenticación.
/// </summary>
public enum AuthProviderType
{
    ActiveDirectory = 1,
    InternalUser = 2,
    SystemSupervisor = 3,
    WindowsSso = 4,
    Impersonation = 5
}

/// <summary>
/// Modelo de dominio que representa a un usuario autenticado en la sesión actual.
/// </summary>
public sealed record AuthenticatedUser
{
    public int IdEmpleado { get; init; }
    public int? IdPersonaComun { get; init; }
    public required string Username { get; init; }
    public required string FullName { get; init; }
    public string? Email { get; init; }
    public UserRole Role { get; init; }
    public bool IsSupervisor { get; init; }
    public AuthProviderType Provider { get; init; }
    public IReadOnlyList<string> AllowedStations { get; init; } = Array.Empty<string>();
    public DateTime AuthenticatedAtUtc { get; init; } = DateTime.UtcNow;
}
