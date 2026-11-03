using System.Data;
using System.Text;
using CentralDatos.Domain.Entities.Informes;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<MinerEstadisticaGlobalDato> ObtenerEstadisticaMinerAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default)
    {
        var filtroEstaciones = new StringBuilder();
        var filtroEstacionesDefectos = new StringBuilder();
        if (codEstaciones != null && codEstaciones.Count > 0 && codEstaciones.Count < 30)
        {
            var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim().PadLeft(4, '0')}'"));
            filtroEstaciones.Append($" AND i.CODESTACION IN ({codsIn})");
            filtroEstacionesDefectos.Append($" AND i.CODESTACION IN ({codsIn}) AND d.CODESTACION IN ({codsIn})");
        }
        var strFiltro = filtroEstaciones.ToString();
        var strFiltroDefectos = filtroEstacionesDefectos.ToString();

        // 1. Ejecución secuencial optimizada con hints INDEX y USE_NL:
        // Primero las inspecciones unificadas (Fase 1 + Fase 2 en 1 solo pase rápido ~7s para 2 meses),
        // luego los defectos agregados (~13s para 2 meses en toda la red).
        var sqlInspecciones = _sqlLoader.GetQuery("ObtenerMinerInspecciones")
            .Replace("/*FILTRO_ESTACIONES*/", strFiltro);

        var (fase1, fase2) = await EjecutarQueryMinerInspeccionesUnificadasAsync(sqlInspecciones, fechaInicio, fechaFin, cancellationToken);

        var sqlDefectos = _sqlLoader.GetQuery("ObtenerMinerDefectos")
            .Replace("/*FILTRO_ESTACIONES*/", strFiltroDefectos);

        var defectos = await EjecutarQueryMinerDefectosAsync(sqlDefectos, fechaInicio, fechaFin, cancellationToken);

        return new MinerEstadisticaGlobalDato
        {
            Defectos = defectos,
            PrimerasInspecciones = fase1,
            SegundasInspecciones = fase2
        };
    }

    private async Task<(IReadOnlyList<MinerInspeccionDato> Fase1, IReadOnlyList<MinerInspeccionDato> Fase2)> EjecutarQueryMinerInspeccionesUnificadasAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        async Task<(IReadOnlyList<MinerInspeccionDato> Fase1, IReadOnlyList<MinerInspeccionDato> Fase2)> EjecutarAsync(bool esReintento = false)
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
            cmd.CommandTimeout = 300; // 5 minutos de margen para rangos de varios meses

            cmd.Parameters.Add(new OracleParameter("FechaInicio", OracleDbType.Date) { Value = fechaInicio });
            cmd.Parameters.Add(new OracleParameter("FechaFin", OracleDbType.Date) { Value = fechaFin });

            var listaFase1 = new List<MinerInspeccionDato>();
            var listaFase2 = new List<MinerInspeccionDato>();

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var fase = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim();
                var item = new MinerInspeccionDato
                {
                    Resultado = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim().ToUpperInvariant(),
                    Grupo01Mo = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2)),
                    Grupo02Tp = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3)),
                    Grupo03Tr = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4)),
                    Grupo04Mp = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
                    Grupo05Mg = reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6)),
                    Grupo06Au = reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7)),
                    Grupo07Rs = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
                    Grupo08Ag = reader.IsDBNull(9) ? 0 : Convert.ToInt32(reader.GetValue(9)),
                    Grupo09Ot = reader.IsDBNull(10) ? 0 : Convert.ToInt32(reader.GetValue(10)),
                };

                if (fase == "1")
                {
                    listaFase1.Add(item);
                }
                else if (fase == "2")
                {
                    listaFase2.Add(item);
                }
            }

            return (listaFase1, listaFase2);
        }

        try
        {
            return await EjecutarAsync();
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Consulta MINER inspecciones cancelada por el cliente.");
            return (Array.Empty<MinerInspeccionDato>(), Array.Empty<MinerInspeccionDato>());
        }
        catch (Exception ex) when (ex is IOException || ex is System.Net.Sockets.SocketException ||
            (ex is OracleException oex && (oex.Number == 3113 || oex.Number == 3114 || oex.Number == 12571 || oex.Number == 12541 || oex.Number == 10054)))
        {
            _logger.LogWarning(ex, "Conexión interrumpida por el host en MINER inspecciones. Reintentando con pool limpio...");
            return await EjecutarAsync(esReintento: true);
        }
    }

    private async Task<IReadOnlyList<MinerDefectoDato>> EjecutarQueryMinerDefectosAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        async Task<IReadOnlyList<MinerDefectoDato>> EjecutarAsync(bool esReintento = false)
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
            cmd.CommandTimeout = 300; // 5 minutos de margen para rangos de varios meses

            cmd.Parameters.Add(new OracleParameter("FechaInicio", OracleDbType.Date) { Value = fechaInicio });
            cmd.Parameters.Add(new OracleParameter("FechaFin", OracleDbType.Date) { Value = fechaFin });

            var lista = new List<MinerDefectoDato>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                lista.Add(new MinerDefectoDato
                {
                    Gravedad = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                    Grupo01Mo = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader.GetValue(1)),
                    Grupo02Tp = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2)),
                    Grupo03Tr = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3)),
                    Grupo04Mp = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4)),
                    Grupo05Mg = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
                    Grupo06Au = reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6)),
                    Grupo07Rs = reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7)),
                    Grupo08Ag = reader.IsDBNull(8) ? 0 : Convert.ToInt32(reader.GetValue(8)),
                    Grupo09Ot = reader.IsDBNull(9) ? 0 : Convert.ToInt32(reader.GetValue(9)),
                });
            }

            return lista;
        }

        try
        {
            return await EjecutarAsync();
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Consulta MINER defectos cancelada por el cliente.");
            return Array.Empty<MinerDefectoDato>();
        }
        catch (Exception ex) when (ex is IOException || ex is System.Net.Sockets.SocketException ||
            (ex is OracleException oex && (oex.Number == 3113 || oex.Number == 3114 || oex.Number == 12571 || oex.Number == 12541 || oex.Number == 10054)))
        {
            _logger.LogWarning(ex, "Conexión interrumpida por el host en MINER defectos. Reintentando con pool limpio...");
            return await EjecutarAsync(esReintento: true);
        }
    }

}
