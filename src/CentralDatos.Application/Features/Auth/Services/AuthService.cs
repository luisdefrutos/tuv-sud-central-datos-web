using System.Security.Cryptography;
using System.Text;
using CentralDatos.Application.Features.Auth.DTOs;
using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Domain.Entities.Audit;
using CentralDatos.Domain.Entities.Auth;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Auth.Services;

public sealed class AuthService : IAuthService
{
    private readonly IAuthRepository _authRepo;
    private readonly IAuditRepository _auditRepo;
    private readonly ISoapLoginClient _soapLoginClient;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IAuthRepository authRepo,
        IAuditRepository auditRepo,
        ISoapLoginClient soapLoginClient,
        IJwtTokenGenerator jwtTokenGenerator,
        ILogger<AuthService> logger)
    {
        _authRepo = authRepo;
        _auditRepo = auditRepo;
        _soapLoginClient = soapLoginClient;
        _jwtTokenGenerator = jwtTokenGenerator;
        _logger = logger;
    }

    /// <summary>
    /// Flujo principal de autenticación: orquesta la validación, resolución de proveedor y emisión de sesión.
    /// </summary>
    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request, string? clientIp, string? userAgent, CancellationToken cancellationToken = default)
    {
        var validationError = ValidarPeticionInicial(request);
        if (validationError != null) return validationError;

        var username = request.Username.Trim();
        var rawPassword = request.Password?.Trim() ?? string.Empty;

        try
        {
            var (user, errorMessage) = await ResolverAutenticacionAsync(username, rawPassword, request.IsSso, cancellationToken);
            if (errorMessage != null || user == null)
            {
                return new LoginResponseDto(false, null, null, errorMessage ?? "Credenciales no válidas o acceso no autorizado.");
            }

            return await RegistrarSesionExitosaAsync(user, clientIp, userAgent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado durante la autenticación de '{Username}'", username);
            return new LoginResponseDto(false, null, null, "Error en el servidor al procesar la autenticación. Consulte con el soporte de sistemas.");
        }
    }

    public async Task LogoutAsync(long? accessLogId, CancellationToken cancellationToken = default)
    {
        if (accessLogId.HasValue && accessLogId.Value > 0)
        {
            await _authRepo.LogAccessEndAsync(accessLogId.Value, cancellationToken);
        }
    }

    public async Task LogAuditAsync(int? idEmpleado, string username, string role, AuditLogRequestDto request, string? clientIp, string? userAgent, CancellationToken cancellationToken = default)
    {
        await _auditRepo.LogActivityAsync(new AuditLogEntry
        {
            IdEmpleado = idEmpleado,
            Username = username,
            Role = role,
            Action = request.Action,
            MenuRoute = request.MenuRoute,
            CodEstacion = request.CodEstacion,
            DurationMs = request.DurationMs,
            Details = request.Details,
            IpAddress = clientIp,
            UserAgent = userAgent
        }, cancellationToken);
    }

    // =========================================================================
    // Métodos Privados de Validación y Casuísticas de Autenticación
    // =========================================================================

    private static LoginResponseDto? ValidarPeticionInicial(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return new LoginResponseDto(false, null, null, "Debe introducir un usuario para conectarse a la aplicación.");
        }

        if (!request.IsSso && string.IsNullOrEmpty(request.Password?.Trim()))
        {
            return new LoginResponseDto(false, null, null, "Debe introducir la contraseña.");
        }

        return null;
    }

    private async Task<(AuthenticatedUser? User, string? ErrorMessage)> ResolverAutenticacionAsync(
        string username, string rawPassword, bool isSso, CancellationToken ct)
    {
        // 1. Caso: Suplantación de identidad por Supervisor (ej. "SUPERVISOR:USUARIO")
        if (username.Contains(':'))
        {
            return await AutenticarSuplantacionAsync(username, rawPassword, ct);
        }

        // 2. Caso: Cuenta Técnica Maestra SUPERVISOR
        if (username.Equals("SUPERVISOR", StringComparison.OrdinalIgnoreCase))
        {
            return await AutenticarSupervisorAsync(username, rawPassword, ct);
        }

        // 3. Caso: Single Sign-On (Windows SSO)
        if (isSso)
        {
            return await AutenticarWindowsSsoAsync(username, ct);
        }

        // 4. Caso: Usuario Propio / Empleado Interno de Planta (DNI, 0001, etc.)
        var internalUser = await AutenticarUsuarioInternoAsync(username, rawPassword, ct);
        if (internalUser != null)
        {
            return (internalUser, null);
        }

        // 5. Caso: Directorio Activo Microsoft (AD) vía WebService + Fallback Legacy
        return await AutenticarDirectorioActivoAsync(username, rawPassword, ct);
    }

    private async Task<(AuthenticatedUser? User, string? ErrorMessage)> AutenticarSuplantacionAsync(
        string compoundUser, string rawPassword, CancellationToken ct)
    {
        var parts = compoundUser.Split(':');
        if (parts.Length != 2)
        {
            return (null, "Formato de suplantación no válido. Utilice SUPERVISOR:USUARIO.");
        }

        var supervisorUser = parts[0].Trim();
        var targetUser = parts[1].Trim();

        var creds = await _authRepo.GetSupervisorCredentialsAsync(ct);
        if (creds == null ||
            HashSha256(supervisorUser.ToUpperInvariant()) != creds.Value.HashSupervisor ||
            HashSha256(rawPassword.ToUpperInvariant()) != creds.Value.ClaveSupervisor)
        {
            _logger.LogWarning("SUPLANTACIÓN RECHAZADA: Credenciales de supervisor incorrectas para '{Supervisor}'.", supervisorUser);
            return (null, "Credenciales no válidas o acceso no autorizado.");
        }

        var targetEmployee = await _authRepo.FindEmployeeByUsernameAsync(targetUser, ct);
        if (targetEmployee == null)
        {
            _logger.LogWarning("SUPLANTACIÓN FALLIDA: El usuario suplantado '{Target}' no existe.", targetUser);
            return (null, "Credenciales no válidas o acceso no autorizado.");
        }

        _logger.LogWarning("SUPLANTACIÓN ACTIVA: El supervisor '{Supervisor}' ha iniciado sesión como '{Target}'", supervisorUser, targetUser);

        return (new AuthenticatedUser
        {
            IdEmpleado = targetEmployee.IdEmpleado,
            IdPersonaComun = targetEmployee.IdPersonaComun,
            Username = targetEmployee.Username,
            FullName = $"{targetEmployee.FullName} (Suplantado)",
            Email = targetEmployee.Email,
            Role = targetEmployee.Role,
            IsSupervisor = targetEmployee.IsSupervisor,
            Provider = AuthProviderType.Impersonation,
            AllowedStations = targetEmployee.AllowedStations
        }, null);
    }

    private async Task<(AuthenticatedUser? User, string? ErrorMessage)> AutenticarSupervisorAsync(
        string username, string rawPassword, CancellationToken ct)
    {
        var creds = await _authRepo.GetSupervisorCredentialsAsync(ct);
        if (creds == null)
        {
            _logger.LogError("No se pudieron obtener las credenciales maestras de SUPERVISOR desde la base de datos.");
            return (null, "Servicio de autenticación no disponible temporalmente. Contacte con soporte técnico.");
        }

        var userHash = HashSha256(username.ToUpperInvariant());
        var passHash = HashSha256(rawPassword.ToUpperInvariant());

        if (userHash != creds.Value.HashSupervisor || passHash != creds.Value.ClaveSupervisor)
        {
            _logger.LogWarning("Acceso SUPERVISOR denegado: contraseña no coincide.");
            return (null, "Credenciales no válidas o acceso no autorizado.");
        }

        var allStations = await _authRepo.GetAllowedStationsAsync(0, isSupervisor: true, ct);
        return (new AuthenticatedUser
        {
            IdEmpleado = 0,
            IdPersonaComun = 0,
            Username = "SUPERVISOR",
            FullName = "SUPERVISOR DEL SISTEMA",
            Email = "soporte@tuvsud.com",
            Role = UserRole.Supervisor,
            IsSupervisor = true,
            Provider = AuthProviderType.SystemSupervisor,
            AllowedStations = allStations
        }, null);
    }

    private async Task<(AuthenticatedUser? User, string? ErrorMessage)> AutenticarWindowsSsoAsync(
        string username, CancellationToken ct)
    {
        var emp = await _authRepo.FindEmployeeByUsernameAsync(username, ct);
        if (emp == null)
        {
            _logger.LogWarning("SSO Fallido: El usuario de Windows '{Username}' no existe en Central ITV.", username);
            return (null, "Usuario no autorizado o sin permisos de acceso a Central ITV.");
        }

        return (emp with { Provider = AuthProviderType.WindowsSso }, null);
    }

    private async Task<AuthenticatedUser?> AutenticarUsuarioInternoAsync(
        string username, string rawPassword, CancellationToken ct)
    {
        var internalEmp = await _authRepo.FindEmployeeByUsernameAsync(username, ct);
        if (internalEmp != null)
        {
            var passSha256 = HashSha256(rawPassword);
            var passValid = await _authRepo.VerifyInternalPasswordAsync(internalEmp.IdEmpleado, passSha256, ct);
            if (passValid)
            {
                return internalEmp with { Provider = AuthProviderType.InternalUser };
            }
        }

        return null;
    }

    private async Task<(AuthenticatedUser? User, string? ErrorMessage)> AutenticarDirectorioActivoAsync(
        string username, string rawPassword, CancellationToken ct)
    {
        var (ldapOk, ldapMsg) = await _soapLoginClient.ValidateLdapAsync(username, rawPassword, ct);
        if (ldapOk)
        {
            var adEmp = await _authRepo.FindEmployeeByUsernameAsync(username, ct);
            if (adEmp != null)
            {
                return (adEmp with { Provider = AuthProviderType.ActiveDirectory }, null);
            }

            _logger.LogWarning("AD Válido pero sin cuenta ITV: '{Username}' no está dado de alta en empleados.", username);
            return (null, "Credenciales no válidas o cuenta sin permisos en Central ITV.");
        }

        // Fallback: Si no es usuario AD, comprobar si es usuario histórico en ITV.SYS_USUARIO
        var legacyUser = await _authRepo.ValidateLegacyUserAsync(username, rawPassword, ct);
        if (legacyUser != null)
        {
            return (legacyUser, null);
        }

        _logger.LogWarning("Autenticación fallida para '{Username}'. Detalle LDAP: {LdapMsg}", username, ldapMsg);
        return (null, "Credenciales no válidas o acceso no autorizado.");
    }

    private async Task<LoginResponseDto> RegistrarSesionExitosaAsync(
        AuthenticatedUser user, string? clientIp, string? userAgent, CancellationToken ct)
    {
        await _authRepo.LogAccessStartAsync(user.Username, clientIp ?? "DESCONOCIDO", ct);
        await _auditRepo.LogActivityAsync(new AuditLogEntry
        {
            IdEmpleado = user.IdEmpleado,
            Username = user.Username,
            Role = user.Role.ToString(),
            Action = "LOGIN",
            MenuRoute = "/login",
            IpAddress = clientIp,
            UserAgent = userAgent,
            Details = $"Autenticación satisfactoria mediante {user.Provider}"
        }, ct);

        var token = _jwtTokenGenerator.GenerateToken(user);
        var userDto = new CurrentUserDto(
            user.IdEmpleado,
            user.Username,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.IsSupervisor,
            user.AllowedStations
        );

        return new LoginResponseDto(true, token, userDto, null);
    }

    private static string HashSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }
}
