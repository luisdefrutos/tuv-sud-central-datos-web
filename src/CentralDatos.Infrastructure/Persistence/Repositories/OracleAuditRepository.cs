using System.Data;
using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Domain.Entities.Audit;
using CentralDatos.Infrastructure.Configuration;
using Dapper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed class OracleAuditRepository : IAuditRepository
{
    private readonly CentralItvOptions _options;
    private readonly ILogger<OracleAuditRepository> _logger;

    public OracleAuditRepository(IOptions<CentralItvOptions> options, ILogger<OracleAuditRepository> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    private IDbConnection? CreateConnection()
    {
        if (string.IsNullOrWhiteSpace(_options.ConnectionString)) return null;
        return new OracleConnection(_options.ConnectionString);
    }

    public async Task LogActivityAsync(AuditLogEntry entry, CancellationToken cancellationToken = default)
    {
        // 1. Registro en Log Estructurado
        _logger.LogInformation(
            "AUDITORÍA [{Action}] Usuario: '{Username}' (Rol: {Role}) | Ruta: '{MenuRoute}' | Estación: '{CodEstacion}' | IP: '{IpAddress}' | Duración: {DurationMs}ms | Detalle: {Details}",
            entry.Action,
            entry.Username,
            entry.Role,
            entry.MenuRoute ?? "-",
            entry.CodEstacion ?? "-",
            entry.IpAddress ?? "-",
            entry.DurationMs ?? 0,
            entry.Details ?? "-");

        // 2. Persistencia en Oracle CENTRALITV.LOG_AUDITORIA_WEB (si la conexión está activa y la tabla existe)
        try
        {
            using var conn = CreateConnection();
            if (conn == null) return;

            const string insertSql = """
                INSERT INTO CENTRALITV.LOG_AUDITORIA_WEB (
                    Id_Empleado, Cod_Usuario, Rol, Accion, Ruta_Menu, CodEstacion, Ip_Origen, User_Agent, Duracion_Ms, Detalles
                ) VALUES (
                    :idEmpleado, :codUsuario, :rol, :accion, :rutaMenu, :codEstacion, :ipOrigen, :userAgent, :duracionMs, :detalles
                )
                """;

            var cleanUser = entry.Username.Length > 50 ? entry.Username[..50] : entry.Username;
            var cleanRole = entry.Role.Length > 30 ? entry.Role[..30] : entry.Role;
            var cleanAction = entry.Action.Length > 50 ? entry.Action[..50] : entry.Action;
            var cleanRoute = entry.MenuRoute != null && entry.MenuRoute.Length > 150 ? entry.MenuRoute[..150] : entry.MenuRoute;
            var cleanEstacion = entry.CodEstacion != null && entry.CodEstacion.Length > 10 ? entry.CodEstacion[..10] : entry.CodEstacion;
            var cleanIp = entry.IpAddress != null && entry.IpAddress.Length > 45 ? entry.IpAddress[..45] : entry.IpAddress;
            var cleanAgent = entry.UserAgent != null && entry.UserAgent.Length > 250 ? entry.UserAgent[..250] : entry.UserAgent;
            var cleanDetails = entry.Details != null && entry.Details.Length > 500 ? entry.Details[..500] : entry.Details;

            await conn.ExecuteAsync(new CommandDefinition(insertSql, new
            {
                idEmpleado = entry.IdEmpleado,
                codUsuario = cleanUser,
                rol = cleanRole,
                accion = cleanAction,
                rutaMenu = cleanRoute,
                codEstacion = cleanEstacion,
                ipOrigen = cleanIp,
                userAgent = cleanAgent,
                duracionMs = entry.DurationMs,
                detalles = cleanDetails
            }, cancellationToken: cancellationToken));
        }
        catch (OracleException oraEx) when (oraEx.Number == 942) // ORA-00942: table or view does not exist
        {
            // La tabla aún no ha sido ejecutada en este entorno Oracle. El log estructurado ya lo ha capturado.
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo insertar evento de auditoría en CENTRALITV.LOG_AUDITORIA_WEB");
        }
    }
}
