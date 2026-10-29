using System.Data;
using System.Security.Cryptography;
using System.Text;
using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Domain.Constants;
using CentralDatos.Domain.Entities.Auth;
using CentralDatos.Infrastructure.Configuration;
using Dapper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed class OracleAuthRepository : IAuthRepository
{
    private readonly CentralItvOptions _options;
    private readonly ILogger<OracleAuthRepository> _logger;

    public OracleAuthRepository(IOptions<CentralItvOptions> options, ILogger<OracleAuthRepository> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    private IDbConnection CreateConnection() => new OracleConnection(_options.ConnectionString);

    public async Task<(string HashSupervisor, string ClaveSupervisor)?> GetSupervisorCredentialsAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Clave_Supervisor AS ClaveSupervisor, Hash_Supervisor AS HashSupervisor
            FROM CENTRALITV.SYS_CONFIGURACION
            WHERE ROWNUM = 1
            """;

        try
        {
            using var conn = CreateConnection();
            var row = await conn.QueryFirstOrDefaultAsync<(string ClaveSupervisor, string HashSupervisor)>(
                new CommandDefinition(sql, cancellationToken: cancellationToken));

            if (!string.IsNullOrEmpty(row.HashSupervisor) && !string.IsNullOrEmpty(row.ClaveSupervisor))
            {
                return (row.HashSupervisor.Trim().ToLowerInvariant(), row.ClaveSupervisor.Trim().ToLowerInvariant());
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener las claves de supervisor de CENTRALITV.SYS_CONFIGURACION");
            return null;
        }
    }

    public async Task<AuthenticatedUser?> FindEmployeeByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT 
                e.Id_Empleado AS IdEmpleado,
                e.Id_Persona_Comun AS IdPersonaComun,
                NVL(e.Usuario_Login_AD, e.Usuario_Login_Interno) AS Username,
                TRIM(e.Nombre || ' ' || e.Apellidos) AS FullName,
                e.Email,
                NVL(e.Es_Supervisor, 0) AS EsSupervisor,
                e.De_Baja AS DeBaja
            FROM CENTRALITV.EMPLEADO e
            WHERE (UPPER(e.Usuario_Login_AD) = UPPER(:username) 
               OR UPPER(e.Usuario_Login_Interno) = UPPER(:username))
              AND e.De_Baja = 0
              AND ROWNUM = 1
            """;

        try
        {
            using var conn = CreateConnection();
            var emp = await conn.QueryFirstOrDefaultAsync<EmployeeRow>(
                new CommandDefinition(sql, new { username = username.Trim() }, cancellationToken: cancellationToken));

            if (emp == null) return null;

            var isSupervisor = emp.EsSupervisor == -1;
            var role = isSupervisor ? UserRole.Supervisor : UserRole.Operador;

            // Si no es supervisor directo por flag, verificar si tiene permisos de supervisión o gestión
            if (!isSupervisor)
            {
                const string permSql = """
                    SELECT COUNT(*) 
                    FROM CENTRALITV.EMPLEADO_PERMISOS 
                    WHERE Id_Empleado = :idEmpleado 
                      AND Activo = -1 
                      AND CodPermiso IN ('SUPERVISOR_PERMISOS', 'CENTRAL_GENERAL')
                    """;

                var count = await conn.ExecuteScalarAsync<int>(
                    new CommandDefinition(permSql, new { idEmpleado = emp.IdEmpleado }, cancellationToken: cancellationToken));

                if (count > 0)
                {
                    role = UserRole.Responsable;
                }
            }

            var stations = await GetAllowedStationsInternalAsync(conn, emp.IdEmpleado, isSupervisor, cancellationToken);

            return new AuthenticatedUser
            {
                IdEmpleado = emp.IdEmpleado,
                IdPersonaComun = emp.IdPersonaComun,
                Username = emp.Username,
                FullName = emp.FullName,
                Email = emp.Email,
                Role = role,
                IsSupervisor = isSupervisor,
                Provider = AuthProviderType.ActiveDirectory,
                AllowedStations = stations
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al buscar empleado por usuario '{Username}'", username);
            return null;
        }
    }

    public async Task<bool> VerifyInternalPasswordAsync(int idEmpleado, string sha256Password, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(*) 
            FROM CENTRALITV.EMPLEADO 
            WHERE Id_Empleado = :idEmpleado 
              AND LOWER(Pass_Interno) = :sha256Password 
              AND De_Baja = 0 
              AND NVL(Usuario_Bloqueado, 0) = 0
            """;

        try
        {
            using var conn = CreateConnection();
            var count = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(sql, new { idEmpleado, sha256Password = sha256Password.ToLowerInvariant() }, cancellationToken: cancellationToken));

            return count > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al verificar contraseña interna para el empleado {IdEmpleado}", idEmpleado);
            return false;
        }
    }

    public async Task<AuthenticatedUser?> ValidateLegacyUserAsync(string username, string rawPassword, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Cod_Usuario AS CodUsuario, Password, Pass_Encriptada AS PassEncriptada
            FROM ITV.SYS_USUARIO
            WHERE UPPER(Cod_Usuario) = UPPER(:username)
              AND ROWNUM = 1
            """;

        try
        {
            using var conn = CreateConnection();
            var row = await conn.QueryFirstOrDefaultAsync<LegacyUserRow>(
                new CommandDefinition(sql, new { username = username.Trim() }, cancellationToken: cancellationToken));

            if (row == null) return null;

            var matchPlain = string.Equals(row.Password?.Trim(), rawPassword.Trim(), StringComparison.OrdinalIgnoreCase);
            var matchMd5 = !string.IsNullOrEmpty(row.PassEncriptada) &&
                           string.Equals(row.PassEncriptada.Trim(), ComputeMd5(rawPassword), StringComparison.OrdinalIgnoreCase);

            if (!matchPlain && !matchMd5) return null;

            var stations = await GetAllowedStationsInternalAsync(conn, 0, isSupervisor: false, cancellationToken);

            return new AuthenticatedUser
            {
                IdEmpleado = 0,
                Username = row.CodUsuario,
                FullName = $"Usuario Local {row.CodUsuario}",
                Role = UserRole.Operador,
                IsSupervisor = false,
                Provider = AuthProviderType.InternalUser,
                AllowedStations = stations
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al validar usuario legado en ITV.SYS_USUARIO");
            return null;
        }
    }

    public async Task<IReadOnlyList<string>> GetAllowedStationsAsync(int idEmpleado, bool isSupervisor, CancellationToken cancellationToken = default)
    {
        using var conn = CreateConnection();
        return await GetAllowedStationsInternalAsync(conn, idEmpleado, isSupervisor, cancellationToken);
    }

    private static async Task<IReadOnlyList<string>> GetAllowedStationsInternalAsync(IDbConnection conn, int idEmpleado, bool isSupervisor, CancellationToken cancellationToken)
    {
        if (isSupervisor || idEmpleado == 0)
        {
            const string sqlAll = """
                SELECT CodEstacion 
                FROM CENTRALITV.ESTACIONES 
                WHERE Central_Datos = -1 
                  AND Cod_Empresa IN ('01', '03')
                ORDER BY CodEstacion
                """;

            var all = await conn.QueryAsync<string>(new CommandDefinition(sqlAll, cancellationToken: cancellationToken));
            return all.ToList();
        }

        const string sqlUser = """
            SELECT DISTINCT CodEstacion 
            FROM CENTRALITV.EMPLEADO_CENTRO 
            WHERE Id_Empleado = :idEmpleado 
              AND De_Baja = 0
            ORDER BY CodEstacion
            """;

        var userStations = await conn.QueryAsync<string>(new CommandDefinition(sqlUser, new { idEmpleado }, cancellationToken: cancellationToken));
        var list = userStations.ToList();

        // Si no tiene centros específicos pero es operador válido, retornar lista de sus centros (o vacía si no tiene asignados)
        return list;
    }

    public async Task<long> LogAccessStartAsync(string username, string terminal, CancellationToken cancellationToken = default)
    {
        const string nextIdSql = "SELECT NVL(MAX(ID_ACCESO), 0) + 1 FROM CENTRALITV.LOG_ACCESOS_MODULOS";
        const string insertSql = """
            INSERT INTO CENTRALITV.LOG_ACCESOS_MODULOS (
                Id_Acceso, Modulo, Version_Modulo, FechaProceso_Inicio, Terminal, CodUsuario
            ) VALUES (
                :idAcceso, 'CENTRAL DATOS WEB', '2.05.0', SYSDATE, :terminal, :codUsuario
            )
            """;

        try
        {
            using var conn = CreateConnection();
            var nextId = await conn.ExecuteScalarAsync<long>(new CommandDefinition(nextIdSql, cancellationToken: cancellationToken));
            if (nextId <= 0) nextId = 1;

            var cleanTerminal = terminal.Length > 25 ? terminal[..25] : terminal;
            var cleanUser = username.Length > 50 ? username[..50] : username;

            await conn.ExecuteAsync(new CommandDefinition(insertSql, new
            {
                idAcceso = nextId,
                terminal = cleanTerminal,
                codUsuario = cleanUser
            }, cancellationToken: cancellationToken));

            return nextId;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo insertar en CENTRALITV.LOG_ACCESOS_MODULOS (continuando sin bloquear inicio de sesión)");
            return 0;
        }
    }

    public async Task LogAccessEndAsync(long idAcceso, CancellationToken cancellationToken = default)
    {
        const string updateSql = """
            UPDATE CENTRALITV.LOG_ACCESOS_MODULOS 
            SET FechaProceso_Fin = SYSDATE 
            WHERE Id_Acceso = :idAcceso
            """;

        try
        {
            using var conn = CreateConnection();
            await conn.ExecuteAsync(new CommandDefinition(updateSql, new { idAcceso }, cancellationToken: cancellationToken));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo actualizar FechaProceso_Fin en CENTRALITV.LOG_ACCESOS_MODULOS para Id_Acceso {IdAcceso}", idAcceso);
        }
    }

    private static string ComputeMd5(string input)
    {
        var bytes = MD5.HashData(Encoding.Default.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }

    private sealed class EmployeeRow
    {
        public int IdEmpleado { get; init; }
        public int? IdPersonaComun { get; init; }
        public string Username { get; init; } = string.Empty;
        public string FullName { get; init; } = string.Empty;
        public string? Email { get; init; }
        public int EsSupervisor { get; init; }
        public int DeBaja { get; init; }
    }

    private sealed class LegacyUserRow
    {
        public string CodUsuario { get; init; } = string.Empty;
        public string? Password { get; init; }
        public string? PassEncriptada { get; init; }
    }
}
