using System.Data;
using System.Text;
using CentralDatos.Domain.Entities.Informes;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<InspeccionSinInspectorDato>> ObtenerInspeccionesSinInspectorAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeSinInspector");

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
                whereExtra.Append($" AND i.CODESTACION IN ({codsIn})");
            }
            else
            {
                var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim()}'"));
                whereExtra.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        if (!string.IsNullOrWhiteSpace(fase) && (fase == "1" || fase == "2"))
        {
            whereExtra.Append($" AND i.INDICA12 = '{fase}'");
        }

        sqlFinal = sqlFinal.Replace("/*WHERE_EXTRA*/", whereExtra.ToString());

        return await ObtenerInspeccionesSinInspectorDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
    }

    private async Task<IReadOnlyList<InspeccionSinInspectorDato>> ObtenerInspeccionesSinInspectorDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        LogSqlEjecutada("INSPECCIONES_SIN_INSPECTOR", sql, fechaInicio, fechaFin);

        async Task<IReadOnlyList<InspeccionSinInspectorDato>> EjecutarQueryAsync(bool esReintento = false)
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

            cmd.Parameters.Add("p_fecha_inicio", OracleDbType.Date).Value = fechaInicio;
            cmd.Parameters.Add("p_fecha_fin", OracleDbType.Date).Value = fechaFin;

            var lista = new List<InspeccionSinInspectorDato>();
            await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                lista.Add(new InspeccionSinInspectorDato
                {
                    CodInspeccion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                    CodEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                    DesEstacion = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim(),
                    CodEmpresa = reader.IsDBNull(3) ? "01" : reader.GetString(3).Trim(),
                    NombreEmpresa = reader.IsDBNull(4) ? "TÜV SÜD ATISAE S.A.U." : reader.GetString(4).Trim(),
                    ClaveSociedad = reader.IsDBNull(5) ? "TSA" : reader.GetString(5).Trim(),
                    Matricula = reader.IsDBNull(6) ? string.Empty : reader.GetString(6).Trim(),
                    FechaInspeccion = reader.IsDBNull(7) ? DateTime.MinValue : reader.GetDateTime(7),
                    Marca = reader.IsDBNull(8) ? "-" : reader.GetString(8).Trim(),
                    Modelo = reader.IsDBNull(9) ? "-" : reader.GetString(9).Trim(),
                    TipoMotor = reader.IsDBNull(10) ? "-" : reader.GetString(10).Trim(),
                    TipoVehiculo = reader.IsDBNull(11) ? "-" : reader.GetString(11).Trim(),
                    TipoInspeccion = reader.IsDBNull(12) ? "001" : reader.GetString(12).Trim(),
                    TextoResultado = reader.IsDBNull(13) ? "Desconocido" : reader.GetString(13).Trim(),
                    Resultado = reader.IsDBNull(14) ? "0" : reader.GetString(14).Trim(),
                    Fase = reader.IsDBNull(15) ? "1ª Fase" : reader.GetString(15).Trim(),
                    Indica12 = reader.IsDBNull(16) ? "1" : reader.GetString(16).Trim(),
                    CHomologacion = reader.IsDBNull(17) ? null : reader.GetString(17).Trim(),
                    Clasificacion = reader.IsDBNull(18) ? "-" : reader.GetString(18).Trim(),
                    Mma = reader.IsDBNull(19) ? null : Convert.ToDecimal(reader.GetValue(19)),
                    Kilometraje = reader.IsDBNull(20) ? null : reader.GetString(20).Trim()
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
            _logger.LogInformation("Consulta de inspecciones sin inspector cancelada por el cliente (ORA-{ErrorNumber}). Retornando lista vacía.", ex.Number);
            return Array.Empty<InspeccionSinInspectorDato>();
        }
        catch (OracleException ex) when (!cancellationToken.IsCancellationRequested && (ex.Number == 12541 || ex.Number == 12571 || ex.Number == 3113 || ex.Number == 3114))
        {
            _logger.LogWarning(ex, "Error transitorio de red Oracle (ORA-{ErrorNumber}) en inspecciones sin inspector. Reintentando con pool limpio...", ex.Number);
            try
            {
                return await EjecutarQueryAsync(esReintento: true);
            }
            catch (Exception retryEx)
            {
                _logger.LogError(retryEx, "Falló el reintento tras error de red en inspecciones sin inspector.");
                throw;
            }
        }
        catch (Exception ex)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                _logger.LogInformation("Operación de inspecciones sin inspector cancelada a petición del cliente.");
                return Array.Empty<InspeccionSinInspectorDato>();
            }
            _logger.LogError(ex, "Error al ejecutar consulta de inspecciones sin inspector en Oracle.");
            throw;
        }
    }
}

