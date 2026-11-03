using System.Globalization;
using ClosedXML.Excel;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesCuponDescuentoService : IInformesCuponDescuentoService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesCuponDescuentoService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeCuponDescuentoResponseDto> GenerarInformeCuponDescuentoAsync(
        FiltrosCuponDescuentoRequestDto filtros,
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

        var datos = await _repository.ObtenerInspeccionesCuponDescuentoAsync(fInicio, fFin, codEmpresa, estaciones, fase, cancellationToken);

        // 1. Mapeo a Filas DTO
        var filas = datos.Select(d => new FilaCuponDescuentoDto(
            d.CodInspeccion,
            d.CodEstacion,
            d.DesEstacion,
            d.CodEmpresa,
            d.NombreEmpresa,
            d.ClaveSociedad,
            d.Matricula,
            d.FechaInspeccion,
            d.FechaInspeccion != DateTime.MinValue ? d.FechaInspeccion.ToString("dd/MM/yyyy HH:mm", CultureEs) : "-",
            d.CodCupon,
            d.Promocion,
            d.Descuento,
            d.Descuento.ToString("N2", CultureEs) + " €",
            d.ImporteAbonado,
            d.ImporteAbonado.ToString("N2", CultureEs) + " €",
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
        decimal totalDescuento = filas.Sum(f => f.Descuento);
        decimal totalImporteAbonado = filas.Sum(f => f.ImporteAbonado);

        var estacionesUnicas = filas.Select(f => f.CodEstacion).Distinct().ToList();
        int totalEstacionesAfectadas = estacionesUnicas.Count;

        // 3. Gráfico por Estación (Ranking para ReportBarChart)
        var graficoEstaciones = filas
            .GroupBy(f => new { f.CodEstacion, f.DesEstacion, f.ClaveSociedad })
            .Select(g =>
            {
                int tot = g.Count();
                decimal desc = g.Sum(x => x.Descuento);
                decimal abonado = g.Sum(x => x.ImporteAbonado);
                return new GraficoEstacionCuponDescuentoDto(
                    g.Key.CodEstacion,
                    g.Key.DesEstacion.Replace("I.T.V. - ", "").Trim(),
                    g.Key.ClaveSociedad,
                    tot,
                    desc,
                    desc.ToString("N2", CultureEs) + " €",
                    abonado,
                    abonado.ToString("N2", CultureEs) + " €",
                    totalInspecciones > 0 ? ((decimal)tot / totalInspecciones * 100m).ToString("F1", CultureEs) : "0.0"
                );
            })
            .OrderByDescending(g => g.TotalInspecciones)
            .ToList();

        // 4. Gráfico por Promoción/Campaña (Donut para ReportDonutChart)
        var graficoPromociones = filas
            .GroupBy(f => string.IsNullOrWhiteSpace(f.Promocion) ? "Sin Campaña Asignada" : f.Promocion.Trim())
            .Select(g =>
            {
                int tot = g.Count();
                decimal desc = g.Sum(x => x.Descuento);
                return new GraficoPromocionCuponDto(
                    g.Key,
                    tot,
                    desc,
                    desc.ToString("N2", CultureEs) + " €",
                    totalInspecciones > 0 ? ((decimal)tot / totalInspecciones * 100m).ToString("F1", CultureEs) : "0.0"
                );
            })
            .OrderByDescending(g => g.TotalInspecciones)
            .ToList();

        // 5. Tarjetas KPIs Ejecutivas
        var promoLider = graficoPromociones.FirstOrDefault();
        var estacionLider = graficoEstaciones.FirstOrDefault();

        var kpis = new List<KpiCuponDescuentoDto>
        {
            new(
                "total-cupones",
                "Inspecciones con Cupón",
                totalInspecciones.ToString("N0", CultureEs),
                $"{totalEstacionesAfectadas} centros con promociones",
                totalInspecciones > 0 ? "primary" : "neutral",
                "🎟️"
            ),
            new(
                "total-descuento",
                "Total Descuento Aplicado",
                totalDescuento.ToString("N2", CultureEs) + " €",
                totalInspecciones > 0 ? $"Media: {(totalDescuento / totalInspecciones):N2} € por inspección" : "0,00 € de descuento",
                totalDescuento > 0 ? "warning" : "neutral",
                "💰"
            ),
            new(
                "total-abonado",
                "Importe Abonado en Caja",
                totalImporteAbonado.ToString("N2", CultureEs) + " €",
                totalInspecciones > 0 ? $"Ticket neto medio: {(totalImporteAbonado / totalInspecciones):N2} €" : "0,00 € abonado",
                totalImporteAbonado > 0 ? "success" : "neutral",
                "💳"
            ),
            new(
                "campana-lider",
                "Campaña Más Utilizada",
                promoLider != null ? promoLider.Promocion : "Sin datos",
                promoLider != null ? $"{promoLider.TotalInspecciones:N0} inspecciones ({promoLider.PctSobreTotal}%)" : "Sin promociones registradas",
                promoLider != null ? "primary" : "neutral",
                "🏷️"
            )
        };

        return new InformeCuponDescuentoResponseDto(
            filas,
            totalInspecciones,
            totalInspecciones.ToString("N0", CultureEs),
            totalDescuento,
            totalDescuento.ToString("N2", CultureEs) + " €",
            totalImporteAbonado,
            totalImporteAbonado.ToString("N2", CultureEs) + " €",
            totalEstacionesAfectadas,
            kpis,
            graficoEstaciones,
            graficoPromociones
        );
    }

    public async Task<byte[]> GenerarExportacionCuponDescuentoExcelAsync(
        FiltrosCuponDescuentoRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeCuponDescuentoAsync(filtros, cancellationToken);

        using var workbook = new XLWorkbook();
        var gruposPorEstacion = informe.Filas
            .GroupBy(f => f.CodEstacion)
            .OrderBy(g => g.Key);

        if (!gruposPorEstacion.Any())
        {
            var wsVacia = workbook.Worksheets.Add("CUPONES_DTO");
            EscribirCabeceras(wsVacia);
            wsVacia.Columns().AdjustToContents();
        }
        else
        {
            foreach (var grupo in gruposPorEstacion)
            {
                // Nombre de hoja oficial de escritorio: CUPONES_DTO_ITV_{CodEstacion}
                var nombreHoja = $"CUPONES_DTO_ITV_{grupo.Key}";
                if (nombreHoja.Length > 31) nombreHoja = nombreHoja[..31];

                var ws = workbook.Worksheets.Add(nombreHoja);
                EscribirCabeceras(ws);

                int row = 2;
                foreach (var f in grupo)
                {
                    ws.Cell(row, 1).SetValue(f.CodInspeccion);
                    ws.Cell(row, 2).SetValue(f.Matricula);
                    ws.Cell(row, 3).SetValue(f.FechaInspeccionFormatted);
                    ws.Cell(row, 4).SetValue(f.CodCupon);
                    ws.Cell(row, 5).SetValue(f.Promocion);
                    ws.Cell(row, 6).SetValue(f.Descuento);
                    ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0.00 €";
                    ws.Cell(row, 7).SetValue(f.ImporteAbonado);
                    ws.Cell(row, 7).Style.NumberFormat.Format = "#,##0.00 €";
                    ws.Cell(row, 8).SetValue(f.DesEstacion);
                    ws.Cell(row, 9).SetValue(f.CodEstacion);
                    ws.Cell(row, 10).SetValue(f.ClaveSociedad);
                    ws.Cell(row, 11).SetValue(f.Marca);
                    ws.Cell(row, 12).SetValue(f.Modelo);
                    ws.Cell(row, 13).SetValue(f.TipoMotor);
                    ws.Cell(row, 14).SetValue(f.Fase);
                    ws.Cell(row, 15).SetValue(f.TextoResultado);
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
            "CODCUPON",
            "PROMOCION",
            "DESCUENTO",
            "IMPORTE_ABONADO",
            "ESTACION",
            "COD_ESTACION",
            "SOCIEDAD",
            "MARCA",
            "MODELO",
            "TIPO_MOTOR",
            "FASE",
            "RESULTADO"
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
}

