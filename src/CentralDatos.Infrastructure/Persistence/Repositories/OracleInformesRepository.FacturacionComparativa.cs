using System.Data;
using System.Text;
using CentralDatos.Domain.Entities.Informes;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<FacturacionComparativaDato>> ObtenerFacturacionComparativaAsync(
        DateTime fechaInicioRango1,
        DateTime fechaFinRango1,
        DateTime fechaInicioRango2,
        DateTime fechaFinRango2,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerFacturacionComparativaExcel");

        var sqlFinal = sqlBase;
        var filtroEstaciones = new StringBuilder();

        if (codEstaciones != null && codEstaciones.Count > 0)
        {
            var codsInts = codEstaciones
                .Select(c => int.TryParse(c.Trim(), out var n) ? n.ToString() : null)
                .Where(n => n != null)
                .ToList();

            if (codsInts.Count > 0)
            {
                var codsIn = string.Join(", ", codsInts);
                filtroEstaciones.Append($" AND i.CODESTACION IN ({codsIn})");
            }
            else
            {
                var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim()}'"));
                filtroEstaciones.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        var strFiltro = filtroEstaciones.ToString();
        sqlFinal = sqlFinal
            .Replace("/*FILTRO_ESTACIONES_R1*/", strFiltro)
            .Replace("/*FILTRO_ESTACIONES_R2*/", strFiltro);

        return await ObtenerFacturacionComparativaDirectoAsync(
            sqlFinal,
            fechaInicioRango1,
            fechaFinRango1,
            fechaInicioRango2,
            fechaFinRango2,
            cancellationToken);
    }

    private async Task<IReadOnlyList<FacturacionComparativaDato>> ObtenerFacturacionComparativaDirectoAsync(
        string sql,
        DateTime fechaInicioR1,
        DateTime fechaFinR1,
        DateTime fechaInicioR2,
        DateTime fechaFinR2,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Ejecutando SQL FACTURACION_COMPARATIVA_EXCEL. R1: {F1Inicio:dd/MM/yyyy HH:mm:ss} - {F1Fin:dd/MM/yyyy HH:mm:ss} | R2: {F2Inicio:dd/MM/yyyy HH:mm:ss} - {F2Fin:dd/MM/yyyy HH:mm:ss}",
            fechaInicioR1, fechaFinR1, fechaInicioR2, fechaFinR2);

        async Task<IReadOnlyList<FacturacionComparativaDato>> EjecutarQueryAsync(bool esReintento = false)
        {
            await using var connection = new OracleConnection(_options.ConnectionString);
            if (esReintento)
            {
                OracleConnection.ClearPool(connection);
            }
            await connection.OpenAsync(cancellationToken);

            await using var cmd = connection.CreateCommand();
            cmd.CommandText = sql;
            cmd.CommandType = CommandType.Text;
            cmd.BindByName = true;
            cmd.CommandTimeout = 120; // 2 minutos máximo

            cmd.Parameters.Add(new OracleParameter("FechaInicioRango1", OracleDbType.Date) { Value = fechaInicioR1 });
            cmd.Parameters.Add(new OracleParameter("FechaFinRango1", OracleDbType.Date) { Value = fechaFinR1 });
            cmd.Parameters.Add(new OracleParameter("FechaInicioRango2", OracleDbType.Date) { Value = fechaInicioR2 });
            cmd.Parameters.Add(new OracleParameter("FechaFinRango2", OracleDbType.Date) { Value = fechaFinR2 });

            var resultados = new List<FacturacionComparativaDato>();

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                int rangoId = reader.IsDBNull(0) ? 1 : Convert.ToInt32(reader.GetValue(0));
                string codEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim().PadLeft(4, '0');
                string desEstacion = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim();
                string claveSociedad = reader.IsDBNull(3) ? "TSA" : reader.GetString(3).Trim();
                int totalInspecciones = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4));
                decimal totalIngresos = reader.IsDBNull(5) ? 0.00m : Convert.ToDecimal(reader.GetValue(5));

                resultados.Add(new FacturacionComparativaDato(
                    rangoId,
                    codEstacion,
                    desEstacion,
                    claveSociedad,
                    totalInspecciones,
                    totalIngresos
                ));
            }

            return resultados;
        }

        try
        {
            var res = await EjecutarQueryAsync();
            _logger.LogInformation("FACTURACION_COMPARATIVA_EXCEL completada. Filas agregadas: {Count}", res.Count);
            return res;
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Consulta FACTURACION_COMPARATIVA_EXCEL cancelada por el cliente.");
            return Array.Empty<FacturacionComparativaDato>();
        }
        catch (OracleException ex) when (ex.Number == 1013)
        {
            _logger.LogInformation("Consulta Oracle FACTURACION_COMPARATIVA_EXCEL cancelada (ORA-01013).");
            return Array.Empty<FacturacionComparativaDato>();
        }
        catch (OracleException ex) when (ex.Number == 3113 || ex.Number == 3114 || ex.Number == 12571 || ex.Number == 12541)
        {
            _logger.LogWarning(ex, "Error de conexión Oracle ({Number}). Reintentando con pool limpio...", ex.Number);
            return await EjecutarQueryAsync(esReintento: true);
        }
    }
}
