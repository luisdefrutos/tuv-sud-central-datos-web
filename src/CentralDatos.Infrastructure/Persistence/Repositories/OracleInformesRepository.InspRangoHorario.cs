using System.Data;
using System.Text;
using CentralDatos.Domain.Entities.Informes;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<InspRangoHorarioDato>> ObtenerInspRangoHorarioAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeInspRangoHorario");

        var sqlFinal = sqlBase;
        var whereExtra = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(codEmpresa) &&
            !string.Equals(codEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(codEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            whereExtra.Append($" AND i.CODESTACION IN (SELECT CodEstacion FROM CENTRALITV.ESTACIONES WHERE Cod_Empresa = '{codEmpresa.Trim()}')");
        }

        var codsFiltrados = codEstaciones?
            .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (codsFiltrados != null && codsFiltrados.Count > 0)
        {
            var codsInts = codsFiltrados
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
                var codsIn = string.Join(", ", codsFiltrados.Select(c => $"'{c.Trim()}'"));
                whereExtra.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        // Filtro opcional por fase ('1' = Primera/Periódica, '2' = Segunda/Reiterada)
        if (!string.IsNullOrWhiteSpace(fase))
        {
            var faseTrim = fase.Trim();
            if (faseTrim == "1" || faseTrim == "2")
            {
                whereExtra.Append($" AND i.INDICA12 = '{faseTrim}'");
            }
        }

        sqlFinal = sqlFinal.Replace("/*WHERE_EXTRA*/", whereExtra.ToString());

        return await ObtenerInspRangoHorarioDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
    }

    private async Task<IReadOnlyList<InspRangoHorarioDato>> ObtenerInspRangoHorarioDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        LogSqlEjecutada("INFORME_INSPECCIONES_RANGO_HORARIO", sql, fechaInicio, fechaFin);

        async Task<IReadOnlyList<InspRangoHorarioDato>> EjecutarQueryAsync(bool esReintento = false)
        {
            await using var connection = new OracleConnection(_options.ConnectionString);
            if (esReintento)
            {
                OracleConnection.ClearPool(connection);
            }
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var cmd = connection.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sql;
            cmd.CommandType = CommandType.Text;
            cmd.CommandTimeout = 120;
            cmd.InitialLONGFetchSize = 0;

            cmd.Parameters.Add(new OracleParameter("FechaInicio", OracleDbType.Date) { Value = fechaInicio });
            cmd.Parameters.Add(new OracleParameter("FechaFin", OracleDbType.Date) { Value = fechaFin });

            var lista = new List<InspRangoHorarioDato>();

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var item = new InspRangoHorarioDato
                {
                    CodEstacion = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0)),
                    DesEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    CodEmpresa = reader.IsDBNull(2) ? "01" : reader.GetString(2).Trim(),
                    Fecha = reader.IsDBNull(3) ? DateTime.MinValue : reader.GetDateTime(3),
                    H06 = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4)),
                    H07 = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
                    H08 = reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6)),
                    H09 = reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7)),
                    H10 = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
                    H11 = reader.IsDBNull(9) ? 0 : Convert.ToInt32(reader.GetValue(9)),
                    H12 = reader.IsDBNull(10) ? 0 : Convert.ToInt32(reader.GetValue(10)),
                    H13 = reader.IsDBNull(11) ? 0 : Convert.ToInt32(reader.GetValue(11)),
                    H14 = reader.IsDBNull(12) ? 0 : Convert.ToInt32(reader.GetValue(12)),
                    H15 = reader.IsDBNull(13) ? 0 : Convert.ToInt32(reader.GetValue(13)),
                    H16 = reader.IsDBNull(14) ? 0 : Convert.ToInt32(reader.GetValue(14)),
                    H17 = reader.IsDBNull(15) ? 0 : Convert.ToInt32(reader.GetValue(15)),
                    H18 = reader.IsDBNull(16) ? 0 : Convert.ToInt32(reader.GetValue(16)),
                    H19 = reader.IsDBNull(17) ? 0 : Convert.ToInt32(reader.GetValue(17)),
                    H20 = reader.IsDBNull(18) ? 0 : Convert.ToInt32(reader.GetValue(18)),
                    H21 = reader.IsDBNull(19) ? 0 : Convert.ToInt32(reader.GetValue(19)),
                };
                lista.Add(item);
            }

            return lista;
        }

        try
        {
            return await EjecutarQueryAsync();
        }
        catch (OracleException ex) when (ex.Number == 12570 || ex.Message.Contains("ORA-12570"))
        {
            _logger.LogWarning(ex, "[ORA-12570] Fallo de paquete en Informe Inspecciones Rango Horario. Reintentando tras 2s...");
            await Task.Delay(2000, cancellationToken);
            return await EjecutarQueryAsync(esReintento: true);
        }
    }
}
