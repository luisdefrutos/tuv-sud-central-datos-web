using System.Globalization;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesNumeroInspeccionesService : IInformesNumeroInspeccionesService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesNumeroInspeccionesService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeNumeroInspeccionesResponseDto> GenerarInformeNumeroInspeccionesAsync(
        FiltrosNumeroInspeccionesRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        // 0. Validación de rango (Máximo 1 año para optimización de consultas masivas)
        if (filtros.FechaFin < filtros.FechaInicio)
        {
            throw new ArgumentException("La fecha final no puede ser anterior a la fecha de inicio.");
        }
        if ((filtros.FechaFin.Date - filtros.FechaInicio.Date).TotalDays > 366)
        {
            throw new ArgumentException("El rango de fechas no puede ser superior a 1 año (365 días) para optimizar el rendimiento de la consulta en Central Datos.");
        }

        // 1. Normalización de fechas (rango completo desde 00:00:00 hasta 23:59:59)
        var fInicio = filtros.FechaInicio.Date;
        var fFin = filtros.FechaFin.Date.AddDays(1).AddTicks(-1);

        // 2. Mapeo de sociedad
        string? codEmpresa = filtros.Sociedad?.ToUpperInvariant() switch
        {
            "TSA" => "01",
            "CAL" => "03",
            _ => null
        };

        // 3. Normalización de lista de estaciones
        var estaciones = (filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0 && !filtros.CodEstaciones.Contains("TODAS"))
            ? filtros.CodEstaciones
            : null;

        // 4. Consulta a Base de Datos Oracle
        var datos = await _repository.ObtenerNumeroInspeccionesAsync(fInicio, fFin, codEmpresa, estaciones, cancellationToken);

        // 5. Cálculos analíticos centrales en el servidor (Thin Client)
        var totalInspeccionesGlobal = datos.Sum(x => x.TotalInspecciones);
        var totalFavorablesGlobal = datos.Sum(x => x.TotalFavorables);
        var totalRechazadasGlobal = datos.Sum(x => x.TotalRechazadas);
        var totalFase1Global = datos.Sum(x => x.TotalFase1);
        var totalFase2Global = datos.Sum(x => x.TotalFase2);

        var porcentajeRechazoGlobal = totalInspeccionesGlobal > 0
            ? Math.Round((decimal)totalRechazadasGlobal / totalInspeccionesGlobal * 100m, 2)
            : 0.00m;

        var porcentajeFavorablesGlobal = totalInspeccionesGlobal > 0
            ? Math.Round((decimal)totalFavorablesGlobal / totalInspeccionesGlobal * 100m, 2)
            : 0.00m;

        var estacionLider = datos
            .Where(x => x.TotalInspecciones > 0)
            .OrderByDescending(x => x.TotalInspecciones)
            .FirstOrDefault();

        // 6. Generación de KPI Cards
        var kpis = new List<ReportKpiDto>
        {
            new(
                "total_inspecciones",
                "Total Inspecciones",
                totalInspeccionesGlobal.ToString("N0", CultureEs),
                $"{datos.Count} estaciones analizadas",
                "primary",
                "🚗"
            ),
            new(
                "favorables_global",
                "Inspecciones Favorables",
                totalFavorablesGlobal.ToString("N0", CultureEs),
                $"{porcentajeFavorablesGlobal.ToString("N2", CultureEs)}% del volumen total",
                "success",
                "✅"
            ),
            new(
                "rechazadas_global",
                "Inspecciones Rechazadas",
                totalRechazadasGlobal.ToString("N0", CultureEs),
                $"Tasa de rechazo: {porcentajeRechazoGlobal.ToString("N2", CultureEs)}%",
                "danger",
                "⚠️"
            ),
            new(
                "estacion_top",
                "Mayor Volumen de Inspecciones",
                estacionLider != null ? LimpiarNombre(estacionLider.DesEstacion) : "N/D",
                estacionLider != null ? $"{estacionLider.TotalInspecciones.ToString("N0", CultureEs)} insp." : null,
                "primary",
                "🏆"
            )
        };

        // 7. Puntos para Gráficos
        var graficoBarras = datos
            .OrderByDescending(x => x.TotalInspecciones)
            .Select(x => new ReportGraficoPointDto(
                x.CodEstacion,
                $"{x.CodEstacion} {LimpiarNombre(x.DesEstacion)}",
                x.TotalInspecciones,
                $"{x.TotalInspecciones.ToString("N0", CultureEs)} insp.",
                x.ClaveSociedad,
                x.ClaveSociedad == "CAL" ? "#00875a" : "#0046ad"
            ))
            .ToList();

        var fav1 = datos.Sum(x => x.Favorables1);
        var rech1 = datos.Sum(x => x.Rechazadas1);
        var fav2 = datos.Sum(x => x.Favorables2);
        var rech2 = datos.Sum(x => x.Rechazadas2);

        var graficoCuota = new List<ReportGraficoPointDto>
        {
            new("fav1", "Fase 1 Favorables", fav1, $"{fav1.ToString("N0", CultureEs)} insp.", "Fase 1", "#0046ad"),
            new("rech1", "Fase 1 Rechazadas", rech1, $"{rech1.ToString("N0", CultureEs)} insp.", "Fase 1", "#d32f2f"),
            new("fav2", "Fase 2 Favorables", fav2, $"{fav2.ToString("N0", CultureEs)} insp.", "Fase 2", "#0288d1"),
            new("rech2", "Fase 2 Rechazadas", rech2, $"{rech2.ToString("N0", CultureEs)} insp.", "Fase 2", "#ed6c02")
        };

        // 8. Filas del Grid
        var filas = datos
            .OrderBy(x => x.CodEmpresa)
            .ThenBy(x => x.DesEstacion)
            .Select(x => new FilaNumeroInspeccionesDto(
                x.CodEstacion,
                x.DesEstacion,
                x.CodEmpresa,
                x.NombreEmpresa,
                x.ClaveSociedad,
                x.Favorables1,
                x.Favorables1.ToString("N0", CultureEs),
                x.Rechazadas1,
                x.Rechazadas1.ToString("N0", CultureEs),
                x.TotalFase1,
                x.TotalFase1.ToString("N0", CultureEs),
                x.PorcentajeRechazoFase1,
                $"{x.PorcentajeRechazoFase1.ToString("N2", CultureEs)} %",
                x.Favorables2,
                x.Favorables2.ToString("N0", CultureEs),
                x.Rechazadas2,
                x.Rechazadas2.ToString("N0", CultureEs),
                x.TotalFase2,
                x.TotalFase2.ToString("N0", CultureEs),
                x.PorcentajeRechazoFase2,
                $"{x.PorcentajeRechazoFase2.ToString("N2", CultureEs)} %",
                x.TotalFavorables,
                x.TotalFavorables.ToString("N0", CultureEs),
                x.TotalRechazadas,
                x.TotalRechazadas.ToString("N0", CultureEs),
                x.TotalInspecciones,
                x.TotalInspecciones.ToString("N0", CultureEs),
                x.PorcentajeRechazoGlobal,
                $"{x.PorcentajeRechazoGlobal.ToString("N2", CultureEs)} %"
            ))
            .ToList();

        return new InformeNumeroInspeccionesResponseDto(
            kpis,
            graficoBarras,
            graficoCuota,
            filas,
            totalInspeccionesGlobal,
            totalInspeccionesGlobal.ToString("N0", CultureEs),
            totalFavorablesGlobal,
            totalFavorablesGlobal.ToString("N0", CultureEs),
            totalRechazadasGlobal,
            totalRechazadasGlobal.ToString("N0", CultureEs),
            porcentajeRechazoGlobal,
            $"{porcentajeRechazoGlobal.ToString("N2", CultureEs)} %",
            totalFase1Global,
            totalFase2Global,
            datos.Count
        );
    }

    public async Task<byte[]> GenerarExportacionNumeroInspeccionesCsvAsync(
        FiltrosNumeroInspeccionesRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeNumeroInspeccionesAsync(filtros, cancellationToken);
        var sb = new StringBuilder();

        // Cabeceras oficiales en español
        sb.AppendLine("\"Código\";\"Estación\";\"Sociedad\";\"Fase 1 Fav.\";\"Fase 1 Rech.\";\"Fase 1 Total\";\"% Rech. F1\";\"Fase 2 Fav.\";\"Fase 2 Rech.\";\"Fase 2 Total\";\"% Rech. F2\";\"Total Fav.\";\"Total Rech.\";\"Total Insp.\";\"% Rech. Global\"");

        foreach (var fila in informe.Filas)
        {
            sb.AppendLine(string.Format(
                CultureEs,
                "\"{0}\";\"{1}\";\"{2}\";{3};{4};{5};{6:F2}%;{7};{8};{9};{10:F2}%;{11};{12};{13};{14:F2}%",
                fila.CodEstacion,
                fila.DesEstacion.Replace("\"", "\"\""),
                fila.NombreEmpresa.Replace("\"", "\"\""),
                fila.Favorables1,
                fila.Rechazadas1,
                fila.TotalFase1,
                fila.PorcentajeRechazoFase1,
                fila.Favorables2,
                fila.Rechazadas2,
                fila.TotalFase2,
                fila.PorcentajeRechazoFase2,
                fila.TotalFavorables,
                fila.TotalRechazadas,
                fila.TotalInspecciones,
                fila.PorcentajeRechazoGlobal
            ));
        }

        // Fila de Totales Generales
        var totalF1Fav = informe.Filas.Sum(x => x.Favorables1);
        var totalF1Rech = informe.Filas.Sum(x => x.Rechazadas1);
        var totalF1Tot = informe.Filas.Sum(x => x.TotalFase1);
        var totalF1Pct = totalF1Tot > 0 ? (decimal)totalF1Rech / totalF1Tot * 100m : 0m;

        var totalF2Fav = informe.Filas.Sum(x => x.Favorables2);
        var totalF2Rech = informe.Filas.Sum(x => x.Rechazadas2);
        var totalF2Tot = informe.Filas.Sum(x => x.TotalFase2);
        var totalF2Pct = totalF2Tot > 0 ? (decimal)totalF2Rech / totalF2Tot * 100m : 0m;

        sb.AppendLine(string.Format(
            CultureEs,
            "\"TOTALES\";\"Red de {0} Estaciones\";\"-\";{1};{2};{3};{4:F2}%;{5};{6};{7};{8:F2}%;{9};{10};{11};{12:F2}%",
            informe.TotalEstaciones,
            totalF1Fav,
            totalF1Rech,
            totalF1Tot,
            totalF1Pct,
            totalF2Fav,
            totalF2Rech,
            totalF2Tot,
            totalF2Pct,
            informe.TotalFavorablesGlobal,
            informe.TotalRechazadasGlobal,
            informe.TotalInspeccionesGlobal,
            informe.PorcentajeRechazoGlobal
        ));

        // UTF-8 con BOM
        var bom = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var resultado = new byte[bom.Length + bytes.Length];
        Buffer.BlockCopy(bom, 0, resultado, 0, bom.Length);
        Buffer.BlockCopy(bytes, 0, resultado, bom.Length, bytes.Length);

        return resultado;
    }

    private static string LimpiarNombre(string des)
    {
        return des.Replace("I.T.V. - ", "").Replace("I.T.V. ", "").Trim();
    }
}

