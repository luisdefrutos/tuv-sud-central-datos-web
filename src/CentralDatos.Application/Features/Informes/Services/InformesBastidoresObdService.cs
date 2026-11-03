using System.Globalization;
using ClosedXML.Excel;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesBastidoresObdService : IInformesBastidoresObdService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesBastidoresObdService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeBastidoresObdResponseDto> GenerarInformeBastidoresObdAsync(
        FiltrosBastidoresObdRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        string? codEmpresa = filtros.Sociedad?.ToUpperInvariant() switch
        {
            "TSA" => "01",
            "CAL" => "03",
            _ => null
        };

        var estaciones = (filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0 && !filtros.CodEstaciones.Contains("TODAS"))
            ? filtros.CodEstaciones
            : null;

        var datos = await _repository.ObtenerBastidoresObdNoCoincidentesAsync(fInicio, fFin, codEmpresa, estaciones, cancellationToken);

        // 1. Mapeo a Filas DTO
        var filas = datos.Select(d =>
        {
            var nombreCompleto = $"{d.Nombre ?? ""} {d.Apellidos ?? ""}".Trim();
            if (string.IsNullOrWhiteSpace(nombreCompleto)) nombreCompleto = "-";

            return new FilaBastidorObdNoCoincidenteDto(
                d.CodInspeccion,
                d.CodEstacion,
                d.DesEstacion,
                d.CodEmpresa,
                d.ClaveSociedad,
                d.Matricula,
                d.FechaInspeccion,
                d.FechaInspeccion != DateTime.MinValue ? d.FechaInspeccion.ToString("dd/MM/yyyy HH:mm", CultureEs) : "-",
                d.BastidorInspeccion,
                d.BastidorObd,
                d.Categoria,
                d.Clasificacion,
                d.Nombre,
                d.Apellidos,
                nombreCompleto,
                d.CifFactura ?? "-",
                d.CodInspector ?? "-",
                d.CodInspector1 ?? "-",
                d.CodInspector2 ?? "-",
                d.CodInspector3 ?? "-",
                d.InspectorResponsableValidacion ?? "-",
                d.EquipoObd ?? "-",
                d.CodEmpleadoBastidor ?? "-"
            );
        }).ToList();

        // 2. Cálculo de Totales y Agrupaciones
        int totalDiscordancias = filas.Count;
        var estacionesUnicas = filas.Select(f => f.CodEstacion).Distinct().ToList();
        int totalEstacionesAfectadas = estacionesUnicas.Count;

        // 3. Gráfico por Estación
        var graficoEstaciones = filas
            .GroupBy(f => new { f.CodEstacion, f.DesEstacion, f.ClaveSociedad })
            .Select(g =>
            {
                int tot = g.Count();
                return new GraficoEstacionBastidoresObdDto(
                    g.Key.CodEstacion,
                    g.Key.DesEstacion.Replace("I.T.V. - ", "").Trim(),
                    g.Key.ClaveSociedad,
                    tot,
                    totalDiscordancias > 0 ? ((decimal)tot / totalDiscordancias * 100m).ToString("F1", CultureEs) : "0.0"
                );
            })
            .OrderByDescending(g => g.TotalDiscordancias)
            .ToList();

        // 4. Gráfico por Categoría
        var graficoCategorias = filas
            .GroupBy(f => f.Categoria)
            .Select(g =>
            {
                int tot = g.Count();
                var cat = string.IsNullOrWhiteSpace(g.Key) ? "-" : g.Key;
                return new GraficoCategoriaBastidoresObdDto(
                    cat,
                    ObtenerDescripcionCategoria(cat),
                    tot,
                    totalDiscordancias > 0 ? ((decimal)tot / totalDiscordancias * 100m).ToString("F1", CultureEs) : "0.0"
                );
            })
            .OrderByDescending(g => g.TotalDiscordancias)
            .ToList();

        // 5. Equipo OBD con más discordancias
        var equipoTop = filas
            .Where(f => !string.IsNullOrWhiteSpace(f.EquipoObd) && f.EquipoObd != "-")
            .GroupBy(f => f.EquipoObd!)
            .OrderByDescending(g => g.Count())
            .Select(g => $"{g.Key} ({g.Count()})")
            .FirstOrDefault() ?? "N/D";

        var estacionTop = graficoEstaciones.Count > 0
            ? $"{graficoEstaciones[0].DesEstacion} ({graficoEstaciones[0].TotalDiscordancias})"
            : "Sin discordancias";

        // 6. Tarjetas KPIs Ejecutivas
        var kpis = new List<KpiBastidoresObdDto>
        {
            new(
                "total-discordancias",
                "Total Discordancias",
                totalDiscordancias.ToString("N0", CultureEs),
                $"{totalEstacionesAfectadas} centros con incidencias",
                totalDiscordancias > 0 ? "danger" : "success",
                "⚠️"
            ),
            new(
                "estaciones-afectadas",
                "Estaciones Afectadas",
                totalEstacionesAfectadas.ToString("N0", CultureEs),
                graficoEstaciones.Count > 0 ? $"Máx: {estacionTop}" : "Sin incidencias",
                totalEstacionesAfectadas > 0 ? "warning" : "success",
                "🏢"
            ),
            new(
                "estacion-maxima",
                "Estación con Más Casos",
                graficoEstaciones.Count > 0 ? graficoEstaciones[0].CodEstacion : "-",
                estacionTop,
                "neutral",
                "📍"
            ),
            new(
                "equipo-obd-top",
                "Equipo OBD con Más Casos",
                equipoTop.Split(' ')[0],
                equipoTop,
                "neutral",
                "🔌"
            )
        };

        return new InformeBastidoresObdResponseDto(
            filas,
            totalDiscordancias,
            totalDiscordancias.ToString("N0", CultureEs),
            totalEstacionesAfectadas,
            estacionTop,
            equipoTop,
            graficoEstaciones,
            graficoCategorias,
            kpis,
            fInicio,
            fFin
        );
    }

    public async Task<(byte[] Contenido, string NombreArchivo, string ContentType)> ExportarExcelAsync(
        FiltrosBastidoresObdRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeBastidoresObdAsync(filtros, cancellationToken);
        var bytes = GenerarExcel(informe.Filas);
        var nombreArchivo = $"Informe_Bastidores_OBD_No_Coincidentes_{DateTime.Now:yyyyMMdd_HHmm}.xlsx";

        return (bytes, nombreArchivo, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    private static byte[] GenerarExcel(IReadOnlyList<FilaBastidorObdNoCoincidenteDto> filas)
    {
        using var workbook = new XLWorkbook();
        var gruposPorEstacion = filas.GroupBy(f => f.CodEstacion).ToList();

        if (!gruposPorEstacion.Any())
        {
            var wsVacia = workbook.Worksheets.Add("BASTIDORES_OBD");
            EscribirCabeceras(wsVacia);
            wsVacia.Columns().AdjustToContents();
        }
        else if (gruposPorEstacion.Count == 1)
        {
            var ws = workbook.Worksheets.Add("BASTIDORES_OBD");
            EscribirCabeceras(ws);
            EscribirFilas(ws, gruposPorEstacion[0]);
            ws.Columns().AdjustToContents();
        }
        else
        {
            // Hoja consolidada con todas las estaciones con el nombre exacto del legado
            var wsGlobal = workbook.Worksheets.Add("BASTIDORES_OBD");
            EscribirCabeceras(wsGlobal);
            EscribirFilas(wsGlobal, filas);
            wsGlobal.Columns().AdjustToContents();

            // Pestañas individuales por cada estación
            foreach (var grupo in gruposPorEstacion)
            {
                var nombreHoja = $"OBD_{grupo.Key}";
                if (nombreHoja.Length > 31) nombreHoja = nombreHoja[..31];

                var ws = workbook.Worksheets.Add(nombreHoja);
                EscribirCabeceras(ws);
                EscribirFilas(ws, grupo);
                ws.Columns().AdjustToContents();
            }
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void EscribirCabeceras(IXLWorksheet ws)
    {
        string[] cabeceras = [
            "CODINSPECCION",
            "CODESTACION",
            "ESTACION",
            "SOCIEDAD",
            "FECHAINSPECCION",
            "MATRICULA",
            "BASTIDOR_INSPECCION",
            "BASTIDOR_OBD",
            "CATEGORIA",
            "CLASIFICACION",
            "NOMBRE",
            "APELLIDOS",
            "CIFFACTURA",
            "CODINSPECTOR",
            "CODINSPECTOR1",
            "CODINSPECTOR2",
            "CODINSPECTOR3",
            "INSPECTOR_RESPONSABLE_VALIDACION",
            "EQUIPO_OBD",
            "CODEMPLEADO_BASTIDOR"
        ];

        for (int c = 0; c < cabeceras.Length; c++)
        {
            var celda = ws.Cell(1, c + 1);
            celda.SetValue(cabeceras[c]);
            celda.Style.Font.Bold = true;
            celda.Style.Fill.BackgroundColor = XLColor.FromHtml("#003366");
            celda.Style.Font.FontColor = XLColor.White;
            celda.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            celda.Style.Border.BottomBorderColor = XLColor.FromHtml("#CBD5E1");
        }
    }

    private static void EscribirFilas(IXLWorksheet ws, IEnumerable<FilaBastidorObdNoCoincidenteDto> items)
    {
        int row = 2;
        foreach (var f in items)
        {
            ws.Cell(row, 1).SetValue(f.CodInspeccion);
            ws.Cell(row, 2).SetValue(f.CodEstacion);
            ws.Cell(row, 3).SetValue(f.DesEstacion);
            ws.Cell(row, 4).SetValue(f.ClaveSociedad);
            ws.Cell(row, 5).SetValue(f.FechaInspeccionFormatted);
            ws.Cell(row, 6).SetValue(f.Matricula);
            ws.Cell(row, 7).SetValue(f.BastidorInspeccion);
            ws.Cell(row, 8).SetValue(f.BastidorObd);
            ws.Cell(row, 9).SetValue(f.Categoria);
            ws.Cell(row, 10).SetValue(f.Clasificacion);
            ws.Cell(row, 11).SetValue(f.Nombre ?? string.Empty);
            ws.Cell(row, 12).SetValue(f.Apellidos ?? string.Empty);
            ws.Cell(row, 13).SetValue(f.CifFactura ?? string.Empty);
            ws.Cell(row, 14).SetValue(f.CodInspector ?? string.Empty);
            ws.Cell(row, 15).SetValue(f.CodInspector1 ?? string.Empty);
            ws.Cell(row, 16).SetValue(f.CodInspector2 ?? string.Empty);
            ws.Cell(row, 17).SetValue(f.CodInspector3 ?? string.Empty);
            ws.Cell(row, 18).SetValue(f.InspectorResponsableValidacion ?? string.Empty);
            ws.Cell(row, 19).SetValue(f.EquipoObd ?? string.Empty);
            ws.Cell(row, 20).SetValue(f.CodEmpleadoBastidor ?? string.Empty);
            row++;
        }
    }

    private static string ObtenerDescripcionCategoria(string cat) => cat.ToUpperInvariant() switch
    {
        "M1" => "Turismos (M1)",
        "N1" => "Furgonetas / Comerciales (N1)",
        "N2" or "N3" => "Camiones (N2/N3)",
        "M2" or "M3" => "Autobuses (M2/M3)",
        "L" or "L1" or "L3" => "Motos / Ciclomotores (L)",
        "O1" or "O2" or "O3" or "O4" => "Remolques (O)",
        _ => $"Categoría {cat}"
    };
}

