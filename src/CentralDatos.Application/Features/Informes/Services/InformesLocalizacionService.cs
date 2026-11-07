using System.Diagnostics;
using System.Globalization;
using System.Xml;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesLocalizacionService : IInformesLocalizacionService
{
    private const int MaxFilasGridWeb = 5000;
    private const int MaxFilasExportExcel = 300000;

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

    public async Task<(Stream Content, string FileName)> ExportarExcelAsync(
        FiltrosLocalizacionRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        if (filtros.FechaVencInicio.HasValue && filtros.FechaVencFin.HasValue)
        {
            ReportDateRangeValidator.Validar(filtros.FechaVencInicio.Value, filtros.FechaVencFin.Value);
        }

        var tipoNorm = (filtros.Tipo ?? "inspecciones").Trim().ToLowerInvariant();
        string nombreHoja = tipoNorm switch
        {
            "loc-defectos" or "defectos" => "DEFECTOS_LOCALIZADOS",
            "loc-elementos" or "elementos" => "ELEMENTOS_LOCALIZADOS",
            "loc-mediciones" or "mediciones" => "MEDICIONES_LOCALIZADAS",
            _ => "INSPECCIONES_LOCALIZADAS"
        };

        string tempPath = Path.Combine(Path.GetTempPath(), $"localizacion-{Guid.NewGuid():N}.xlsx");
        int numCols = 0;
        int filaActual = 1;
        int filasExportadas = 0;
        var exportTimer = Stopwatch.StartNew();
        IReadOnlyList<ColumnaResultadoLocalizacionDto> columnas = Array.Empty<ColumnaResultadoLocalizacionDto>();
        IReadOnlyList<string> filtrosAplicados = Array.Empty<string>();

        try
        {
            await using (var output = new FileStream(tempPath, new FileStreamOptions
            {
                Mode = FileMode.CreateNew,
                Access = FileAccess.ReadWrite,
                Share = FileShare.None,
                BufferSize = 1024 * 64,
                Options = FileOptions.SequentialScan,
            }))
            using (var document = SpreadsheetDocument.Create(output, SpreadsheetDocumentType.Workbook, true))
            {
                var workbookPart = document.AddWorkbookPart();
                workbookPart.Workbook = new Workbook();
                var stylesPart = workbookPart.AddNewPart<WorkbookStylesPart>();
                stylesPart.Stylesheet = CreateStylesheet();
                stylesPart.Stylesheet.Save();

                var worksheetPart = workbookPart.AddNewPart<WorksheetPart>();
                var sheets = workbookPart.Workbook.AppendChild(new Sheets());
                sheets.Append(new Sheet
                {
                    Id = workbookPart.GetIdOfPart(worksheetPart),
                    SheetId = 1,
                    Name = nombreHoja,
                });

                using (var writer = OpenXmlWriter.Create(worksheetPart))
                {
                    writer.WriteStartElement(new Worksheet());
                    writer.WriteStartElement(new SheetViews());
                    writer.WriteStartElement(new SheetView { WorkbookViewId = 0 });
                    writer.WriteElement(new Pane
                    {
                        VerticalSplit = 1,
                        TopLeftCell = "A2",
                        ActivePane = PaneValues.BottomLeft,
                        State = PaneStateValues.Frozen,
                    });
                    writer.WriteEndElement();
                    writer.WriteEndElement();

                    await _repository.EjecutarConsultaLocalizacionAsync(
                        filtros,
                        maxFilasRetorno: 0,
                        cancellationToken,
                        onMetadata: (columnasConsulta, filtrosConsulta, _) =>
                        {
                            columnas = columnasConsulta;
                            filtrosAplicados = filtrosConsulta;
                            numCols = columnas.Count;

                            writer.WriteStartElement(new Columns());
                            for (int i = 0; i < numCols; i++)
                            {
                                writer.WriteElement(new Column
                                {
                                    Min = (uint)(i + 1),
                                    Max = (uint)(i + 1),
                                    Width = Math.Clamp(columnas[i].ColumnaExcel.Length + 4, 14, 42),
                                    CustomWidth = true,
                                });
                            }
                            writer.WriteEndElement();

                            writer.WriteStartElement(new SheetData());
                            writer.WriteStartElement(new Row { RowIndex = 1 });
                            for (int i = 0; i < numCols; i++)
                            {
                                WriteInlineStringCell(writer, CellReference(i, 1), columnas[i].ColumnaExcel, 1);
                            }
                            writer.WriteEndElement();
                            return Task.CompletedTask;
                        },
                        onRow: (fila, token) =>
                        {
                            token.ThrowIfCancellationRequested();
                            if (filasExportadas >= MaxFilasExportExcel)
                            {
                                throw new ArgumentException(
                                    $"La consulta supera el límite de {MaxFilasExportExcel:N0} registros por exportación. Reduzca el rango de fechas o añada filtros.");
                            }

                            filasExportadas++;
                            filaActual++;
                            writer.WriteStartElement(new Row { RowIndex = (uint)filaActual });
                            for (int i = 0; i < numCols; i++)
                            {
                                var col = columnas[i];
                                var value = fila[i];
                                if (value != null)
                                {
                                    WriteDataCell(writer, CellReference(i, filaActual), col, value);
                                }
                            }
                            writer.WriteEndElement();
                            return Task.CompletedTask;
                        });

                    if (filtrosAplicados.Count > 0)
                    {
                        filaActual += 2;
                        foreach (var filtro in filtrosAplicados)
                        {
                            cancellationToken.ThrowIfCancellationRequested();
                            filaActual++;
                            writer.WriteStartElement(new Row { RowIndex = (uint)filaActual });
                            WriteInlineStringCell(writer, CellReference(0, filaActual), filtro, 4);
                            writer.WriteEndElement();
                        }
                    }

                    int ultimaFilaDatos = filasExportadas + 1;
                    writer.WriteEndElement();
                    if (numCols > 0 && filasExportadas > 0)
                    {
                        writer.WriteElement(new AutoFilter
                        {
                            Reference = $"A1:{CellReference(numCols - 1, ultimaFilaDatos)}",
                        });
                    }

                    writer.WriteEndElement();
                }

                workbookPart.Workbook.Save();
                cancellationToken.ThrowIfCancellationRequested();
                await output.FlushAsync(cancellationToken);
            }

            var downloadStream = new FileStream(tempPath, new FileStreamOptions
            {
                Mode = FileMode.Open,
                Access = FileAccess.Read,
                Share = FileShare.Read,
                BufferSize = 1024 * 64,
                Options = FileOptions.SequentialScan,
            });
            _logger.LogInformation(
                "Exportación de Localización {Tipo}: completada en {ElapsedMs} ms; filas {Rows}; archivo {FileSizeBytes} bytes.",
                tipoNorm,
                exportTimer.ElapsedMilliseconds,
                filasExportadas,
                downloadStream.Length);
            return (downloadStream, $"{nombreHoja}_{filtros.FechaInicio:yyyyMMdd}_{filtros.FechaFin:yyyyMMdd}.xlsx");
        }
        catch
        {
            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }
            throw;
        }
    }

    private static Stylesheet CreateStylesheet()
    {
        return new Stylesheet(
            new NumberingFormats(
                new NumberingFormat { NumberFormatId = 164, FormatCode = "dd/mm/yyyy" },
                new NumberingFormat { NumberFormatId = 165, FormatCode = "dd/mm/yyyy hh:mm:ss" })
            { Count = 2 },
            new Fonts(
                new Font(),
                new Font(new Bold(), new Color { Rgb = "FF0B253B" }),
                new Font(new Italic(), new Color { Rgb = "FF334155" }))
            { Count = 3 },
            new Fills(
                new Fill(new PatternFill { PatternType = PatternValues.None }),
                new Fill(new PatternFill { PatternType = PatternValues.Gray125 }),
                new Fill(new PatternFill(
                    new ForegroundColor { Rgb = "FFF1F5F9" },
                    new BackgroundColor { Indexed = 64 })
                { PatternType = PatternValues.Solid }))
            { Count = 3 },
            new Borders(
                new Border(),
                new Border(
                    new LeftBorder { Style = BorderStyleValues.Thin, Color = new Color { Rgb = "FFCBD5E1" } },
                    new RightBorder { Style = BorderStyleValues.Thin, Color = new Color { Rgb = "FFCBD5E1" } },
                    new TopBorder { Style = BorderStyleValues.Thin, Color = new Color { Rgb = "FFCBD5E1" } },
                    new BottomBorder { Style = BorderStyleValues.Thin, Color = new Color { Rgb = "FFCBD5E1" } },
                    new DiagonalBorder()))
            { Count = 2 },
            new CellFormats(
                new CellFormat(),
                new CellFormat { FontId = 1, FillId = 2, BorderId = 1, ApplyFont = true, ApplyFill = true, ApplyBorder = true },
                new CellFormat { NumberFormatId = 164, ApplyNumberFormat = true },
                new CellFormat { NumberFormatId = 165, ApplyNumberFormat = true },
                new CellFormat { FontId = 2, ApplyFont = true })
            { Count = 5 });
    }

    private static void WriteDataCell(
        OpenXmlWriter writer,
        string reference,
        ColumnaResultadoLocalizacionDto column,
        object value)
    {
        string text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
        if (DateTime.TryParseExact(
                text,
                ["dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy"],
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var date))
        {
            writer.WriteStartElement(new Cell
            {
                CellReference = reference,
                DataType = CellValues.Number,
                StyleIndex = text.Length > 10 ? 3U : 2U,
            });
            writer.WriteElement(new CellValue(date.ToOADate().ToString(CultureInfo.InvariantCulture)));
            writer.WriteEndElement();
            return;
        }

        if ((column.TipoDato.Equals("N", StringComparison.OrdinalIgnoreCase) ||
             column.TipoDato.Equals("E", StringComparison.OrdinalIgnoreCase) ||
             column.TipoDato.Equals("M", StringComparison.OrdinalIgnoreCase)) &&
            decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out var number))
        {
            writer.WriteStartElement(new Cell { CellReference = reference, DataType = CellValues.Number });
            writer.WriteElement(new CellValue(number.ToString(CultureInfo.InvariantCulture)));
            writer.WriteEndElement();
            return;
        }

        WriteInlineStringCell(writer, reference, text, 0);
    }

    private static void WriteInlineStringCell(OpenXmlWriter writer, string reference, string value, uint styleIndex)
    {
        var cell = new Cell
        {
            CellReference = reference,
            DataType = CellValues.InlineString,
            StyleIndex = styleIndex,
        };
        writer.WriteStartElement(cell);
        writer.WriteElement(new InlineString(new Text(XmlConvert.VerifyXmlChars(value))
        {
            Space = SpaceProcessingModeValues.Preserve,
        }));
        writer.WriteEndElement();
    }

    private static string CellReference(int zeroBasedColumn, int row)
    {
        var columnName = string.Empty;
        for (int value = zeroBasedColumn + 1; value > 0; value = (value - 1) / 26)
        {
            columnName = (char)('A' + (value - 1) % 26) + columnName;
        }
        return $"{columnName}{row}";
    }
}
