using System.Globalization;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using ClosedXML.Excel;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesLocalizacionService : IInformesLocalizacionService
{
    private const int MaxFilasGridWeb = 5000;
    private const int MaxFilasExportExcel = 150000;

    private readonly IInformesRepository _repository;
    private readonly ILogger<InformesLocalizacionService> _logger;

    public InformesLocalizacionService(
        IInformesRepository repository,
        ILogger<InformesLocalizacionService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<CatalogosLocalizacionResponseDto> ObtenerCatalogosAsync(
        string tipo,
        CancellationToken cancellationToken = default)
    {
        return _repository.ObtenerCatalogosLocalizacionAsync(tipo, cancellationToken);
    }

    public Task<IReadOnlyList<OpcionComboLocalizacionDto>> ObtenerBloquesPorSeccionAsync(
        string? seccionManual,
        CancellationToken cancellationToken = default)
    {
        return _repository.ObtenerBloquesLocalizacionAsync(seccionManual, cancellationToken);
    }

    public Task<IReadOnlyList<OpcionComboLocalizacionDto>> ObtenerElementosPorBloqueAsync(
        string bloque,
        string? seccionManual = null,
        CancellationToken cancellationToken = default)
    {
        return _repository.ObtenerElementosLocalizacionAsync(bloque, seccionManual, cancellationToken);
    }

    public Task<IReadOnlyList<SubdefectoLocalizacionDto>> ObtenerSubdefectosAsync(
        string bloque,
        string defecto,
        string? seccionManual = null,
        CancellationToken cancellationToken = default)
    {
        return _repository.ObtenerSubdefectosLocalizacionAsync(bloque, defecto, seccionManual, cancellationToken);
    }

    public async Task<LocalizacionResponseDto> ConsultarLocalizacionAsync(
        FiltrosLocalizacionRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        if (filtros.FechaVencInicio.HasValue && filtros.FechaVencFin.HasValue)
        {
            ReportDateRangeValidator.Validar(filtros.FechaVencInicio.Value, filtros.FechaVencFin.Value);
        }

        var raw = await _repository.EjecutarConsultaLocalizacionAsync(filtros, MaxFilasGridWeb, cancellationToken);

        int estacionesConDatos = raw.ConteoPorEstacion.Count;
        string estacionLider = "Sin datos";
        int registrosLider = 0;

        if (raw.ConteoPorEstacion.Count > 0)
        {
            var top = raw.ConteoPorEstacion.OrderByDescending(kv => kv.Value).First();
            estacionLider = $"ITV {top.Key}";
            registrosLider = top.Value;
        }

        var graficoPorEstacion = raw.ConteoPorEstacion
            .OrderByDescending(kv => kv.Value)
            .Select(kv =>
            {
                double pct = raw.TotalRegistros > 0
                    ? Math.Round((double)kv.Value / raw.TotalRegistros * 100, 1)
                    : 0;
                return new GraficoPuntoLocalizacionDto(
                    Clave: kv.Key,
                    Etiqueta: $"ITV {kv.Key}",
                    Valor: kv.Value,
                    ValorFormateado: $"{kv.Value:N0} reg. ({pct}%)",
                    Subtitulo: $"Estación {kv.Key}: {kv.Value:N0} registros localizados",
                    Color: "#0046ad"
                );
            })
            .ToList();

        var kpis = new KpisLocalizacionDto(
            TotalRegistros: raw.TotalRegistros,
            EstacionesConDatos: estacionesConDatos,
            EstacionLider: estacionLider,
            RegistrosEstacionLider: registrosLider,
            ColumnasActivas: raw.Columnas.Count,
            TotalColumnasDisponibles: raw.TotalColumnasDisponibles,
            FiltrosAplicadosCount: raw.FiltrosAplicados.Count,
            MostrandoRegistrosGrid: raw.Filas.Count,
            TruncadoEnGrid: raw.Truncado
        );

        return new LocalizacionResponseDto(
            Tipo: filtros.Tipo,
            Kpis: kpis,
            Columnas: raw.Columnas,
            Filas: raw.Filas,
            FiltrosAplicados: raw.FiltrosAplicados,
            GraficoPorEstacion: graficoPorEstacion
        );
    }

    public async Task<(byte[] Content, string FileName)> ExportarExcelAsync(
        FiltrosLocalizacionRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        if (filtros.FechaVencInicio.HasValue && filtros.FechaVencFin.HasValue)
        {
            ReportDateRangeValidator.Validar(filtros.FechaVencInicio.Value, filtros.FechaVencFin.Value);
        }

        var raw = await _repository.EjecutarConsultaLocalizacionAsync(filtros, MaxFilasExportExcel, cancellationToken);
        if (raw.TotalRegistros > MaxFilasExportExcel)
        {
            throw new ArgumentException(
                $"La consulta contiene {raw.TotalRegistros:N0} registros y supera el límite actual de {MaxFilasExportExcel:N0} filas por exportación. Reduzca el rango de fechas o añada filtros.");
        }
        cancellationToken.ThrowIfCancellationRequested();

        var tipoNorm = (filtros.Tipo ?? "inspecciones").Trim().ToLowerInvariant();
        string nombreHoja = tipoNorm switch
        {
            "loc-defectos" or "defectos" => "DEFECTOS_LOCALIZADOS",
            "loc-elementos" or "elementos" => "ELEMENTOS_LOCALIZADOS",
            "loc-mediciones" or "mediciones" => "MEDICIONES_LOCALIZADAS",
            _ => "INSPECCIONES_LOCALIZADAS"
        };

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add(nombreHoja);

        int numCols = raw.Columnas.Count;

        // 1. Cabeceras oficiales de columna (Fila 1)
        for (int c = 0; c < numCols; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = raw.Columnas[c].ColumnaExcel;
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            cell.Style.Font.FontColor = XLColor.FromHtml("#0B253B");
        }

        // 2. Volcado de filas de datos
        int rowIdx = 2;
        foreach (var fila in raw.Filas)
        {
            cancellationToken.ThrowIfCancellationRequested();
            for (int c = 0; c < numCols; c++)
            {
                var colMeta = raw.Columnas[c];
                if (!fila.TryGetValue(colMeta.ColumnaExcel, out var val) || val == null)
                {
                    continue;
                }

                var cell = ws.Cell(rowIdx, c + 1);
                if (val is decimal decVal)
                {
                    cell.Value = decVal;
                }
                else if (val is int intVal)
                {
                    cell.Value = intVal;
                }
                else if (val is double dblVal)
                {
                    cell.Value = dblVal;
                }
                else
                {
                    var strVal = Convert.ToString(val, CultureInfo.InvariantCulture) ?? string.Empty;
                    if ((colMeta.TipoDato.Equals("N", StringComparison.OrdinalIgnoreCase) ||
                         colMeta.TipoDato.Equals("E", StringComparison.OrdinalIgnoreCase) ||
                         colMeta.TipoDato.Equals("M", StringComparison.OrdinalIgnoreCase)) &&
                        decimal.TryParse(strVal, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsedDec))
                    {
                        cell.Value = parsedDec;
                    }
                    else
                    {
                        cell.Value = strVal;
                    }
                }
            }
            rowIdx++;
        }

        int ultimaFilaTabla = Math.Max(1, rowIdx - 1);
        if (numCols > 0)
        {
            var tableRange = ws.Range(1, 1, ultimaFilaTabla, numCols);
            tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
            tableRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#CBD5E1");
            tableRange.Style.Border.InsideBorderColor = XLColor.FromHtml("#E2E8F0");
        }

        // 3. Bloques de Filtros Aplicados al pie (Exactamente en Rows.Count + 3 + z, Columna 1 como en la app de escritorio)
        int filaInicioFiltros = raw.Filas.Count + 4;
        for (int z = 0; z < raw.FiltrosAplicados.Count; z++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var filterCell = ws.Cell(filaInicioFiltros + z, 1);
            filterCell.Value = raw.FiltrosAplicados[z];
            filterCell.Style.Font.Italic = true;
            filterCell.Style.Font.FontColor = XLColor.FromHtml("#334155");
        }

        // Ajuste de ancho de columnas (con límite de filas muestreadas para no penalizar CPU en exportaciones grandes)
        cancellationToken.ThrowIfCancellationRequested();
        ws.Columns(1, Math.Max(1, numCols)).AdjustToContents(1, Math.Min(ultimaFilaTabla, 500), 10, 55);

        using var ms = new MemoryStream();
        cancellationToken.ThrowIfCancellationRequested();
        workbook.SaveAs(ms);
        cancellationToken.ThrowIfCancellationRequested();

        string fileName = $"{nombreHoja}_{filtros.FechaInicio:yyyyMMdd}_{filtros.FechaFin:yyyyMMdd}.xlsx";
        return (ms.ToArray(), fileName);
    }
}
