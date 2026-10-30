using System.Globalization;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesDuracionPromedioService : IInformesDuracionPromedioService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesDuracionPromedioService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeDuracionPromedioResponseDto> GenerarInformeDuracionPromedioAsync(
        FiltrosDuracionPromedioRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ParsearYValidarFechas(filtros.FechaInicio, filtros.FechaFin);

        string? codEmpresa = filtros.Sociedad?.ToUpperInvariant() switch
        {
            "TSA" => "01",
            "CAL" => "03",
            _ => null
        };

        var estaciones = (filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0 && !filtros.CodEstaciones.Contains("TODAS"))
            ? filtros.CodEstaciones
            : null;

        string? fase = filtros.Fase switch
        {
            "1" or "Fase 1" => "1",
            "2" or "Fase 2" => "2",
            _ => null
        };

        var datos = await _repository.ObtenerDuracionPromedioAsync(fInicio, fFin, codEmpresa, estaciones, fase, cancellationToken);

        // 1. Mapeo de filas detalladas
        var filas = datos.Select(d => new FilaDuracionPromedioDto(
            d.CodEstacion,
            d.DesEstacion,
            d.CodEmpresa,
            d.NombreEmpresa,
            d.ClaveSociedad,
            d.TipoVehiculo,
            d.OrdenTipo,
            d.TotalInspecciones,
            d.DuracionPromedioMinutos,
            d.DuracionFormateada
        )).ToList();

        // 2. Resumen agrupado por Estación
        var resumenEstaciones = datos
            .GroupBy(d => new { d.CodEstacion, d.DesEstacion, d.CodEmpresa, d.NombreEmpresa, d.ClaveSociedad })
            .Select(g =>
            {
                var totalInsp = g.Sum(x => x.TotalInspecciones);
                var ponderada = totalInsp > 0
                    ? Math.Round(g.Sum(x => x.DuracionPromedioMinutos * x.TotalInspecciones) / totalInsp, 1)
                    : 0m;

                return new ResumenEstacionDuracionDto(
                    g.Key.CodEstacion,
                    g.Key.DesEstacion,
                    g.Key.CodEmpresa,
                    g.Key.NombreEmpresa,
                    g.Key.ClaveSociedad,
                    totalInsp,
                    ponderada,
                    FormatearMinutos(ponderada)
                );
            })
            .OrderBy(r => r.ClaveSociedad)
            .ThenBy(r => r.DesEstacion)
            .ToList();

        // 3. Resumen agrupado por Tipo de Vehículo
        var resumenTiposVehiculo = datos
            .GroupBy(d => new { d.TipoVehiculo, d.OrdenTipo })
            .Select(g =>
            {
                var totalInsp = g.Sum(x => x.TotalInspecciones);
                var ponderada = totalInsp > 0
                    ? Math.Round(g.Sum(x => x.DuracionPromedioMinutos * x.TotalInspecciones) / totalInsp, 1)
                    : 0m;

                return new ResumenTipoVehiculoDuracionDto(
                    g.Key.TipoVehiculo,
                    g.Key.OrdenTipo,
                    totalInsp,
                    ponderada,
                    FormatearMinutos(ponderada)
                );
            })
            .OrderBy(t => t.OrdenTipo)
            .ToList();

        // 4. Totales y KPIs ejecutivos globales
        var totalGlobal = datos.Sum(x => x.TotalInspecciones);
        var duracionMediaGlobal = totalGlobal > 0
            ? Math.Round(datos.Sum(x => x.DuracionPromedioMinutos * x.TotalInspecciones) / totalGlobal, 1)
            : 0m;

        // Estación más ágil (con mayor o igual a 5 inspecciones para evitar anomalías)
        var candidatasEstaciones = resumenEstaciones.Where(e => e.TotalInspecciones >= 5 && e.DuracionPromedioMinutos > 0).ToList();
        if (candidatasEstaciones.Count == 0) candidatasEstaciones = resumenEstaciones.Where(e => e.DuracionPromedioMinutos > 0).ToList();
        var estacionMasAgil = candidatasEstaciones.OrderBy(e => e.DuracionPromedioMinutos).FirstOrDefault();

        // Tipo de vehículo más rápido
        var candidatasTipos = resumenTiposVehiculo.Where(t => t.TotalInspecciones >= 5 && t.DuracionPromedioMinutos > 0).ToList();
        if (candidatasTipos.Count == 0) candidatasTipos = resumenTiposVehiculo.Where(t => t.DuracionPromedioMinutos > 0).ToList();
        var tipoMasRapido = candidatasTipos.OrderBy(t => t.DuracionPromedioMinutos).FirstOrDefault();

        // 5. Gráfico de Ranking de Estaciones (ordenado de menor a mayor duración = más ágiles primero)
        var graficoRankingEstaciones = resumenEstaciones
            .Where(e => e.TotalInspecciones > 0)
            .OrderBy(e => e.DuracionPromedioMinutos)
            .Select(e => new ReportGraficoPointDto(
                e.CodEstacion,
                e.DesEstacion.Replace("I.T.V. - ", "").Trim(),
                e.DuracionPromedioMinutos,
                $"{e.DuracionFormateada} ({e.TotalInspecciones:N0} insp.)",
                e.ClaveSociedad,
                e.ClaveSociedad == "CAL" ? "#00875a" : "#0046ad"
            ))
            .ToList();

        // 6. Gráfico por Tipos de Vehículo
        var graficoTiposVehiculo = resumenTiposVehiculo
            .Where(t => t.TotalInspecciones > 0)
            .OrderBy(t => t.OrdenTipo)
            .Select(t => new ReportGraficoPointDto(
                $"tipo_{t.OrdenTipo}",
                t.TipoVehiculo,
                t.DuracionPromedioMinutos,
                $"{t.DuracionFormateada} ({t.TotalInspecciones:N0} insp.)",
                "TIPO",
                "#0284c7"
            ))
            .ToList();

        return new InformeDuracionPromedioResponseDto(
            FechaInicio: fInicio.ToString("yyyy-MM-dd"),
            FechaFin: fFin.ToString("yyyy-MM-dd"),
            Fase: filtros.Fase ?? "TODAS",
            TotalInspeccionesGlobal: totalGlobal,
            DuracionPromedioGlobalMinutos: duracionMediaGlobal,
            DuracionPromedioGlobalFormateada: FormatearMinutos(duracionMediaGlobal),
            EstacionMasRapida: estacionMasAgil != null ? $"{estacionMasAgil.CodEstacion} - {estacionMasAgil.DesEstacion.Replace("I.T.V. - ", "")}" : "Sin datos",
            DuracionEstacionMasRapida: estacionMasAgil != null ? estacionMasAgil.DuracionFormateada : "0 min",
            TipoVehiculoMasRapido: tipoMasRapido != null ? tipoMasRapido.TipoVehiculo : "Sin datos",
            DuracionTipoVehiculoMasRapido: tipoMasRapido != null ? tipoMasRapido.DuracionFormateada : "0 min",
            Filas: filas,
            ResumenEstaciones: resumenEstaciones,
            ResumenTiposVehiculo: resumenTiposVehiculo,
            GraficoRankingEstaciones: graficoRankingEstaciones,
            GraficoTiposVehiculo: graficoTiposVehiculo
        );
    }

    public async Task<byte[]> GenerarExportacionDuracionPromedioCsvAsync(
        FiltrosDuracionPromedioRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ParsearYValidarFechas(filtros.FechaInicio, filtros.FechaFin);

        string? codEmpresa = filtros.Sociedad?.ToUpperInvariant() switch
        {
            "TSA" => "01",
            "CAL" => "03",
            _ => null
        };

        var estaciones = (filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0 && !filtros.CodEstaciones.Contains("TODAS"))
            ? filtros.CodEstaciones
            : null;

        string? fase = filtros.Fase switch
        {
            "1" or "Fase 1" => "1",
            "2" or "Fase 2" => "2",
            _ => null
        };

        var datos = await _repository.ObtenerDuracionPromedioAsync(fInicio, fFin, codEmpresa, estaciones, fase, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("sep=;");
        sb.AppendLine("Código Estación;Estación ITV;Sociedad;Tipo de Vehículo;Total Inspecciones (001);Duración Media (Minutos);Duración Formateada");

        foreach (var d in datos)
        {
            sb.Append(d.CodEstacion).Append(';');
            sb.Append('"').Append(d.DesEstacion.Replace("\"", "\"\"")).Append("\";");
            sb.Append(d.ClaveSociedad).Append(';');
            sb.Append('"').Append(d.TipoVehiculo.Replace("\"", "\"\"")).Append("\";");
            sb.Append(d.TotalInspecciones).Append(';');
            sb.Append(d.DuracionPromedioMinutos.ToString("F1", CultureEs)).Append(';');
            sb.Append('"').Append(d.DuracionFormateada).Append('"');
            sb.AppendLine();
        }

        var preamble = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var resultado = new byte[preamble.Length + bytes.Length];
        Buffer.BlockCopy(preamble, 0, resultado, 0, preamble.Length);
        Buffer.BlockCopy(bytes, 0, resultado, preamble.Length, bytes.Length);

        return resultado;
    }

    private static (DateTime inicio, DateTime fin) ParsearYValidarFechas(string fechaInicioStr, string fechaFinStr)
    {
        if (!DateTime.TryParseExact(fechaInicioStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var inicio))
        {
            if (!DateTime.TryParse(fechaInicioStr, CultureEs, DateTimeStyles.None, out inicio))
            {
                throw new ArgumentException($"La fecha de inicio '{fechaInicioStr}' no tiene un formato válido (yyyy-MM-dd).");
            }
        }

        if (!DateTime.TryParseExact(fechaFinStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fin))
        {
            if (!DateTime.TryParse(fechaFinStr, CultureEs, DateTimeStyles.None, out fin))
            {
                throw new ArgumentException($"La fecha final '{fechaFinStr}' no tiene un formato válido (yyyy-MM-dd).");
            }
        }

        if (fin < inicio)
        {
            throw new ArgumentException("La fecha final no puede ser anterior a la fecha de inicio.");
        }

        if ((fin - inicio).TotalDays > 366)
        {
            throw new ArgumentException("El rango de fechas no puede ser superior a 1 año (365 días) para optimizar el rendimiento de la consulta en Central Datos.");
        }

        var inicioFull = inicio.Date;
        var finFull = fin.Date.AddDays(1).AddTicks(-1);

        return (inicioFull, finFull);
    }

    private static string FormatearMinutos(decimal minutos)
    {
        if (minutos <= 0) return "0 min";
        var mins = (int)Math.Floor(minutos);
        var secs = (int)Math.Round((minutos - mins) * 60);
        return secs > 0 ? $"{mins} min {secs:00} s" : $"{mins} min";
    }
}
