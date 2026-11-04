using System.Globalization;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using ClosedXML.Excel;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Informes.Services;

public class InformesEnviosRecordatoriosService : IInformesEnviosRecordatoriosService
{
    private readonly IInformesRepository _repository;
    private readonly ILogger<InformesEnviosRecordatoriosService> _logger;

    public InformesEnviosRecordatoriosService(
        IInformesRepository repository,
        ILogger<InformesEnviosRecordatoriosService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<PlantillaRecordatorioCatalogoDto>> ObtenerPlantillasAsync(
        CancellationToken cancellationToken = default)
    {
        return await _repository.ObtenerPlantillasRecordatorioAsync(cancellationToken);
    }

    public async Task<InformeEnviosRecordatoriosResponseDto> ConsultarEnviosRecordatoriosAsync(
        FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        var resumenTask = _repository.ObtenerResumenEnviosRecordatoriosAsync(filtros, cancellationToken);
        var detalleTask = _repository.ObtenerDetalleEnviosRecordatoriosAsync(filtros, cancellationToken);

        await Task.WhenAll(resumenTask, detalleTask);

        var resumen = await resumenTask;
        var detalle = await detalleTask;

        // 1. Calcular KPIs
        var totalSms = resumen.Where(r => string.Equals(r.Canal, "SMS", StringComparison.OrdinalIgnoreCase)).Sum(r => r.TotalEnviados);
        var totalEmail = resumen.Where(r => string.Equals(r.Canal, "EMAIL", StringComparison.OrdinalIgnoreCase)).Sum(r => r.TotalEnviados);
        var totalGlobal = totalSms + totalEmail;

        if (totalGlobal == 0 && detalle.Count > 0)
        {
            totalSms = detalle.Count(d => string.Equals(d.Canal, "SMS", StringComparison.OrdinalIgnoreCase));
            totalEmail = detalle.Count(d => string.Equals(d.Canal, "EMAIL", StringComparison.OrdinalIgnoreCase));
            totalGlobal = detalle.Count;
        }

        var plantillaLider = resumen
            .GroupBy(r => r.DescripcionPlantilla)
            .OrderByDescending(g => g.Sum(x => x.TotalEnviados))
            .Select(g => g.Key)
            .FirstOrDefault() ?? (detalle.GroupBy(d => d.DescripcionPlantilla).OrderByDescending(g => g.Count()).Select(g => g.Key).FirstOrDefault() ?? "N/A");

        var totalPlantillas = resumen.Select(r => r.IdPlantilla).Distinct().Count();
        if (totalPlantillas == 0) totalPlantillas = detalle.Select(d => d.IdPlantilla).Distinct().Count();

        var estacionesActivas = resumen.Select(r => r.CodigoEstacion).Distinct().Count();
        if (estacionesActivas == 0) estacionesActivas = detalle.Select(d => d.CodigoEstacion).Distinct().Count();

        var kpi = new KpiEnviosRecordatoriosDto(
            totalGlobal,
            totalSms,
            totalEmail,
            plantillaLider,
            totalPlantillas,
            estacionesActivas
        );

        // 2. Gráficos — TODAS las estaciones sin truncamiento ni ranking artificial (scroll completo)
        List<PuntoGraficoEnviosDto> porEstacion;
        if (resumen.Count > 0)
        {
            porEstacion = resumen
                .GroupBy(r => (r.CodigoEstacion, r.NombreEstacion))
                .Select(g => new PuntoGraficoEnviosDto(
                    $"{g.Key.CodigoEstacion} - {g.Key.NombreEstacion}",
                    g.Sum(x => x.TotalEnviados),
                    g.Key.CodigoEstacion))
                .OrderByDescending(p => p.Total)
                .ToList();
        }
        else
        {
            porEstacion = detalle
                .GroupBy(d => (d.CodigoEstacion, d.NombreEstacion))
                .Select(g => new PuntoGraficoEnviosDto(
                    $"{g.Key.CodigoEstacion} - {g.Key.NombreEstacion}",
                    g.Count(),
                    g.Key.CodigoEstacion))
                .OrderByDescending(p => p.Total)
                .ToList();
        }

        List<PuntoGraficoEnviosDto> porPlantilla;
        if (resumen.Count > 0)
        {
            porPlantilla = resumen
                .GroupBy(r => r.DescripcionPlantilla)
                .Select(g => new PuntoGraficoEnviosDto(g.Key, g.Sum(x => x.TotalEnviados), "PLANTILLA"))
                .OrderByDescending(p => p.Total)
                .ToList();
        }
        else
        {
            porPlantilla = detalle
                .GroupBy(d => d.DescripcionPlantilla)
                .Select(g => new PuntoGraficoEnviosDto(g.Key, g.Count(), "PLANTILLA"))
                .OrderByDescending(p => p.Total)
                .ToList();
        }

        var porCanal = new List<PuntoGraficoEnviosDto>
        {
            new("SMS", totalSms, "SMS"),
            new("EMAIL", totalEmail, "EMAIL")
        };

        var porFecha = resumen.Count > 0
            ? resumen
                .GroupBy(r => r.FechaEnvio.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture))
                .Select(g => new PuntoGraficoEnviosDto(g.Key, g.Sum(x => x.TotalEnviados), "FECHA"))
                .ToList()
            : detalle
                .GroupBy(d => d.FechaEnvio.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture))
                .Select(g => new PuntoGraficoEnviosDto(g.Key, g.Count(), "FECHA"))
                .ToList();

        return new InformeEnviosRecordatoriosResponseDto(
            kpi,
            resumen,
            detalle,
            porEstacion,
            porPlantilla,
            porCanal,
            porFecha
        );
    }

    public async Task<byte[]> ExportarExcelAsync(
        FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        var resumen = await _repository.ObtenerResumenEnviosRecordatoriosAsync(filtros, cancellationToken);
        var detalle = await _repository.ObtenerDetalleEnviosRecordatoriosAsync(filtros, cancellationToken);

        using var workbook = new XLWorkbook();

        // -------------------------------------------------------------
        // HOJA 1: RESUMEN_GLOBAL (Estadística agrupada por estación y plantilla)
        // -------------------------------------------------------------
        var wsResumen = workbook.Worksheets.Add("RESUMEN_GLOBAL");
        ConfigurarEstiloCabeceraTuvSud(wsResumen, "INFORME DE ENVÍOS DE RECORDATORIOS (SMS Y EMAIL) — RESUMEN GLOBAL", filtros);

        var cabecerasResumen = new[]
        {
            "CÓD. ESTACIÓN", "ESTACIÓN ITV", "CANAL", "ID PLANTILLA", "DESCRIPCIÓN PLANTILLA", "FECHA ENVÍO", "TOTAL ENVIADOS"
        };

        const int filaInicioResumen = 5;
        for (int i = 0; i < cabecerasResumen.Length; i++)
        {
            var cell = wsResumen.Cell(filaInicioResumen, i + 1);
            cell.Value = cabecerasResumen[i];
            FormatearCeldaCabeceraColumna(cell);
        }

        int filaRes = filaInicioResumen + 1;
        foreach (var r in resumen)
        {
            wsResumen.Cell(filaRes, 1).SetValue(r.CodigoEstacion);
            wsResumen.Cell(filaRes, 2).SetValue(r.NombreEstacion);
            wsResumen.Cell(filaRes, 3).SetValue(r.Canal);
            wsResumen.Cell(filaRes, 4).SetValue(r.IdPlantilla);
            wsResumen.Cell(filaRes, 5).SetValue(r.DescripcionPlantilla);
            wsResumen.Cell(filaRes, 6).SetValue(r.FechaEnvio.ToString("dd/MM/yyyy"));
            wsResumen.Cell(filaRes, 7).SetValue(r.TotalEnviados);

            if (filaRes % 2 == 0)
            {
                wsResumen.Range(filaRes, 1, filaRes, 7).Style.Fill.BackgroundColor = XLColor.FromHtml("#F4F8FD");
            }
            filaRes++;
        }

        // Fila de Total Resumen
        if (filaRes > filaInicioResumen + 1)
        {
            var cellTotalLabel = wsResumen.Cell(filaRes, 6);
            cellTotalLabel.Value = "TOTAL GLOBAL:";
            cellTotalLabel.Style.Font.Bold = true;
            cellTotalLabel.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

            var cellTotalVal = wsResumen.Cell(filaRes, 7);
            cellTotalVal.FormulaA1 = $"SUM(G{filaInicioResumen + 1}:G{filaRes - 1})";
            cellTotalVal.Style.Font.Bold = true;
            cellTotalVal.Style.Fill.BackgroundColor = XLColor.FromHtml("#E8F1FD");
            cellTotalVal.Style.Border.TopBorder = XLBorderStyleValues.Thin;
            cellTotalVal.Style.Border.BottomBorder = XLBorderStyleValues.Double;
        }

        wsResumen.Columns().AdjustToContents();

        // -------------------------------------------------------------
        // HOJA 2: ENVIOS_SMS (Solución al bug desktop de frmCriterios.vb)
        // -------------------------------------------------------------
        var includeSms = string.IsNullOrWhiteSpace(filtros.Canal) ||
                         string.Equals(filtros.Canal, "TODOS", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(filtros.Canal, "SMS", StringComparison.OrdinalIgnoreCase);

        if (includeSms)
        {
            var wsSms = workbook.Worksheets.Add("ENVIOS_SMS");
            ConfigurarEstiloCabeceraTuvSud(wsSms, "DETALLE INDIVIDUAL DE ENVÍOS SMS", filtros);

            var cabecerasDetalle = new[]
            {
                "CÓDIGO", "ESTACIÓN", "FECHA ENVÍO", "Nº INSPECCIÓN", "AÑO", "MATRÍCULA", "ID TIPO", "PLANTILLA", "TELÉFONO DESTINO", "NOMBRE", "APELLIDOS", "ESTADO", "CADUCIDAD"
            };

            for (int i = 0; i < cabecerasDetalle.Length; i++)
            {
                var cell = wsSms.Cell(filaInicioResumen, i + 1);
                cell.Value = cabecerasDetalle[i];
                FormatearCeldaCabeceraColumna(cell);
            }

            int filaSms = filaInicioResumen + 1;
            foreach (var d in detalle.Where(x => string.Equals(x.Canal, "SMS", StringComparison.OrdinalIgnoreCase)))
            {
                wsSms.Cell(filaSms, 1).SetValue(d.CodigoEstacion);
                wsSms.Cell(filaSms, 2).SetValue(d.NombreEstacion);
                wsSms.Cell(filaSms, 3).SetValue(d.FechaEnvio.ToString("dd/MM/yyyy HH:mm:ss"));
                wsSms.Cell(filaSms, 4).SetValue(d.NumeroInspeccion);
                wsSms.Cell(filaSms, 5).SetValue(d.AnioInspeccion);
                wsSms.Cell(filaSms, 6).SetValue(d.Matricula);
                wsSms.Cell(filaSms, 7).SetValue(d.IdPlantilla);
                wsSms.Cell(filaSms, 8).SetValue(d.DescripcionPlantilla);
                wsSms.Cell(filaSms, 9).SetValue(d.Destinatario);
                wsSms.Cell(filaSms, 10).SetValue(d.Nombre);
                wsSms.Cell(filaSms, 11).SetValue(d.Apellidos);
                wsSms.Cell(filaSms, 12).SetValue(d.EstadoEnvio);
                wsSms.Cell(filaSms, 13).SetValue(d.FechaCaducidad.HasValue ? d.FechaCaducidad.Value.ToString("dd/MM/yyyy") : "-");

                if (filaSms % 2 == 0)
                {
                    wsSms.Range(filaSms, 1, filaSms, 13).Style.Fill.BackgroundColor = XLColor.FromHtml("#F4F8FD");
                }
                filaSms++;
            }

            wsSms.Columns().AdjustToContents();
        }

        // -------------------------------------------------------------
        // HOJA 3: ENVIOS_EMAIL (Detalle de correos electrónicos)
        // -------------------------------------------------------------
        var includeMail = string.IsNullOrWhiteSpace(filtros.Canal) ||
                          string.Equals(filtros.Canal, "TODOS", StringComparison.OrdinalIgnoreCase) ||
                          string.Equals(filtros.Canal, "EMAIL", StringComparison.OrdinalIgnoreCase);

        if (includeMail)
        {
            var wsMail = workbook.Worksheets.Add("ENVIOS_EMAIL");
            ConfigurarEstiloCabeceraTuvSud(wsMail, "DETALLE INDIVIDUAL DE ENVÍOS EMAIL", filtros);

            var cabecerasDetalleMail = new[]
            {
                "CÓDIGO", "ESTACIÓN", "FECHA ENVÍO", "Nº INSPECCIÓN", "AÑO", "MATRÍCULA", "ID TIPO", "PLANTILLA", "EMAIL DESTINO", "NOMBRE", "APELLIDOS", "ESTADO", "CADUCIDAD"
            };

            for (int i = 0; i < cabecerasDetalleMail.Length; i++)
            {
                var cell = wsMail.Cell(filaInicioResumen, i + 1);
                cell.Value = cabecerasDetalleMail[i];
                FormatearCeldaCabeceraColumna(cell);
            }

            int filaMail = filaInicioResumen + 1;
            foreach (var d in detalle.Where(x => string.Equals(x.Canal, "EMAIL", StringComparison.OrdinalIgnoreCase)))
            {
                wsMail.Cell(filaMail, 1).SetValue(d.CodigoEstacion);
                wsMail.Cell(filaMail, 2).SetValue(d.NombreEstacion);
                wsMail.Cell(filaMail, 3).SetValue(d.FechaEnvio.ToString("dd/MM/yyyy HH:mm:ss"));
                wsMail.Cell(filaMail, 4).SetValue(d.NumeroInspeccion);
                wsMail.Cell(filaMail, 5).SetValue(d.AnioInspeccion);
                wsMail.Cell(filaMail, 6).SetValue(d.Matricula);
                wsMail.Cell(filaMail, 7).SetValue(d.IdPlantilla);
                wsMail.Cell(filaMail, 8).SetValue(d.DescripcionPlantilla);
                wsMail.Cell(filaMail, 9).SetValue(d.Destinatario);
                wsMail.Cell(filaMail, 10).SetValue(d.Nombre);
                wsMail.Cell(filaMail, 11).SetValue(d.Apellidos);
                wsMail.Cell(filaMail, 12).SetValue(d.EstadoEnvio);
                wsMail.Cell(filaMail, 13).SetValue(d.FechaCaducidad.HasValue ? d.FechaCaducidad.Value.ToString("dd/MM/yyyy") : "-");

                if (filaMail % 2 == 0)
                {
                    wsMail.Range(filaMail, 1, filaMail, 13).Style.Fill.BackgroundColor = XLColor.FromHtml("#F4F8FD");
                }
                filaMail++;
            }

            wsMail.Columns().AdjustToContents();
        }

        using var memoryStream = new MemoryStream();
        workbook.SaveAs(memoryStream);
        return memoryStream.ToArray();
    }

    private static void ConfigurarEstiloCabeceraTuvSud(IXLWorksheet ws, string titulo, FiltrosEnviosRecordatoriosRequestDto filtros)
    {
        // Título corporativo TÜV SÜD
        var titleRange = ws.Range(1, 1, 1, 8);
        titleRange.Merge();
        titleRange.Value = $"TÜV SÜD — {titulo}";
        titleRange.Style.Font.Bold = true;
        titleRange.Style.Font.FontSize = 14;
        titleRange.Style.Font.FontColor = XLColor.White;
        titleRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0046AD"); // Azul institucional TÜV SÜD
        titleRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        titleRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Row(1).Height = 28;

        // Subtítulo con rango de fechas y filtros aplicados
        var subRange = ws.Range(2, 1, 2, 8);
        subRange.Merge();
        var canalTexto = string.IsNullOrWhiteSpace(filtros.Canal) ? "TODOS" : filtros.Canal;
        var socTexto = string.IsNullOrWhiteSpace(filtros.CodEmpresa) ? "TODAS" : filtros.CodEmpresa;
        subRange.Value = $"Periodo: {filtros.FechaInicio:dd/MM/yyyy} a {filtros.FechaFin:dd/MM/yyyy} | Canal: {canalTexto} | Sociedad: {socTexto} | Generado: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
        subRange.Style.Font.FontSize = 9;
        subRange.Style.Font.FontColor = XLColor.FromHtml("#4A5D70");
        subRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#F0F4F8");
        ws.Row(2).Height = 18;
    }

    private static void FormatearCeldaCabeceraColumna(IXLCell cell)
    {
        cell.Style.Font.Bold = true;
        cell.Style.Font.FontSize = 10;
        cell.Style.Font.FontColor = XLColor.White;
        cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#003580");
        cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        cell.Style.Border.OutsideBorderColor = XLColor.FromHtml("#D0DAE5");
    }
}

