using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ClosedXML.Excel;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Services;

public class InformesInspRangoHorarioService : IInformesInspRangoHorarioService
{
    private readonly IInformesRepository _repository;

    private static readonly string[] DiasSemanaNombres = { "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado" };
    private static readonly string[] Horas = { "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21" };

    public InformesInspRangoHorarioService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InspRangoHorarioResponseDto> ObtenerInformeAsync(
        InspRangoHorarioFiltroDto filtro,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ReportDateRangeValidator.Validar(filtro.FechaInicio, filtro.FechaFin);

        string? codEmpresa = filtro.Sociedad?.Trim().ToUpperInvariant() switch
        {
            "TSA" or "01" => "01",
            "CAL" or "03" => "03",
            _ => null
        };

        var estaciones = (filtro.Estaciones != null && filtro.Estaciones.Count > 0 && !filtro.Estaciones.Contains("TODAS"))
            ? filtro.Estaciones
            : null;

        var datos = await _repository.ObtenerInspRangoHorarioAsync(
            fInicio,
            fFin,
            codEmpresa,
            estaciones,
            filtro.Fase,
            cancellationToken);

        // Agrupar por Fecha (consolidado de todas las estaciones seleccionadas)
        var agrupadoPorFecha = datos
            .GroupBy(d => d.Fecha.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var fecha = g.Key;
                var diaSemana = ObtenerNombreDiaSemana(fecha);
                var f = new InspRangoHorarioFilaDto
                {
                    Fecha = fecha,
                    FechaFormatted = fecha.ToString("dd/MM/yyyy"),
                    DiaSemana = diaSemana,
                    H06 = g.Sum(x => x.H06),
                    H07 = g.Sum(x => x.H07),
                    H08 = g.Sum(x => x.H08),
                    H09 = g.Sum(x => x.H09),
                    H10 = g.Sum(x => x.H10),
                    H11 = g.Sum(x => x.H11),
                    H12 = g.Sum(x => x.H12),
                    H13 = g.Sum(x => x.H13),
                    H14 = g.Sum(x => x.H14),
                    H15 = g.Sum(x => x.H15),
                    H16 = g.Sum(x => x.H16),
                    H17 = g.Sum(x => x.H17),
                    H18 = g.Sum(x => x.H18),
                    H19 = g.Sum(x => x.H19),
                    H20 = g.Sum(x => x.H20),
                    H21 = g.Sum(x => x.H21),
                };
                f.TotalFila = f.H06 + f.H07 + f.H08 + f.H09 + f.H10 + f.H11 + f.H12 + f.H13 +
                              f.H14 + f.H15 + f.H16 + f.H17 + f.H18 + f.H19 + f.H20 + f.H21;
                return f;
            })
            .ToList();

        var totalInspecciones = agrupadoPorFecha.Sum(f => f.TotalFila);

        // Totales por hora (acumulado en todo el periodo)
        var horasMap = new Dictionary<string, int>
        {
            ["06"] = agrupadoPorFecha.Sum(f => f.H06),
            ["07"] = agrupadoPorFecha.Sum(f => f.H07),
            ["08"] = agrupadoPorFecha.Sum(f => f.H08),
            ["09"] = agrupadoPorFecha.Sum(f => f.H09),
            ["10"] = agrupadoPorFecha.Sum(f => f.H10),
            ["11"] = agrupadoPorFecha.Sum(f => f.H11),
            ["12"] = agrupadoPorFecha.Sum(f => f.H12),
            ["13"] = agrupadoPorFecha.Sum(f => f.H13),
            ["14"] = agrupadoPorFecha.Sum(f => f.H14),
            ["15"] = agrupadoPorFecha.Sum(f => f.H15),
            ["16"] = agrupadoPorFecha.Sum(f => f.H16),
            ["17"] = agrupadoPorFecha.Sum(f => f.H17),
            ["18"] = agrupadoPorFecha.Sum(f => f.H18),
            ["19"] = agrupadoPorFecha.Sum(f => f.H19),
            ["20"] = agrupadoPorFecha.Sum(f => f.H20),
            ["21"] = agrupadoPorFecha.Sum(f => f.H21),
        };

        var horaPuntaEntry = horasMap.OrderByDescending(x => x.Value).FirstOrDefault();
        var horaPuntaStr = horaPuntaEntry.Value > 0
            ? $"{horaPuntaEntry.Key}:00 h ({horaPuntaEntry.Value:N0} insp.)"
            : "-";

        // Totales por día de la semana
        var diasMap = agrupadoPorFecha
            .GroupBy(f => f.DiaSemana)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.TotalFila));

        var diaPuntaEntry = diasMap.OrderByDescending(x => x.Value).FirstOrDefault();
        var diaPuntaStr = diaPuntaEntry.Value > 0
            ? $"{diaPuntaEntry.Key} ({diaPuntaEntry.Value:N0} insp.)"
            : "-";

        var totalHorasConCarga = horasMap.Count(h => h.Value > 0);
        var totalDias = agrupadoPorFecha.Count;
        var promedioPorHora = (totalDias > 0 && totalHorasConCarga > 0)
            ? Math.Round((double)totalInspecciones / (totalDias * 16), 1)
            : 0;

        // Construir celdas del Heatmap (Día de la semana × Hora)
        var heatmap = new List<HeatmapCeldaDto>();
        for (int d = 0; d < DiasSemanaNombres.Length; d++)
        {
            var diaNombre = DiasSemanaNombres[d];
            var filasDia = agrupadoPorFecha.Where(f => f.DiaSemana == diaNombre).ToList();

            foreach (var h in Horas)
            {
                int cant = h switch
                {
                    "06" => filasDia.Sum(x => x.H06),
                    "07" => filasDia.Sum(x => x.H07),
                    "08" => filasDia.Sum(x => x.H08),
                    "09" => filasDia.Sum(x => x.H09),
                    "10" => filasDia.Sum(x => x.H10),
                    "11" => filasDia.Sum(x => x.H11),
                    "12" => filasDia.Sum(x => x.H12),
                    "13" => filasDia.Sum(x => x.H13),
                    "14" => filasDia.Sum(x => x.H14),
                    "15" => filasDia.Sum(x => x.H15),
                    "16" => filasDia.Sum(x => x.H16),
                    "17" => filasDia.Sum(x => x.H17),
                    "18" => filasDia.Sum(x => x.H18),
                    "19" => filasDia.Sum(x => x.H19),
                    "20" => filasDia.Sum(x => x.H20),
                    "21" => filasDia.Sum(x => x.H21),
                    _ => 0
                };

                double pct = totalInspecciones > 0 ? Math.Round((double)cant / totalInspecciones * 100, 2) : 0;

                heatmap.Add(new HeatmapCeldaDto
                {
                    DiaSemana = diaNombre,
                    DiaNumero = d + 1,
                    Hora = h,
                    Cantidad = cant,
                    Porcentaje = pct
                });
            }
        }

        // Resumen por Estación (para gráficos condicionales y KPI de estación líder)
        var graficoEstaciones = datos
            .GroupBy(d => new { d.CodEstacion, d.DesEstacion, d.ClaveSociedad })
            .Select(g =>
            {
                var tot = g.Sum(x => x.H06 + x.H07 + x.H08 + x.H09 + x.H10 + x.H11 + x.H12 + x.H13 +
                                     x.H14 + x.H15 + x.H16 + x.H17 + x.H18 + x.H19 + x.H20 + x.H21);
                var codStr = g.Key.CodEstacion.ToString().PadLeft(4, '0');
                var des = string.IsNullOrWhiteSpace(g.Key.DesEstacion) ? $"Estación {codStr}" : g.Key.DesEstacion;
                var pct = totalInspecciones > 0 ? Math.Round((double)tot / totalInspecciones * 100, 1) : 0;
                return new GraficoEstacionInspRangoHorarioDto(
                    codStr,
                    des,
                    g.Key.ClaveSociedad,
                    tot,
                    $"{pct:0.0}%",
                    pct
                );
            })
            .OrderByDescending(x => x.TotalInspecciones)
            .ToList();

        // KPIs Ejecutivos
        var kpis = new List<InspRangoHorarioKpiDto>
        {
            new()
            {
                Id = "total-inspecciones",
                Titulo = "Total Inspecciones",
                Valor = totalInspecciones.ToString("N0", new CultureInfo("es-ES")),
                Subtitulo = $"{agrupadoPorFecha.Count} jornadas analizadas",
                Icon = "📊",
                Variant = "neutral"
            },
            new()
            {
                Id = "hora-punta",
                Titulo = "Hora Punta de Demanda",
                Valor = horaPuntaEntry.Value > 0 ? $"{horaPuntaEntry.Key}:00 h" : "-",
                Subtitulo = horaPuntaEntry.Value > 0 ? $"{horaPuntaEntry.Value:N0} inspecciones acumuladas" : "Sin registros",
                Icon = "⏰",
                Variant = "warning"
            },
            new()
            {
                Id = "dia-pico",
                Titulo = "Día con Mayor Afluencia",
                Valor = diaPuntaEntry.Value > 0 ? diaPuntaEntry.Key : "-",
                Subtitulo = diaPuntaEntry.Value > 0 ? $"{diaPuntaEntry.Value:N0} inspecciones totales" : "Sin registros",
                Icon = "📅",
                Variant = "neutral"
            },
            new()
            {
                Id = "promedio-hora",
                Titulo = "Promedio Insp. / Hora",
                Valor = promedioPorHora.ToString("0.0", new CultureInfo("es-ES")),
                Subtitulo = "Por hora activa (06-21 h)",
                Icon = "⚡",
                Variant = "success"
            }
        };

        // KPI Dinámico de Estación: Si hay múltiples estaciones, destaca la estación con mayor demanda
        if (graficoEstaciones.Count > 1 && graficoEstaciones[0].TotalInspecciones > 0)
        {
            var top = graficoEstaciones[0];
            kpis.Add(new InspRangoHorarioKpiDto
            {
                Id = "estacion-demanda",
                Titulo = "Estación Mayor Demanda",
                Valor = top.CodEstacion,
                Subtitulo = $"{top.DesEstacion} ({top.TotalInspecciones:N0} insp. - {top.PctSobreTotal})",
                Icon = "🏢",
                Variant = "primary"
            });
        }

        return new InspRangoHorarioResponseDto
        {
            Kpis = kpis,
            GraficoEstaciones = graficoEstaciones,
            Filas = agrupadoPorFecha,
            Heatmap = heatmap,
            TotalInspecciones = totalInspecciones,
            HoraPunta = horaPuntaStr,
            DiaPunta = diaPuntaStr,
            PromedioPorHora = promedioPorHora
        };
    }

    public async Task<byte[]> GenerarExcelAsync(
        InspRangoHorarioFiltroDto filtro,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ReportDateRangeValidator.Validar(filtro.FechaInicio, filtro.FechaFin);

        string? codEmpresa = filtro.Sociedad?.Trim().ToUpperInvariant() switch
        {
            "TSA" or "01" => "01",
            "CAL" or "03" => "03",
            _ => null
        };

        var estaciones = (filtro.Estaciones != null && filtro.Estaciones.Count > 0 && !filtro.Estaciones.Contains("TODAS"))
            ? filtro.Estaciones
            : null;

        var datos = await _repository.ObtenerInspRangoHorarioAsync(
            fInicio,
            fFin,
            codEmpresa,
            estaciones,
            filtro.Fase,
            cancellationToken);

        using var workbook = new XLWorkbook();

        // 1. Hoja Consolidada de todas las estaciones seleccionadas (31 caracteres exactos, límite de Excel)
        var wsConsolidada = workbook.Worksheets.Add("TOTAL_ESTACIONES_SELECCIONADAS");
        ConstruirHojaRangoHorario(wsConsolidada, datos, filtro);

        // 2. Hojas individuales por Estación (fiel al legacy frmCriterios.vb: INSPECCIONES_ITV_{codEstacion})
        var estacionesGrupos = datos.GroupBy(d => d.CodEstacion).OrderBy(g => g.Key);
        foreach (var grp in estacionesGrupos)
        {
            var codEstStr = grp.Key.ToString().PadLeft(4, '0');
            var sheetName = $"INSPECCIONES_ITV_{codEstStr}";
            if (sheetName.Length > 31) sheetName = sheetName.Substring(0, 31);

            var wsEstacion = workbook.Worksheets.Add(sheetName);
            ConstruirHojaRangoHorario(wsEstacion, grp.ToList(), filtro, codEstStr, grp.FirstOrDefault()?.DesEstacion);
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void ConstruirHojaRangoHorario(
        IXLWorksheet ws,
        IEnumerable<InspRangoHorarioDato> registros,
        InspRangoHorarioFiltroDto filtro,
        string? codEstacion = null,
        string? desEstacion = null)
    {
        // Encabezados exactos de frmCriterios.vb:
        // Columna A (1): FECHA
        // Columnas B a Q (2 a 17): 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21
        // Columna R (18): Total
        ws.Cell(1, 1).Value = "FECHA";
        for (int h = 0; h < Horas.Length; h++)
        {
            ws.Cell(1, h + 2).Value = Horas[h];
        }
        ws.Cell(1, Horas.Length + 2).Value = "Total";

        var headerRange = ws.Range(1, 1, 1, Horas.Length + 2);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(0, 43, 73); // Azul corporativo TÜV SÜD
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        var agrupado = registros
            .GroupBy(r => r.Fecha.Date)
            .OrderBy(g => g.Key)
            .ToList();

        int row = 2;
        foreach (var g in agrupado)
        {
            var fecha = g.Key;
            ws.Cell(row, 1).Value = fecha.ToString("dd/MM/yyyy");

            int h06 = g.Sum(x => x.H06);
            int h07 = g.Sum(x => x.H07);
            int h08 = g.Sum(x => x.H08);
            int h09 = g.Sum(x => x.H09);
            int h10 = g.Sum(x => x.H10);
            int h11 = g.Sum(x => x.H11);
            int h12 = g.Sum(x => x.H12);
            int h13 = g.Sum(x => x.H13);
            int h14 = g.Sum(x => x.H14);
            int h15 = g.Sum(x => x.H15);
            int h16 = g.Sum(x => x.H16);
            int h17 = g.Sum(x => x.H17);
            int h18 = g.Sum(x => x.H18);
            int h19 = g.Sum(x => x.H19);
            int h20 = g.Sum(x => x.H20);
            int h21 = g.Sum(x => x.H21);

            int[] valores = { h06, h07, h08, h09, h10, h11, h12, h13, h14, h15, h16, h17, h18, h19, h20, h21 };
            for (int col = 0; col < valores.Length; col++)
            {
                var cell = ws.Cell(row, col + 2);
                cell.SetValue(valores[col]);
                cell.Style.NumberFormat.Format = "#,##0";
                if (valores[col] == 0) cell.Style.Font.FontColor = XLColor.FromArgb(148, 163, 184);
            }

            // Total fila numérico directo para evitar errores de idioma en Excel (#¿NOMBRE? / #NAME?)
            int filaTotal = valores.Sum();
            var totalCell = ws.Cell(row, Horas.Length + 2);
            totalCell.SetValue(filaTotal);
            totalCell.Style.Font.Bold = true;
            totalCell.Style.NumberFormat.Format = "#,##0";

            row++;
        }

        // Fila final de Totales de columna
        ws.Cell(row, 1).SetValue("Total");
        ws.Cell(row, 1).Style.Font.Bold = true;

        int granTotalAcumulado = 0;
        for (int c = 0; c < Horas.Length; c++)
        {
            int colSum = c switch
            {
                0 => agrupado.Sum(g => g.Sum(x => x.H06)),
                1 => agrupado.Sum(g => g.Sum(x => x.H07)),
                2 => agrupado.Sum(g => g.Sum(x => x.H08)),
                3 => agrupado.Sum(g => g.Sum(x => x.H09)),
                4 => agrupado.Sum(g => g.Sum(x => x.H10)),
                5 => agrupado.Sum(g => g.Sum(x => x.H11)),
                6 => agrupado.Sum(g => g.Sum(x => x.H12)),
                7 => agrupado.Sum(g => g.Sum(x => x.H13)),
                8 => agrupado.Sum(g => g.Sum(x => x.H14)),
                9 => agrupado.Sum(g => g.Sum(x => x.H15)),
                10 => agrupado.Sum(g => g.Sum(x => x.H16)),
                11 => agrupado.Sum(g => g.Sum(x => x.H17)),
                12 => agrupado.Sum(g => g.Sum(x => x.H18)),
                13 => agrupado.Sum(g => g.Sum(x => x.H19)),
                14 => agrupado.Sum(g => g.Sum(x => x.H20)),
                15 => agrupado.Sum(g => g.Sum(x => x.H21)),
                _ => 0
            };
            granTotalAcumulado += colSum;

            var totalColCell = ws.Cell(row, c + 2);
            totalColCell.SetValue(colSum);
            totalColCell.Style.Font.Bold = true;
            totalColCell.Style.NumberFormat.Format = "#,##0";
            totalColCell.Style.Fill.BackgroundColor = XLColor.FromArgb(241, 245, 249);
        }

        var granTotalCell = ws.Cell(row, Horas.Length + 2);
        granTotalCell.SetValue(granTotalAcumulado);
        granTotalCell.Style.Font.Bold = true;
        granTotalCell.Style.NumberFormat.Format = "#,##0";
        granTotalCell.Style.Fill.BackgroundColor = XLColor.FromArgb(226, 232, 240);

        var dataRange = ws.Range(1, 1, row, Horas.Length + 2);
        dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        ws.Columns().AdjustToContents(10.0, 25.0);

        // Bloque de filtros aplicados al pie (fiel a frmCriterios.vb)
        int footerRow = row + 3;
        ws.Cell(footerRow++, 1).Value = "FILTROS APLICADOS:";
        ws.Cell(footerRow - 1, 1).Style.Font.Bold = true;

        ws.Cell(footerRow++, 1).Value = $"Fecha Inicio: {filtro.FechaInicio:dd/MM/yyyy}";
        ws.Cell(footerRow++, 1).Value = $"Fecha Fin: {filtro.FechaFin:dd/MM/yyyy}";
        if (!string.IsNullOrWhiteSpace(codEstacion))
        {
            ws.Cell(footerRow++, 1).Value = $"Estación: {codEstacion} - {desEstacion}";
        }
        else if (filtro.Estaciones != null && filtro.Estaciones.Count > 0)
        {
            ws.Cell(footerRow++, 1).Value = $"Estaciones seleccionadas: {string.Join(", ", filtro.Estaciones)}";
        }
        else
        {
            ws.Cell(footerRow++, 1).Value = "Estaciones: Todas";
        }

        if (!string.IsNullOrWhiteSpace(filtro.Fase))
        {
            ws.Cell(footerRow++, 1).Value = $"Fase: {(filtro.Fase == "1" ? "1ª Inspección (Periódica)" : "2ª Inspección (Reiterada)")}";
        }
    }

    private static string ObtenerNombreDiaSemana(DateTime fecha)
    {
        return fecha.DayOfWeek switch
        {
            DayOfWeek.Monday => "Lunes",
            DayOfWeek.Tuesday => "Martes",
            DayOfWeek.Wednesday => "Miércoles",
            DayOfWeek.Thursday => "Jueves",
            DayOfWeek.Friday => "Viernes",
            DayOfWeek.Saturday => "Sábado",
            DayOfWeek.Sunday => "Domingo",
            _ => "-"
        };
    }
}
