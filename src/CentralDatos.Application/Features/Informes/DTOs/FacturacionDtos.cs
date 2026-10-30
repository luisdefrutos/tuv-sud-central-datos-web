namespace CentralDatos.Application.Features.Informes.DTOs;

public sealed record FiltrosFacturacionRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Sociedad = "TODAS",
    IReadOnlyList<string>? CodEstaciones = null
);

public sealed record ReportKpiDto(
    string Id,
    string Titulo,
    string Valor,
    string? Subtitulo = null,
    string Variant = "primary",
    string? Icon = null
);

public sealed record ReportGraficoPointDto(
    string Id,
    string Label,
    decimal Valor,
    string ValorFormateado,
    string Sociedad,
    string Color
);

public sealed record FilaFacturacionDto(
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string NombreEmpresa,
    string ClaveSociedad,
    int TotalInspecciones,
    decimal TotalIngresos,
    string TotalIngresosFormatted,
    decimal TicketMedio,
    string TicketMedioFormatted,
    
    // Desglose Crystal Report (rptResumenInspecciones)
    int ContadosNumInspecciones = 0,
    decimal ContadosBase = 0m,
    decimal ContadosIva = 0m,
    decimal ContadosTasas = 0m,
    decimal ContadosTotal = 0m,

    int TercerosNumInspecciones = 0,
    decimal TercerosBase = 0m,
    decimal TercerosIva = 0m,
    decimal TercerosTasas = 0m,
    decimal TercerosTotal = 0m,

    int TarjetasNumInspecciones = 0,
    decimal TarjetasBase = 0m,
    decimal TarjetasIva = 0m,
    decimal TarjetasTasas = 0m,
    decimal TarjetasTotal = 0m,

    int TotalesNumInspecciones = 0,
    decimal TotalesBase = 0m,
    decimal TotalesIva = 0m,
    decimal TotalesTasas = 0m,
    decimal TotalesTasasTrafico = 0m,
    decimal TotalesTasasIndustria = 0m,
    decimal TotalesTotal = 0m,
    int Gratuitas = 0
);

public sealed record InformeFacturacionResponseDto(
    IReadOnlyList<ReportKpiDto> Kpis,
    IReadOnlyList<ReportGraficoPointDto> Grafico,
    IReadOnlyList<FilaFacturacionDto> Filas,
    decimal TotalFacturacion,
    int TotalInspecciones,
    decimal TicketMedioGlobal,
    string TotalFacturacionFormatted,
    string TicketMedioGlobalFormatted,
    int TotalEstaciones
);

