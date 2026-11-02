using System.Globalization;
using ClosedXML.Excel;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesSinInspectorService : IInformesSinInspectorService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesSinInspectorService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeSinInspectorResponseDto> GenerarInformeSinInspectorAsync(
        FiltrosSinInspectorRequestDto filtros,
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

        string? fase = filtros.Fase switch
        {
            "1" or "1ª Fase" or "Fase 1" => "1",
            "2" or "2ª Fase" or "Fase 2" => "2",
            _ => null
        };

        var datos = await _repository.ObtenerInspeccionesSinInspectorAsync(fInicio, fFin, codEmpresa, estaciones, fase, cancellationToken);

        // 1. Mapeo a Filas DTO
        var filas = datos.Select(d => new FilaSinInspectorDto(
            d.CodInspeccion,
            d.CodEstacion,
            d.DesEstacion,
            d.CodEmpresa,
            d.NombreEmpresa,
            d.ClaveSociedad,
            d.Matricula,
            d.FechaInspeccion,
            d.FechaInspeccion != DateTime.MinValue ? d.FechaInspeccion.ToString("dd/MM/yyyy HH:mm", CultureEs) : "-",
            d.Marca,
            d.Modelo,
            d.TipoMotor,
            d.TipoVehiculo,
            d.TipoInspeccion,
            d.TextoResultado,
            d.Resultado,
            d.Fase,
            d.Indica12,
            d.CHomologacion,
            d.Clasificacion,
            d.Mma,
            d.Kilometraje
        )).ToList();

        // 2. Cálculo de Totales y Agrupaciones
        int totalInspecciones = filas.Count;
        int totalFase1 = filas.Count(f => f.Indica12 == "1" || f.Fase.Contains("1"));
        int totalFase2 = filas.Count(f => f.Indica12 == "2" || f.Fase.Contains("2"));

        var estacionesUnicas = filas.Select(f => f.CodEstacion).Distinct().ToList();
        int totalEstacionesAfectadas = estacionesUnicas.Count;

        // 3. Gráfico por Estación
        var graficoEstaciones = filas
            .GroupBy(f => new { f.CodEstacion, f.DesEstacion, f.ClaveSociedad })
            .Select(g =>
            {
                int tot = g.Count();
                int f1 = g.Count(x => x.Indica12 == "1" || x.Fase.Contains("1"));
                int f2 = g.Count(x => x.Indica12 == "2" || x.Fase.Contains("2"));
                return new GraficoEstacionSinInspectorDto(
                    g.Key.CodEstacion,
                    g.Key.DesEstacion.Replace("I.T.V. - ", "").Trim(),
                    g.Key.ClaveSociedad,
                    tot,
                    f1,
                    f2,
                    totalInspecciones > 0 ? ((decimal)tot / totalInspecciones * 100m).ToString("F1", CultureEs) : "0.0"
                );
            })
            .OrderByDescending(g => g.TotalInspecciones)
            .ToList();

        // 4. Tarjetas KPIs Ejecutivas
        var kpis = new List<KpiSinInspectorDto>
        {
            new(
                "total-sin-inspector",
                "Total Sin Inspector",
                totalInspecciones.ToString("N0", CultureEs),
                $"{totalEstacionesAfectadas} centros con incidencias",
                totalInspecciones > 0 ? "danger" : "success",
                "⚠️"
            ),
            new(
                "fase1-sin-inspector",
                "Fase 1 (1ª Inspección)",
                totalFase1.ToString("N0", CultureEs),
                CalcularPct(totalFase1, totalInspecciones) + "% del total",
                "neutral",
                "1️⃣"
            ),
            new(
                "fase2-sin-inspector",
                "Fase 2 (Segundas)",
                totalFase2.ToString("N0", CultureEs),
                CalcularPct(totalFase2, totalInspecciones) + "% del total",
                "neutral",
                "2️⃣"
            ),
            new(
                "estaciones-afectadas",
                "Estaciones Afectadas",
                totalEstacionesAfectadas.ToString("N0", CultureEs),
                graficoEstaciones.Count > 0 ? $"Máx: {graficoEstaciones[0].DesEstacion} ({graficoEstaciones[0].TotalInspecciones})" : "Sin incidencias",
                totalEstacionesAfectadas > 0 ? "warning" : "success",
                "🏢"
            )
        };

        return new InformeSinInspectorResponseDto(
            filas,
            totalInspecciones,
            totalInspecciones.ToString("N0", CultureEs),
            totalFase1,
            totalFase2,
            totalEstacionesAfectadas,
            kpis,
            graficoEstaciones
        );
    }

    public async Task<byte[]> GenerarExportacionSinInspectorExcelAsync(
        FiltrosSinInspectorRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeSinInspectorAsync(filtros, cancellationToken);

        using var workbook = new XLWorkbook();
        var gruposPorEstacion = informe.Filas
            .GroupBy(f => f.CodEstacion)
            .OrderBy(g => g.Key);

        if (!gruposPorEstacion.Any())
        {
            var wsVacia = workbook.Worksheets.Add("SIN_INSPECTOR");
            EscribirCabeceras(wsVacia);
            wsVacia.Columns().AdjustToContents();
        }
        else
        {
            foreach (var grupo in gruposPorEstacion)
            {
                var nombreHoja = $"SIN_INSPECTOR_{grupo.Key}";
                if (nombreHoja.Length > 31) nombreHoja = nombreHoja[..31];

                var ws = workbook.Worksheets.Add(nombreHoja);
                EscribirCabeceras(ws);

                int row = 2;
                foreach (var f in grupo)
                {
                    ws.Cell(row, 1).SetValue(f.CodInspeccion);
                    ws.Cell(row, 2).SetValue(f.Matricula);
                    ws.Cell(row, 3).SetValue(f.FechaInspeccionFormatted);
                    ws.Cell(row, 4).SetValue(f.Fase);
                    ws.Cell(row, 5).SetValue(f.TipoInspeccion);
                    ws.Cell(row, 6).SetValue(f.TextoResultado);
                    ws.Cell(row, 7).SetValue(f.DesEstacion);
                    ws.Cell(row, 8).SetValue(f.CodEstacion);
                    ws.Cell(row, 9).SetValue(f.ClaveSociedad);
                    ws.Cell(row, 10).SetValue(f.Marca);
                    ws.Cell(row, 11).SetValue(f.Modelo);
                    ws.Cell(row, 12).SetValue(f.TipoMotor);
                    ws.Cell(row, 13).SetValue(f.TipoVehiculo);
                    ws.Cell(row, 14).SetValue(f.CHomologacion ?? string.Empty);
                    ws.Cell(row, 15).SetValue(f.Clasificacion);
                    ws.Cell(row, 16).SetValue(f.Mma?.ToString() ?? string.Empty);
                    ws.Cell(row, 17).SetValue(f.Kilometraje ?? string.Empty);
                    row++;
                }

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
            "COD_INSPECCION",
            "MATRICULA",
            "FECHA_INSPECCION",
            "FASE_1_2",
            "TIPO_INSPECCION",
            "RESULTADO",
            "ESTACION",
            "COD_ESTACION",
            "SOCIEDAD",
            "MARCA",
            "MODELO",
            "TIPO_MOTOR",
            "TIPO_VEHICULO",
            "CHOMOLOGACION",
            "CLASIFICACION",
            "MMA",
            "KILOMETRAJE"
        ];

        for (int c = 0; c < cabeceras.Length; c++)
        {
            var celda = ws.Cell(1, c + 1);
            celda.SetValue(cabeceras[c]);
            celda.Style.Font.Bold = true;
            celda.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            celda.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            celda.Style.Border.BottomBorderColor = XLColor.FromHtml("#CBD5E1");
        }
    }

    private static string CalcularPct(int parcial, int total)
    {
        if (total <= 0) return "0.0";
        return ((decimal)parcial / total * 100m).ToString("F1", CultureEs);
    }
}

