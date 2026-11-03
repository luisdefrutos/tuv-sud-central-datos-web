using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;
using ClosedXML.Excel;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Informes.Services;

public class InformesVolumenDefectosService : IInformesVolumenDefectosService
{
    private readonly IInformesRepository _repository;
    private readonly ILogger<InformesVolumenDefectosService> _logger;

    public InformesVolumenDefectosService(
        IInformesRepository repository,
        ILogger<InformesVolumenDefectosService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<VolumenDefectosResponseDto> ObtenerInformeAsync(
        VolumenDefectosFiltroDto filtro,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtro.FechaInicio, filtro.FechaFin);

        string? codEmpresa = filtro.Sociedad?.Trim().ToUpperInvariant() switch
        {
            "TSA" or "01" => "01",
            "CAL" or "03" => "03",
            _ => null
        };

        var datos = await _repository.ObtenerVolumenDefectosAsync(
            filtro.FechaInicio,
            filtro.FechaFin,
            codEmpresa,
            filtro.Estaciones,
            filtro.Bloque,
            filtro.Defecto,
            cancellationToken);

        int totalDefectos = datos.Sum(d => d.NumDefectos);
        int totalLeves = datos.Where(d => d.Gravedad == "L").Sum(d => d.NumDefectos);
        int totalGraves = datos.Where(d => d.Gravedad == "G").Sum(d => d.NumDefectos);
        int totalMuyGraves = datos.Where(d => d.Gravedad == "MG").Sum(d => d.NumDefectos);

        var filasDto = datos.Select(d =>
        {
            double pct = totalDefectos > 0 ? Math.Round((double)d.NumDefectos / totalDefectos * 100, 2) : 0;
            return new VolumenDefectosFilaDto
            {
                CodEstacion = d.CodEstacion,
                DesEstacion = d.DesEstacion,
                ClaveSociedad = d.ClaveSociedad,
                GrupoCategoria = d.GrupoCategoria,
                Bloque = d.Bloque,
                Defecto = d.Defecto,
                Subdefecto = d.Subdefecto,
                Gravedad = d.Gravedad,
                Descripcion = d.Descripcion,
                NumDefectos = d.NumDefectos,
                PctSobreTotal = pct
            };
        }).ToList();

        // 1. Gráfico por Estación (Ranking oficial: Azul TSA #0046ad, Verde CAL #00875a. Sin naranja)
        var graficoEstaciones = datos
            .GroupBy(d => new { d.CodEstacion, d.DesEstacion, d.ClaveSociedad })
            .Select(g =>
            {
                int tot = g.Sum(x => x.NumDefectos);
                double pct = totalDefectos > 0 ? Math.Round((double)tot / totalDefectos * 100, 1) : 0;
                string label = $"{g.Key.CodEstacion} - {g.Key.DesEstacion}";
                string color = g.Key.ClaveSociedad == "CAL" ? "#00875a" : "#0046ad";
                return new GraficoPuntoDefectosDto(
                    g.Key.CodEstacion,
                    label,
                    tot,
                    $"{tot:N0} defectos ({pct}%)",
                    $"{g.Key.ClaveSociedad}: {tot:N0} defectos detectados",
                    color
                );
            })
            .OrderByDescending(x => x.Valor)
            .ToList();

        // 2. Gráfico de Top Defectos (agrupado por código completo y descripción)
        var graficoTopDefectos = datos
            .GroupBy(d => new { d.Bloque, d.Defecto, d.Subdefecto, d.Gravedad, d.Descripcion })
            .Select(g =>
            {
                int tot = g.Sum(x => x.NumDefectos);
                double pct = totalDefectos > 0 ? Math.Round((double)tot / totalDefectos * 100, 1) : 0;
                string cod = $"{g.Key.Bloque}.{g.Key.Defecto}.{g.Key.Subdefecto}";
                string color = g.Key.Gravedad switch
                {
                    "MG" => "#dc2626", // Rojo intenso
                    "G" => "#d97706",  // Ámbar/Naranja
                    _ => "#0284c7"     // Azul corporativo
                };
                return new GraficoPuntoDefectosDto(
                    cod,
                    $"{cod} - {g.Key.Descripcion}",
                    tot,
                    $"{tot:N0} casos ({pct}%)",
                    $"Gravedad: {(g.Key.Gravedad == "MG" ? "Muy Grave" : g.Key.Gravedad == "G" ? "Grave" : "Leve")}",
                    color
                );
            })
            .OrderByDescending(x => x.Valor)
            .Take(15)
            .ToList();

        // 2. Gráfico por Grupo de Categoría (M1, M2/M3, N1...)
        var coloresCategorias = new Dictionary<string, string>
        {
            ["Grupo_M1"] = "#0046ad",     // Azul TSA
            ["Grupo_M2_M3"] = "#0284c7",  // Cyan
            ["Grupo_N1"] = "#00875a",     // Verde CAL
            ["Grupo_N2_N3"] = "#10b981",  // Esmeralda
            ["Grupo_O3_O4"] = "#f59e0b",  // Ámbar
            ["Grupo_L1_L1e"] = "#8b5cf6", // Violeta
            ["Grupo_L3_L3e"] = "#ec4899", // Rosa
            ["Otros"] = "#64748b"         // Gris
        };

        var nombresCategorias = new Dictionary<string, string>
        {
            ["Grupo_M1"] = "Turismos (M1)",
            ["Grupo_M2_M3"] = "Autobuses (M2/M3)",
            ["Grupo_N1"] = "Comerciales Ligeros (N1)",
            ["Grupo_N2_N3"] = "Camiones Pesados (N2/N3)",
            ["Grupo_O3_O4"] = "Remolques (O3/O4)",
            ["Grupo_L1_L1e"] = "Ciclomotores (L1)",
            ["Grupo_L3_L3e"] = "Motocicletas (L3)",
            ["Otros"] = "Otros Vehículos"
        };

        var graficoCategorias = datos
            .GroupBy(d => d.GrupoCategoria)
            .Select(g =>
            {
                int tot = g.Sum(x => x.NumDefectos);
                double pct = totalDefectos > 0 ? Math.Round((double)tot / totalDefectos * 100, 1) : 0;
                string label = nombresCategorias.GetValueOrDefault(g.Key, g.Key);
                string col = coloresCategorias.GetValueOrDefault(g.Key, "#64748b");
                return new GraficoPuntoDefectosDto(
                    g.Key,
                    label,
                    tot,
                    $"{tot:N0} defectos ({pct}%)",
                    $"{tot:N0} incidencias detectadas",
                    col
                );
            })
            .OrderByDescending(x => x.Valor)
            .ToList();

        // 3. KPIs Ejecutivos
        var grupoLider = graficoCategorias.FirstOrDefault();
        var defectoTop = graficoTopDefectos.FirstOrDefault();

        var kpis = new List<VolumenDefectosKpiDto>
        {
            new()
            {
                Id = "total-defectos",
                Titulo = "Total Defectos Detectados",
                Valor = totalDefectos.ToString("N0", new CultureInfo("es-ES")),
                Subtitulo = $"{datos.Count} tipologías analizadas",
                Icon = "⚠️",
                Variant = "neutral"
            },
            new()
            {
                Id = "defectos-graves",
                Titulo = "Defectos con Rechazo (G + MG)",
                Valor = (totalGraves + totalMuyGraves).ToString("N0", new CultureInfo("es-ES")),
                Subtitulo = totalDefectos > 0 ? $"{Math.Round((double)(totalGraves + totalMuyGraves) / totalDefectos * 100, 1)}% del total detectado" : "0%",
                Icon = "🚫",
                Variant = "danger"
            },
            new()
            {
                Id = "grupo-lider",
                Titulo = "Categoría de Vehículo Líder",
                Valor = grupoLider?.Label ?? "Sin registros",
                Subtitulo = grupoLider != null ? grupoLider.ValorFormateado : "-",
                Icon = "🚗",
                Variant = "warning"
            },
            new()
            {
                Id = "defecto-top",
                Titulo = "Defecto Más Frecuente",
                Valor = defectoTop?.Id ?? "-",
                Subtitulo = defectoTop != null ? $"{defectoTop.ValorFormateado} - {defectoTop.Label}" : "-",
                Icon = "🔍",
                Variant = "info"
            }
        };

        return new VolumenDefectosResponseDto
        {
            FechaInicio = filtro.FechaInicio,
            FechaFin = filtro.FechaFin,
            TotalDefectos = totalDefectos,
            TotalLeves = totalLeves,
            TotalGraves = totalGraves,
            TotalMuyGraves = totalMuyGraves,
            Kpis = kpis,
            Filas = filasDto,
            GraficoEstaciones = graficoEstaciones,
            GraficoTopDefectos = graficoTopDefectos,
            GraficoCategorias = graficoCategorias
        };
    }

    public async Task<byte[]> ExportarExcelAsync(
        VolumenDefectosFiltroDto filtro,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtro.FechaInicio, filtro.FechaFin);

        string? codEmpresa = filtro.Sociedad?.Trim().ToUpperInvariant() switch
        {
            "TSA" or "01" => "01",
            "CAL" or "03" => "03",
            _ => null
        };

        var datos = await _repository.ObtenerVolumenDefectosAsync(
            filtro.FechaInicio,
            filtro.FechaFin,
            codEmpresa,
            filtro.Estaciones,
            filtro.Bloque,
            filtro.Defecto,
            cancellationToken);

        using var workbook = new XLWorkbook();

        // 1. Pestaña Principal Consolidada (30 caracteres <= 31 máx de Excel)
        GenerarHojaConsolidada(workbook, "TOTAL_ESTACIONES_SELECCIONADAS", datos);

        // 2. Pestañas Individuales por Estación (VOLUMEN_DEFECTOS_XXXX) - Idénticas a frmCriterios.vb
        var estacionesGrupos = datos
            .GroupBy(d => d.CodEstacion)
            .OrderBy(g => g.Key);

        foreach (var grupoEst in estacionesGrupos)
        {
            string nombreHoja = $"VOLUMEN_DEFECTOS_{grupoEst.Key}";
            if (nombreHoja.Length > 31)
            {
                nombreHoja = nombreHoja.Substring(0, 31);
            }
            GenerarHojaEstacionIndividual(workbook, nombreHoja, grupoEst.ToList(), filtro.Bloque, filtro.Defecto);
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void GenerarHojaConsolidada(
        XLWorkbook wb,
        string nombreHoja,
        IReadOnlyList<VolumenDefectosDato> filas)
    {
        var ws = wb.Worksheets.Add(nombreHoja);

        string[] cabeceras = { "Estación", "Nombre Estación", "Sociedad", "Grupo Categoría", "Bloque", "Defecto", "Subdefecto", "Gravedad", "Descripción Defecto", "Núm. Defectos" };

        for (int c = 0; c < cabeceras.Length; c++)
        {
            ws.Cell(1, c + 1).Value = cabeceras[c];
        }

        var headerRange = ws.Range(1, 1, 1, cabeceras.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(0, 43, 73); // Azul TÜV SÜD
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int row = 2;
        int sumTotalDefectos = 0;

        foreach (var f in filas)
        {
            ws.Cell(row, 1).Value = f.CodEstacion;
            ws.Cell(row, 2).Value = f.DesEstacion;
            ws.Cell(row, 3).Value = f.ClaveSociedad;
            ws.Cell(row, 4).Value = f.GrupoCategoria;
            ws.Cell(row, 5).Value = f.Bloque;
            ws.Cell(row, 6).Value = f.Defecto;
            ws.Cell(row, 7).Value = f.Subdefecto;
            ws.Cell(row, 8).Value = f.Gravedad;
            ws.Cell(row, 9).Value = f.Descripcion;

            var numCell = ws.Cell(row, 10);
            numCell.SetValue(f.NumDefectos);
            numCell.Style.NumberFormat.Format = "#,##0";

            sumTotalDefectos += f.NumDefectos;
            row++;
        }

        // Fila final de Totales
        ws.Cell(row, 1).Value = "TOTAL GENERAL";
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Range(row, 1, row, 9).Merge();
        ws.Range(row, 1, row, 9).Style.Font.Bold = true;
        ws.Range(row, 1, row, 9).Style.Fill.BackgroundColor = XLColor.FromArgb(241, 245, 249);
        ws.Range(row, 1, row, 9).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        var totalCell = ws.Cell(row, 10);
        totalCell.SetValue(sumTotalDefectos);
        totalCell.Style.Font.Bold = true;
        totalCell.Style.NumberFormat.Format = "#,##0";
        totalCell.Style.Fill.BackgroundColor = XLColor.FromArgb(226, 232, 240);

        var dataRange = ws.Range(1, 1, row, cabeceras.Length);
        dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        ws.Columns().AdjustToContents();
    }

    private static void GenerarHojaEstacionIndividual(
        XLWorkbook wb,
        string nombreHoja,
        IReadOnlyList<VolumenDefectosDato> filas,
        string? bloqueFiltro,
        string? defectoFiltro)
    {
        var ws = wb.Worksheets.Add(nombreHoja);

        // Estructura oficial 1:1 de frmCriterios.vb (7 columnas exactas)
        string[] cabeceras = { "GRUPOCATEGORIA", "BLOQUE", "DEFECTO", "SUBDEFECTO", "GRAVEDAD", "DESCRIPCION", "NUM_DEFECTOS" };

        for (int c = 0; c < cabeceras.Length; c++)
        {
            ws.Cell(1, c + 1).Value = cabeceras[c];
        }

        var headerRange = ws.Range(1, 1, 1, cabeceras.Length);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(0, 43, 73);
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        int row = 2;
        int sumTotalDefectos = 0;

        foreach (var f in filas)
        {
            ws.Cell(row, 1).Value = f.GrupoCategoria;
            ws.Cell(row, 2).Value = f.Bloque;
            ws.Cell(row, 3).Value = f.Defecto;
            ws.Cell(row, 4).Value = f.Subdefecto;
            ws.Cell(row, 5).Value = f.Gravedad;
            ws.Cell(row, 6).Value = f.Descripcion;

            var numCell = ws.Cell(row, 7);
            numCell.SetValue(f.NumDefectos);
            numCell.Style.NumberFormat.Format = "#,##0";

            sumTotalDefectos += f.NumDefectos;
            row++;
        }

        // Fila de Total
        ws.Cell(row, 1).Value = "TOTAL ESTACIÓN";
        ws.Cell(row, 1).Style.Font.Bold = true;
        ws.Range(row, 1, row, 6).Merge();
        ws.Range(row, 1, row, 6).Style.Font.Bold = true;
        ws.Range(row, 1, row, 6).Style.Fill.BackgroundColor = XLColor.FromArgb(241, 245, 249);
        ws.Range(row, 1, row, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        var totalCell = ws.Cell(row, 7);
        totalCell.SetValue(sumTotalDefectos);
        totalCell.Style.Font.Bold = true;
        totalCell.Style.NumberFormat.Format = "#,##0";
        totalCell.Style.Fill.BackgroundColor = XLColor.FromArgb(226, 232, 240);

        var dataRange = ws.Range(1, 1, row, cabeceras.Length);
        dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        dataRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

        // Metadatos de auditoría al pie idénticos a frmCriterios.vb
        int infoRow = row + 2;
        ws.Cell(infoRow, 1).Value = $"Bloque: {bloqueFiltro ?? "Todos"}";
        ws.Cell(infoRow, 1).Style.Font.Italic = true;
        ws.Cell(infoRow + 1, 1).Value = $"Elemento: {defectoFiltro ?? "Todos"}";
        ws.Cell(infoRow + 1, 1).Style.Font.Italic = true;
        ws.Cell(infoRow + 2, 1).Value = "Inspecciones con periódica en primera fase (Indica12 = 1)";
        ws.Cell(infoRow + 2, 1).Style.Font.Italic = true;

        ws.Columns().AdjustToContents();
    }

    public Task<IReadOnlyList<CatalogoDefectoItemDto>> ObtenerBloquesAsync(CancellationToken cancellationToken = default)
    {
        return _repository.ObtenerBloquesDefectosAsync(cancellationToken);
    }

    public Task<IReadOnlyList<CatalogoDefectoItemDto>> ObtenerElementosAsync(string bloque, CancellationToken cancellationToken = default)
    {
        return _repository.ObtenerElementosDefectosAsync(bloque, cancellationToken);
    }
}
