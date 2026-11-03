using System.Globalization;
using ClosedXML.Excel;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Informes.Services;

public class InformesFacturacionComparativaService : IInformesFacturacionComparativaService
{
    private readonly IInformesRepository _repository;
    private readonly ILogger<InformesFacturacionComparativaService> _logger;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesFacturacionComparativaService(
        IInformesRepository repository,
        ILogger<InformesFacturacionComparativaService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<InformeFacturacionComparativaResponseDto> GenerarInformeFacturacionComparativaAsync(
        FiltrosFacturacionComparativaRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var datos = await _repository.ObtenerFacturacionComparativaAsync(
            filtros.FechaInicioRango1,
            filtros.FechaFinRango1,
            filtros.FechaInicioRango2,
            filtros.FechaFinRango2,
            filtros.CodigosEstaciones,
            cancellationToken);

        string rango1Label = $"{filtros.FechaInicioRango1:dd/MM/yyyy} - {filtros.FechaFinRango1:dd/MM/yyyy}";
        string rango2Label = $"{filtros.FechaInicioRango2:dd/MM/yyyy} - {filtros.FechaFinRango2:dd/MM/yyyy}";

        // Agrupación por estación garantizando AISLAMIENTO (sin bug de arrastre) y sociedad oficial (Burgos 09xx = CAL)
        var estacionesAgrupadas = datos
            .GroupBy(d =>
            {
                string cod = (d.CodEstacion ?? "").Trim().PadLeft(4, '0');
                bool esCal = cod.StartsWith("09") || new[] { "0902", "0903", "0906", "0908" }.Contains(cod);
                string sociedad = esCal ? "CAL" : "TSA";
                return new { CodEstacion = cod, d.DesEstacion, ClaveSociedad = sociedad };
            })
            .Select(g =>
            {
                var r1 = g.FirstOrDefault(x => x.RangoId == 1);
                var r2 = g.FirstOrDefault(x => x.RangoId == 2);

                int insp1 = r1?.TotalInspecciones ?? 0;
                decimal ing1 = r1?.TotalIngresos ?? 0.00m;
                int insp2 = r2?.TotalInspecciones ?? 0;
                decimal ing2 = r2?.TotalIngresos ?? 0.00m;

                decimal media1 = insp1 > 0 ? Math.Round(ing1 / insp1, 2) : 0.00m;
                decimal media2 = insp2 > 0 ? Math.Round(ing2 / insp2, 2) : 0.00m;

                int difInsp = insp2 - insp1;
                decimal pctInsp = insp1 > 0 ? Math.Round(((decimal)difInsp / insp1) * 100m, 2) : 0.00m;

                decimal difIng = ing2 - ing1;
                decimal pctIng = ing1 > 0 ? Math.Round((difIng / ing1) * 100m, 2) : 0.00m;

                return new FilaFacturacionComparativaDto(
                    g.Key.CodEstacion,
                    g.Key.DesEstacion,
                    g.Key.ClaveSociedad,
                    insp1,
                    ing1,
                    ing1.ToString("N2", CultureEs) + " €",
                    media1,
                    media1.ToString("N2", CultureEs) + " €",
                    insp2,
                    ing2,
                    ing2.ToString("N2", CultureEs) + " €",
                    media2,
                    media2.ToString("N2", CultureEs) + " €",
                    difInsp,
                    (difInsp >= 0 ? "+" : "") + difInsp.ToString("N0", CultureEs),
                    pctInsp,
                    (pctInsp >= 0 ? "+" : "") + pctInsp.ToString("F2", CultureEs) + " %",
                    difIng,
                    (difIng >= 0 ? "+" : "") + difIng.ToString("N2", CultureEs) + " €",
                    pctIng,
                    (pctIng >= 0 ? "+" : "") + pctIng.ToString("F2", CultureEs) + " %"
                );
            })
            .OrderBy(f => f.Sociedad)
            .ThenBy(f => f.DesEstacion)
            .ToList();

        // Filtrado por sociedad si se solicitó
        if (!string.IsNullOrWhiteSpace(filtros.Sociedad) && filtros.Sociedad != "TODAS")
        {
            estacionesAgrupadas = estacionesAgrupadas
                .Where(f => string.Equals(f.Sociedad, filtros.Sociedad, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        // Totales por Sociedad (TSA y CAL)
        var totalesSociedad = estacionesAgrupadas
            .GroupBy(f => f.Sociedad)
            .Select(g =>
            {
                int totInsp1 = g.Sum(x => x.TotalInspecciones1);
                decimal totIng1 = g.Sum(x => x.TotalIngresos1);
                int totInsp2 = g.Sum(x => x.TotalInspecciones2);
                decimal totIng2 = g.Sum(x => x.TotalIngresos2);

                decimal difIng = totIng2 - totIng1;
                decimal pctIng = totIng1 > 0 ? Math.Round((difIng / totIng1) * 100m, 2) : 0.00m;

                int difInsp = totInsp2 - totInsp1;
                decimal pctInsp = totInsp1 > 0 ? Math.Round(((decimal)difInsp / totInsp1) * 100m, 2) : 0.00m;

                return new TotalesSociedadFacturacionDto(
                    g.Key,
                    totInsp1,
                    totIng1,
                    totIng1.ToString("N2", CultureEs) + " €",
                    totInsp2,
                    totIng2,
                    totIng2.ToString("N2", CultureEs) + " €",
                    difIng,
                    (difIng >= 0 ? "+" : "") + difIng.ToString("N2", CultureEs) + " €",
                    pctIng,
                    (pctIng >= 0 ? "+" : "") + pctIng.ToString("F2", CultureEs) + " %",
                    difInsp,
                    (difInsp >= 0 ? "+" : "") + difInsp.ToString("N0", CultureEs),
                    pctInsp,
                    (pctInsp >= 0 ? "+" : "") + pctInsp.ToString("F2", CultureEs) + " %"
                );
            })
            .OrderBy(s => s.Sociedad)
            .ToList();

        // Total Global
        int globInsp1 = estacionesAgrupadas.Sum(x => x.TotalInspecciones1);
        decimal globIng1 = estacionesAgrupadas.Sum(x => x.TotalIngresos1);
        int globInsp2 = estacionesAgrupadas.Sum(x => x.TotalInspecciones2);
        decimal globIng2 = estacionesAgrupadas.Sum(x => x.TotalIngresos2);

        decimal globDifIng = globIng2 - globIng1;
        decimal globPctIng = globIng1 > 0 ? Math.Round((globDifIng / globIng1) * 100m, 2) : 0.00m;

        int globDifInsp = globInsp2 - globInsp1;
        decimal globPctInsp = globInsp1 > 0 ? Math.Round(((decimal)globDifInsp / globInsp1) * 100m, 2) : 0.00m;

        var totalGlobal = new TotalesSociedadFacturacionDto(
            "TOTAL GLOBAL",
            globInsp1,
            globIng1,
            globIng1.ToString("N2", CultureEs) + " €",
            globInsp2,
            globIng2,
            globIng2.ToString("N2", CultureEs) + " €",
            globDifIng,
            (globDifIng >= 0 ? "+" : "") + globDifIng.ToString("N2", CultureEs) + " €",
            globPctIng,
            (globPctIng >= 0 ? "+" : "") + globPctIng.ToString("F2", CultureEs) + " %",
            globDifInsp,
            (globDifInsp >= 0 ? "+" : "") + globDifInsp.ToString("N0", CultureEs),
            globPctInsp,
            (globPctInsp >= 0 ? "+" : "") + globPctInsp.ToString("F2", CultureEs) + " %"
        );

        // Tarjetas KPIs con referencias explícitas a los años comparados
        decimal mediaGlobal1 = globInsp1 > 0 ? Math.Round(globIng1 / globInsp1, 2) : 0.00m;
        decimal mediaGlobal2 = globInsp2 > 0 ? Math.Round(globIng2 / globInsp2, 2) : 0.00m;
        decimal difMedia = mediaGlobal2 - mediaGlobal1;

        string anyoR1 = filtros.FechaInicioRango1.Year == filtros.FechaFinRango1.Year ? filtros.FechaInicioRango1.Year.ToString() : $"{filtros.FechaInicioRango1:yyyy}-{filtros.FechaFinRango1:yy}";
        string anyoR2 = filtros.FechaInicioRango2.Year == filtros.FechaFinRango2.Year ? filtros.FechaInicioRango2.Year.ToString() : $"{filtros.FechaInicioRango2:yyyy}-{filtros.FechaFinRango2:yy}";

        var kpis = new List<KpiFacturacionComparativaDto>
        {
            new(
                "total-ingresos-r2",
                $"Facturación {anyoR2} (P2)",
                globIng2.ToString("N2", CultureEs) + " €",
                $"{anyoR1}: {globIng1.ToString("N2", CultureEs)} € | Var: {(globDifIng >= 0 ? "+" : "")}{globDifIng.ToString("N2", CultureEs)} € ({(globPctIng >= 0 ? "+" : "")}{globPctIng:F2}%)",
                globDifIng >= 0 ? "success" : "danger",
                "💶",
                globPctIng
            ),
            new(
                "total-inspecciones-r2",
                $"Inspecciones {anyoR2} (P2)",
                globInsp2.ToString("N0", CultureEs),
                $"{anyoR1}: {globInsp1.ToString("N0", CultureEs)} | Var: {(globDifInsp >= 0 ? "+" : "")}{globDifInsp.ToString("N0", CultureEs)} ({(globPctInsp >= 0 ? "+" : "")}{globPctInsp:F2}%)",
                globDifInsp >= 0 ? "success" : "danger",
                "🚗",
                globPctInsp
            ),
            new(
                "ingreso-medio-r2",
                $"Ingreso Medio {anyoR2}",
                mediaGlobal2.ToString("N2", CultureEs) + " €/insp",
                $"{anyoR1}: {mediaGlobal1.ToString("N2", CultureEs)} € | Var: {(difMedia >= 0 ? "+" : "")}{difMedia:F2} €",
                difMedia >= 0 ? "primary" : "neutral",
                "📊",
                mediaGlobal1 > 0 ? Math.Round((difMedia / mediaGlobal1) * 100m, 2) : null
            ),
            new(
                "total-estaciones",
                "Centros Comparados",
                estacionesAgrupadas.Count.ToString("N0", CultureEs) + " ITV",
                $"{totalesSociedad.Count} sociedades analizadas (TSA y CAL)",
                "neutral",
                "🏢"
            )
        };

        // Gráfico comparativo por estación (top diferencias o todas)
        var grafico = estacionesAgrupadas
            .Select(f => new GraficoFacturacionComparativaDto(
                f.CodEstacion,
                f.DesEstacion,
                f.Sociedad,
                f.TotalInspecciones1,
                f.TotalInspecciones2,
                f.TotalIngresos1,
                f.TotalIngresos2,
                f.TotalIngresos1Formatted,
                f.TotalIngresos2Formatted,
                f.PorcentajeDifIngresos
            ))
            .ToList();

        return new InformeFacturacionComparativaResponseDto(
            rango1Label,
            rango2Label,
            estacionesAgrupadas,
            estacionesAgrupadas.Count,
            totalesSociedad,
            totalGlobal,
            kpis,
            grafico
        );
    }

    public async Task<byte[]> GenerarExportacionFacturacionComparativaExcelAsync(
        FiltrosFacturacionComparativaRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeFacturacionComparativaAsync(filtros, cancellationToken);

        // Buscar plantilla base en directorio de salida
        var appBaseDir = AppDomain.CurrentDomain.BaseDirectory;
        var plantillaPath = Path.Combine(appBaseDir, "Templates", "Plantilla_Informe_Facturacion.xlsx");

        if (File.Exists(plantillaPath))
        {
            return GenerarExcelDesdePlantilla(plantillaPath, filtros, informe);
        }

        // Si no se encuentra en el directorio de salida, buscar en directorio de proyecto
        var fallbackPath = Path.GetFullPath(Path.Combine(appBaseDir, "..", "..", "..", "..", "CentralDatos.Infrastructure", "Templates", "Plantilla_Informe_Facturacion.xlsx"));
        if (File.Exists(fallbackPath))
        {
            return GenerarExcelDesdePlantilla(fallbackPath, filtros, informe);
        }

        _logger.LogWarning("Plantilla de facturación no encontrada en {Path}. Generando Excel dinámico con ClosedXML.", plantillaPath);
        return GenerarExcelDinamico(filtros, informe);
    }

    private byte[] GenerarExcelDesdePlantilla(
        string plantillaPath,
        FiltrosFacturacionComparativaRequestDto filtros,
        InformeFacturacionComparativaResponseDto informe)
    {
        using var workbook = new XLWorkbook(plantillaPath);
        var ws = workbook.Worksheets.FirstOrDefault(w => w.Name == "Hoja1") ?? workbook.Worksheet(1);

        // Cabeceras de fechas en fila 2 y 3
        string anyo1 = filtros.FechaInicioRango1.Year.ToString();
        string anyo2 = filtros.FechaInicioRango2.Year.ToString();
        string rangoFechas1 = $"{filtros.FechaInicioRango1:dd/MM} - {filtros.FechaFinRango1:dd/MM}";
        string rangoFechas2 = $"{filtros.FechaInicioRango2:dd/MM} - {filtros.FechaFinRango2:dd/MM}";

        ws.Cell(2, 4).SetValue(anyo1);
        ws.Cell(3, 4).SetValue(rangoFechas1);
        ws.Cell(2, 6).SetValue(anyo2);
        ws.Cell(3, 6).SetValue(rangoFechas2);

        // Diccionario por nombre de estación normalizado
        var dictPorNombre = informe.Filas.ToDictionary(
            f => NormalizarNombreEstacion(f.DesEstacion),
            f => f,
            StringComparer.OrdinalIgnoreCase
        );

        int ultimaFila = ws.LastRowUsed()?.RowNumber() ?? 53;

        // Recorrido de filas: CORRECCIÓN AL BUG DE ARRASTRE
        // En cada iteración asignamos explícitamente los valores correspondientes. Si la estación no tiene datos, se setea 0.00m y 0.
        for (int fila = 5; fila <= ultimaFila; fila++)
        {
            string celdaNombre = ws.Cell(fila, 3).GetString().Trim();
            if (string.IsNullOrEmpty(celdaNombre)) continue;

            string nombreNorm = NormalizarNombreEstacion(celdaNombre);

            if (dictPorNombre.TryGetValue(nombreNorm, out var datoEstacion))
            {
                ws.Cell(fila, 4).SetValue(datoEstacion.TotalIngresos1);
                ws.Cell(fila, 5).SetValue(datoEstacion.TotalInspecciones1);
                ws.Cell(fila, 6).SetValue(datoEstacion.TotalIngresos2);
                ws.Cell(fila, 7).SetValue(datoEstacion.TotalInspecciones2);
            }
            else
            {
                // Limpieza explícita: NUNCA arrastra datos de la estación anterior
                ws.Cell(fila, 4).SetValue(0.00m);
                ws.Cell(fila, 5).SetValue(0);
                ws.Cell(fila, 6).SetValue(0.00m);
                ws.Cell(fila, 7).SetValue(0);
            }
        }

        // Recalcular fórmulas de Excel (sumas de CC.AA, totales TSA/CAL y % variaciones)
        ws.RecalculateAllFormulas();

        using var memoryStream = new MemoryStream();
        workbook.SaveAs(memoryStream);
        return memoryStream.ToArray();
    }

    private byte[] GenerarExcelDinamico(
        FiltrosFacturacionComparativaRequestDto filtros,
        InformeFacturacionComparativaResponseDto informe)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Facturación Comparativa");

        ws.Cell(1, 1).SetValue("INFORME COMPARATIVO DE FACTURACIÓN E INSPECCIONES (TSA / CAL)");
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;

        ws.Cell(2, 1).SetValue($"Periodo 1: {informe.Rango1Label}  |  Periodo 2: {informe.Rango2Label}");
        ws.Cell(2, 1).Style.Font.Italic = true;

        int row = 4;
        string[] headers = [
            "Código", "Estación", "Sociedad",
            "Ingresos P1 (€)", "Inspecciones P1", "Media P1 (€)",
            "Ingresos P2 (€)", "Inspecciones P2", "Media P2 (€)",
            "Dif. Ingresos (€)", "Var. % Ingresos",
            "Dif. Inspecciones", "Var. % Inspecciones"
        ];

        for (int c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(row, c + 1);
            cell.SetValue(headers[c]);
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#002C6C");
            cell.Style.Font.FontColor = XLColor.White;
        }

        row++;
        foreach (var f in informe.Filas)
        {
            ws.Cell(row, 1).SetValue(f.CodEstacion);
            ws.Cell(row, 2).SetValue(f.DesEstacion);
            ws.Cell(row, 3).SetValue(f.Sociedad);

            ws.Cell(row, 4).SetValue(f.TotalIngresos1);
            ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0.00 €";
            ws.Cell(row, 5).SetValue(f.TotalInspecciones1);
            ws.Cell(row, 5).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 6).SetValue(f.MediaIngreso1);
            ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0.00 €";

            ws.Cell(row, 7).SetValue(f.TotalIngresos2);
            ws.Cell(row, 7).Style.NumberFormat.Format = "#,##0.00 €";
            ws.Cell(row, 8).SetValue(f.TotalInspecciones2);
            ws.Cell(row, 8).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 9).SetValue(f.MediaIngreso2);
            ws.Cell(row, 9).Style.NumberFormat.Format = "#,##0.00 €";

            ws.Cell(row, 10).SetValue(f.DifIngresos);
            ws.Cell(row, 10).Style.NumberFormat.Format = "#,##0.00 €";
            ws.Cell(row, 11).SetValue(f.PorcentajeDifIngresos / 100m);
            ws.Cell(row, 11).Style.NumberFormat.Format = "+0.00%;-0.00%;0.00%";

            ws.Cell(row, 12).SetValue(f.DifInspecciones);
            ws.Cell(row, 12).Style.NumberFormat.Format = "#,##0";
            ws.Cell(row, 13).SetValue(f.PorcentajeDifInspecciones / 100m);
            ws.Cell(row, 13).Style.NumberFormat.Format = "+0.00%;-0.00%;0.00%";

            row++;
        }

        // Fila Total Global
        ws.Cell(row, 2).SetValue("TOTAL GLOBAL");
        ws.Cell(row, 2).Style.Font.Bold = true;
        ws.Cell(row, 4).SetValue(informe.TotalGlobal.TotalIngresos1);
        ws.Cell(row, 4).Style.NumberFormat.Format = "#,##0.00 €";
        ws.Cell(row, 4).Style.Font.Bold = true;
        ws.Cell(row, 5).SetValue(informe.TotalGlobal.TotalInspecciones1);
        ws.Cell(row, 5).Style.Font.Bold = true;
        ws.Cell(row, 7).SetValue(informe.TotalGlobal.TotalIngresos2);
        ws.Cell(row, 7).Style.NumberFormat.Format = "#,##0.00 €";
        ws.Cell(row, 7).Style.Font.Bold = true;
        ws.Cell(row, 8).SetValue(informe.TotalGlobal.TotalInspecciones2);
        ws.Cell(row, 8).Style.Font.Bold = true;
        ws.Cell(row, 10).SetValue(informe.TotalGlobal.DifIngresos);
        ws.Cell(row, 10).Style.NumberFormat.Format = "#,##0.00 €";
        ws.Cell(row, 10).Style.Font.Bold = true;
        ws.Cell(row, 11).SetValue(informe.TotalGlobal.PorcentajeDifIngresos / 100m);
        ws.Cell(row, 11).Style.NumberFormat.Format = "+0.00%;-0.00%;0.00%";
        ws.Cell(row, 11).Style.Font.Bold = true;

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static string NormalizarNombreEstacion(string nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre)) return string.Empty;

        return nombre
            .Trim()
            .ToUpperInvariant()
            .Replace("Á", "A")
            .Replace("É", "E")
            .Replace("Í", "I")
            .Replace("Ó", "O")
            .Replace("Ú", "U")
            .Replace("I.T.V. - ", "")
            .Replace("ITV - ", "")
            .Replace("CUATRO VIENTOS COPIA", "CUATRO VIENTOS")
            .Replace("BORGES BLANQUES", "LES BORGES")
            .Replace("MIRANDA DE EBRO", "MIRANDA")
            .Replace("VILLALBA", "C. VILLALBA")
            .Replace("VILLASANTE DE MONTIJA", "VILLASANTE");
    }
}
