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

public class InformesClientesVolumenService : IInformesClientesVolumenService
{
    private readonly IInformesRepository _repository;
    private readonly ILogger<InformesClientesVolumenService> _logger;

    public InformesClientesVolumenService(
        IInformesRepository repository,
        ILogger<InformesClientesVolumenService> logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<ClientesVolumenResponseDto> GenerarInformeClientesVolumenAsync(
        ClientesVolumenFiltroDto filtro,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtro.FechaInicio, filtro.FechaFin);

        string? codEmpresa = filtro.Sociedad?.Trim().ToUpperInvariant() switch
        {
            "TSA" or "01" => "01",
            "CAL" or "03" => "03",
            _ => null
        };

        string? fase = filtro.Fase?.Trim() switch
        {
            "1" => "1",
            "2" => "2",
            _ => null
        };

        int limite = filtro.LimiteCuenta > 0 ? filtro.LimiteCuenta : 1;

        var datos = await _repository.ObtenerClientesVolumenAsync(
            filtro.FechaInicio,
            filtro.FechaFin,
            limite,
            codEmpresa,
            filtro.Estaciones,
            fase,
            filtro.IdProyecto,
            filtro.TiposVehiculo,
            cancellationToken);

        int totalInspecciones = datos.Sum(d => d.Cuenta);
        int totalClientes = datos.Select(d => d.CifTitular).Distinct().Count();
        int totalFavorables = datos.Where(d => d.Resultado == "FAV").Sum(d => d.Cuenta);
        int totalDesfavorables = totalInspecciones - totalFavorables;

        var filasDto = datos.Select(d => new ClientesVolumenFilaDto
        {
            CodEstacion = d.CodEstacion,
            DesEstacion = d.DesEstacion,
            ClaveSociedad = d.ClaveSociedad,
            CifFactura = d.CifFactura,
            CifTitular = d.CifTitular,
            NombreCliente = d.NombreCliente,
            Domicilio = d.Domicilio,
            CodigoPostal = d.CodigoPostal,
            Poblacion = d.Poblacion,
            Provincia = d.Provincia,
            Telefono = d.Telefono,
            Telefono2 = d.Telefono2,
            Resultado = d.Resultado,
            Cuenta = d.Cuenta,
            CuentaCif = d.CuentaCif
        }).ToList();

        // Cliente con mayor volumen (agrupado estrictamente por CIF único)
        var clienteTop = datos
            .GroupBy(d => d.CifTitular)
            .Select(g =>
            {
                var primerNombre = g.OrderByDescending(x => x.Cuenta).First().NombreCliente;
                return new { CifTitular = g.Key, NombreCliente = primerNombre, Total = g.Sum(x => x.Cuenta) };
            })
            .OrderByDescending(x => x.Total)
            .FirstOrDefault();

        double pctFavorables = totalInspecciones > 0
            ? Math.Round((double)totalFavorables / totalInspecciones * 100, 1)
            : 0;

        var kpis = new List<ClientesVolumenKpiDto>
        {
            new()
            {
                Id = "total-clientes",
                Titulo = "Clientes con Flota (Titulares)",
                Valor = totalClientes.ToString("N0", new CultureInfo("es-ES")),
                Subtitulo = $"Umbral >= {limite} inspecciones",
                Icon = "👥",
                Variant = "neutral"
            },
            new()
            {
                Id = "total-inspecciones",
                Titulo = "Inspecciones de Grandes Cuentas",
                Valor = totalInspecciones.ToString("N0", new CultureInfo("es-ES")),
                Subtitulo = "Suma total acumulada en periodo",
                Icon = "🚗",
                Variant = "info"
            },
            new()
            {
                Id = "cliente-top",
                Titulo = "Cliente Mayor Demanda",
                Valor = clienteTop != null ? $"{clienteTop.Total:N0} insp." : "N/D",
                Subtitulo = clienteTop != null
                    ? (!string.IsNullOrWhiteSpace(clienteTop.NombreCliente) ? clienteTop.NombreCliente : clienteTop.CifTitular)
                    : "Sin registros en el rango",
                Icon = "🏆",
                Variant = "primary"
            },
            new()
            {
                Id = "ratio-favorables",
                Titulo = "Aprobados en Flotas",
                Valor = $"{pctFavorables}%",
                Subtitulo = $"{totalFavorables:N0} fav. vs {totalDesfavorables:N0} rech.",
                Icon = "✅",
                Variant = pctFavorables >= 80 ? "success" : "warning"
            }
        };

        // Gráfico 1: Top 10 Clientes por Inspecciones (agrupado estrictamente por CIF único)
        var graficoTopClientes = datos
            .GroupBy(d => d.CifTitular)
            .Select(g =>
            {
                int tot = g.Sum(x => x.Cuenta);
                var primerNombre = g.OrderByDescending(x => x.Cuenta).First().NombreCliente;
                string label = !string.IsNullOrWhiteSpace(primerNombre)
                    ? (primerNombre.Length > 24 ? primerNombre.Substring(0, 22) + "…" : primerNombre)
                    : g.Key;
                return new GraficoPuntoClienteDto(
                    g.Key,
                    label,
                    tot,
                    $"{tot:N0} insp.",
                    $"{g.Key} - {primerNombre}",
                    "#0046ad"
                );
            })
            .OrderByDescending(x => x.Valor)
            .Take(10)
            .ToList();

        // Gráfico 2: Distribución por Estación
        var graficoEstaciones = datos
            .GroupBy(d => new { d.CodEstacion, d.DesEstacion, d.ClaveSociedad })
            .Select(g =>
            {
                int tot = g.Sum(x => x.Cuenta);
                string color = g.Key.ClaveSociedad == "CAL" ? "#00875a" : "#0046ad";
                return new GraficoPuntoClienteDto(
                    g.Key.CodEstacion,
                    $"{g.Key.CodEstacion} - {g.Key.DesEstacion}",
                    tot,
                    $"{tot:N0} insp.",
                    $"{g.Key.ClaveSociedad}: {tot:N0} inspecciones de flota",
                    color
                );
            })
            .OrderByDescending(x => x.Valor)
            .ToList();

        return new ClientesVolumenResponseDto
        {
            FechaInicio = filtro.FechaInicio,
            FechaFin = filtro.FechaFin,
            TotalClientes = totalClientes,
            TotalInspecciones = totalInspecciones,
            TotalFavorables = totalFavorables,
            TotalDesfavorables = totalDesfavorables,
            Kpis = kpis,
            Filas = filasDto,
            GraficoTopClientes = graficoTopClientes,
            GraficoEstaciones = graficoEstaciones
        };
    }

    public async Task<byte[]> ExportarExcelAsync(
        ClientesVolumenFiltroDto filtro,
        CancellationToken cancellationToken = default)
    {
        ReportDateRangeValidator.Validar(filtro.FechaInicio, filtro.FechaFin);

        string? codEmpresa = filtro.Sociedad?.Trim().ToUpperInvariant() switch
        {
            "TSA" or "01" => "01",
            "CAL" or "03" => "03",
            _ => null
        };

        string? fase = filtro.Fase?.Trim() switch
        {
            "1" => "1",
            "2" => "2",
            _ => null
        };

        int limite = filtro.LimiteCuenta > 0 ? filtro.LimiteCuenta : 1;

        var datos = await _repository.ObtenerClientesVolumenAsync(
            filtro.FechaInicio,
            filtro.FechaFin,
            limite,
            codEmpresa,
            filtro.Estaciones,
            fase,
            filtro.IdProyecto,
            filtro.TiposVehiculo,
            cancellationToken);

        using var workbook = new XLWorkbook();
        var esCulture = new CultureInfo("es-ES");

        // Pestaña 1: TOTAL_CLIENTES_CONSOLIDADO
        var wsConsolidado = workbook.Worksheets.Add("TOTAL_CLIENTES_CONSOLIDADO");
        EscribirCabeceraExcel(wsConsolidado);

        int filaConsolidado = 2;
        foreach (var item in datos)
        {
            EscribirFilaExcel(wsConsolidado, filaConsolidado++, item, esCulture);
        }

        EscribirFilaTotal(wsConsolidado, filaConsolidado, datos.Sum(d => d.Cuenta), esCulture);
        AjustarFormatoHoja(wsConsolidado);

        // Pestañas individuales por estación
        var gruposEstacion = datos.GroupBy(d => d.CodEstacion).OrderBy(g => g.Key);
        foreach (var grupo in gruposEstacion)
        {
            string nombreHoja = $"CLIENTES_VOLUMEN_{grupo.Key}";
            if (nombreHoja.Length > 31)
                nombreHoja = nombreHoja.Substring(0, 31);

            var wsEstacion = workbook.Worksheets.Add(nombreHoja);
            EscribirCabeceraExcel(wsEstacion);

            int filaEst = 2;
            foreach (var item in grupo)
            {
                EscribirFilaExcel(wsEstacion, filaEst++, item, esCulture);
            }

            EscribirFilaTotal(wsEstacion, filaEst, grupo.Sum(d => d.Cuenta), esCulture);
            AjustarFormatoHoja(wsEstacion);
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static void EscribirCabeceraExcel(IXLWorksheet ws)
    {
        string[] cabeceras =
        {
            "Estación", "Nombre Estación", "CIF Factura", "CIF Titular",
            "Nombre / Razón Social", "Domicilio", "C.P.", "Población",
            "Provincia", "Teléfono", "Teléfono 2", "Resultado", "Inspecciones", "Total Cliente (CIF)"
        };

        for (int col = 1; col <= cabeceras.Length; col++)
        {
            var cell = ws.Cell(1, col);
            cell.Value = cabeceras[col - 1];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0046ad");
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        }
        ws.Row(1).Height = 26;
    }

    private static void EscribirFilaExcel(IXLWorksheet ws, int fila, ClienteVolumenDato d, CultureInfo culture)
    {
        ws.Cell(fila, 1).SetValue(d.CodEstacion);
        ws.Cell(fila, 2).SetValue(d.DesEstacion);
        ws.Cell(fila, 3).SetValue(d.CifFactura);
        ws.Cell(fila, 4).SetValue(d.CifTitular);
        ws.Cell(fila, 5).SetValue(d.NombreCliente);
        ws.Cell(fila, 6).SetValue(d.Domicilio);
        ws.Cell(fila, 7).SetValue(d.CodigoPostal);
        ws.Cell(fila, 8).SetValue(d.Poblacion);
        ws.Cell(fila, 9).SetValue(d.Provincia);
        ws.Cell(fila, 10).SetValue(d.Telefono);
        ws.Cell(fila, 11).SetValue(d.Telefono2);
        ws.Cell(fila, 12).SetValue(d.Resultado);
        
        var cellCuenta = ws.Cell(fila, 13);
        cellCuenta.SetValue(d.Cuenta);
        cellCuenta.Style.NumberFormat.Format = "#,##0";
        cellCuenta.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        var cellTotalCif = ws.Cell(fila, 14);
        cellTotalCif.SetValue(d.CuentaCif);
        cellTotalCif.Style.NumberFormat.Format = "#,##0";
        cellTotalCif.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
    }

    private static void EscribirFilaTotal(IXLWorksheet ws, int fila, int totalInspecciones, CultureInfo culture)
    {
        ws.Range(fila, 1, fila, 12).Merge();
        var cellTotalLabel = ws.Cell(fila, 1);
        cellTotalLabel.Value = "TOTAL INSPECCIONES";
        cellTotalLabel.Style.Font.Bold = true;
        cellTotalLabel.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        cellTotalLabel.Style.Fill.BackgroundColor = XLColor.FromHtml("#f1f5f9");

        var cellTotalVal = ws.Cell(fila, 13);
        cellTotalVal.SetValue(totalInspecciones);
        cellTotalVal.Style.Font.Bold = true;
        cellTotalVal.Style.NumberFormat.Format = "#,##0";
        cellTotalVal.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        cellTotalVal.Style.Fill.BackgroundColor = XLColor.FromHtml("#f1f5f9");

        var cellTotalBlank = ws.Cell(fila, 14);
        cellTotalBlank.Value = string.Empty;
        cellTotalBlank.Style.Fill.BackgroundColor = XLColor.FromHtml("#f1f5f9");
    }

    private static void AjustarFormatoHoja(IXLWorksheet ws)
    {
        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(1);
    }

    public async Task<IReadOnlyList<ProyectoComercialDto>> ObtenerProyectosComercialesAsync(CancellationToken cancellationToken = default)
    {
        return await _repository.ObtenerProyectosComercialesAsync(cancellationToken);
    }

    public Task<IReadOnlyList<TipoVehiculoMinerDto>> ObtenerTiposVehiculoMinerAsync(CancellationToken cancellationToken = default)
    {
        var lista = new List<TipoVehiculoMinerDto>
        {
            new("MO", "MOTOCICLETAS"),
            new("TP", "TURISMOS PARTICULARES"),
            new("TR", "RESTO DE TURISMOS"),
            new("MP", "MERCANCIAS <= 3.500 KG."),
            new("MG", "MERCANCIAS > 3.500 KG."),
            new("AU", "AUTOBUSES"),
            new("RS", "REMOLQUES Y SEMIRREMOLQUES"),
            new("AG", "TRACTORES Y MAQ. AGRICOLA"),
            new("OT", "OTROS VEHICULOS")
        };

        return Task.FromResult<IReadOnlyList<TipoVehiculoMinerDto>>(lista);
    }
}

