using CentralDatos.Domain.Entities.Audit;
using CentralDatos.Domain.Entities.Auth;

namespace CentralDatos.Application.Features.Auth.Interfaces;

public interface IAuthRepository
{
    /// <summary>
    /// Obtiene las claves hash del supervisor configuradas en SYS_CONFIGURACION.
    /// </summary>
    Task<(string HashSupervisor, string ClaveSupervisor)?> GetSupervisorCredentialsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Busca un empleado por coincidencia exacta de su Usuario_Login_AD o Usuario_Login_Interno.
    /// </summary>
    Task<AuthenticatedUser?> FindEmployeeByUsernameAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifica la contraseña interna (SHA-256) de un empleado interno en CENTRALITV.EMPLEADO.
    /// </summary>
    Task<bool> VerifyInternalPasswordAsync(int idEmpleado, string sha256Password, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifica credenciales en la tabla histórica ITV.SYS_USUARIO (para usuarios legados de planta).
    /// </summary>
    Task<AuthenticatedUser?> ValidateLegacyUserAsync(string username, string rawPassword, CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene la lista de estaciones asignadas a un empleado.
    /// </summary>
    Task<IReadOnlyList<string>> GetAllowedStationsAsync(int idEmpleado, bool isSupervisor, CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra el inicio de sesión en CENTRALITV.LOG_ACCESOS_MODULOS.
    /// </summary>
    Task<long> LogAccessStartAsync(string username, string terminal, CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra el fin de sesión en CENTRALITV.LOG_ACCESOS_MODULOS.
    /// </summary>
    Task LogAccessEndAsync(long idAcceso, CancellationToken cancellationToken = default);
}

public interface IAuditRepository
{
    Task LogActivityAsync(AuditLogEntry entry, CancellationToken cancellationToken = default);
}

