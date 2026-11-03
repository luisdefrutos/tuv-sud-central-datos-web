using System.Data;
using System.Text;
using CentralDatos.Domain.Entities.Informes;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<BastidorObdNoCoincidenteDato>> ObtenerBastidoresObdNoCoincidentesAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeBastidoresObdNoCoincidentes");

        var sqlFinal = sqlBase;
        var whereExtra = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(codEmpresa))
        {
            whereExtra.Append($" AND e.Cod_Empresa = '{codEmpresa.Trim()}'");
        }

        if (codEstaciones != null && codEstaciones.Count > 0)
        {
            var codsInts = codEstaciones
                .Select(c => int.TryParse(c.Trim(), out var n) ? n.ToString() : null)
                .Where(n => n != null)
                .ToList();

            if (codsInts.Count > 0)
            {
                var codsIn = string.Join(", ", codsInts);
                whereExtra.Append($" AND i.CODESTACION IN ({codsIn}) AND obd.CODESTACION IN ({codsIn})");
            }
            else
            {
                var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim()}'"));
                whereExtra.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn}) AND LPAD(TRIM(TO_CHAR(obd.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        sqlFinal = sqlFinal.Replace("/*WHERE_EXTRA*/", whereExtra.ToString());

        return await ObtenerBastidoresObdNoCoincidentesDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
    }

    private async Task<IReadOnlyList<BastidorObdNoCoincidenteDato>> ObtenerBastidoresObdNoCoincidentesDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        LogSqlEjecutada("INFORME_BASTIDORES_OBD_NO_COINCIDENTES", sql, fechaInicio, fechaFin);

        async Task<IReadOnlyList<BastidorObdNoCoincidenteDato>> EjecutarQueryAsync(bool esReintento = false)
        {
            await using var conn = new OracleConnection(_options.ConnectionString);
            if (esReintento)
            {
                OracleConnection.ClearPool(conn);
            }
            await conn.OpenAsync(cancellationToken);

            await using var cmd = conn.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sql;
            cmd.CommandTimeout = 120;

            cmd.Parameters.Add("FechaInicio", OracleDbType.Date).Value = fechaInicio;
            cmd.Parameters.Add("FechaFin", OracleDbType.Date).Value = fechaFin;

            var lista = new List<BastidorObdNoCoincidenteDato>();
            await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var codEmpresa = reader.IsDBNull(3) ? "01" : reader.GetString(3).Trim();
                var claveSociedad = codEmpresa == "03" ? "CAL" : "TSA";

                lista.Add(new BastidorObdNoCoincidenteDato
                {
                    CodInspeccion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                    CodEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                    DesEstacion = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim(),
                    CodEmpresa = codEmpresa,
                    ClaveSociedad = claveSociedad,
                    FechaInspeccion = reader.IsDBNull(4) ? DateTime.MinValue : reader.GetDateTime(4),
                    Matricula = reader.IsDBNull(5) ? string.Empty : reader.GetString(5).Trim(),
                    BastidorInspeccion = reader.IsDBNull(6) ? string.Empty : reader.GetString(6).Trim(),
                    BastidorObd = reader.IsDBNull(7) ? string.Empty : reader.GetString(7).Trim(),
                    Categoria = reader.IsDBNull(8) ? "-" : reader.GetString(8).Trim(),
                    Clasificacion = reader.IsDBNull(9) ? "-" : reader.GetString(9).Trim(),
                    Nombre = reader.IsDBNull(10) ? null : reader.GetString(10).Trim(),
                    Apellidos = reader.IsDBNull(11) ? null : reader.GetString(11).Trim(),
                    CifFactura = reader.IsDBNull(12) ? null : reader.GetString(12).Trim(),
                    CodInspector = reader.IsDBNull(13) ? null : reader.GetString(13).Trim(),
                    CodInspector1 = reader.IsDBNull(14) ? null : reader.GetString(14).Trim(),
                    CodInspector2 = reader.IsDBNull(15) ? null : reader.GetString(15).Trim(),
                    CodInspector3 = reader.IsDBNull(16) ? null : reader.GetString(16).Trim(),
                    InspectorResponsableValidacion = reader.IsDBNull(17) ? null : reader.GetString(17).Trim(),
                    EquipoObd = reader.IsDBNull(18) ? null : reader.GetString(18).Trim(),
                    CodEmpleadoBastidor = reader.IsDBNull(19) ? null : reader.GetString(19).Trim()
                });
            }
            return lista;
        }

        try
        {
            return await EjecutarQueryAsync();
        }
        catch (OracleException ex) when (cancellationToken.IsCancellationRequested || ex.Number == 12570)
        {
            _logger.LogInformation("Consulta de bastidores OBD no coincidentes cancelada por el cliente (ORA-{ErrorNumber}). Retornando lista vacía.", ex.Number);
            return Array.Empty<BastidorObdNoCoincidenteDato>();
        }
        catch (OracleException ex) when (!cancellationToken.IsCancellationRequested && (ex.Number == 12541 || ex.Number == 12571 || ex.Number == 3113 || ex.Number == 3114))
        {
            _logger.LogWarning(ex, "Error transitorio de red Oracle (ORA-{ErrorNumber}) en bastidores OBD no coincidentes. Reintentando con pool limpio...", ex.Number);
            try
            {
                return await EjecutarQueryAsync(esReintento: true);
            }
            catch (Exception retryEx)
            {
                _logger.LogError(retryEx, "Falló el reintento tras error de red en bastidores OBD no coincidentes.");
                throw;
            }
        }
        catch (Exception ex)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                _logger.LogInformation("Operación de bastidores OBD no coincidentes cancelada a petición del cliente.");
                return Array.Empty<BastidorObdNoCoincidenteDato>();
            }
            _logger.LogError(ex, "Error al ejecutar consulta de bastidores OBD no coincidentes en Oracle.");
            throw;
        }
    }
}

