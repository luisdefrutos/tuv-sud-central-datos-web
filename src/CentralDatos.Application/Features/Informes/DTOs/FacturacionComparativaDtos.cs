namespace CentralDatos.Application.Features.Informes.DTOs;

public record FiltrosFacturacionComparativaRequestDto(
    DateTime FechaInicioRango1,
    DateTime FechaFinRango1,
    DateTime FechaInicioRango2,
    DateTime FechaFinRango2,
    IReadOnlyList<string>? CodigosEstaciones = null,
    string? Sociedad = null
);

public record FilaFacturacionComparativaDto(
    string CodEstacion,
    string DesEstacion,
    string Sociedad,
    int TotalInspecciones1,
    decimal TotalIngresos1,
    string TotalIngresos1Formatted,
    decimal MediaIngreso1,
    string MediaIngreso1Formatted,
    int TotalInspecciones2,
    decimal TotalIngresos2,
    string TotalIngresos2Formatted,
    decimal MediaIngreso2,
    string MediaIngreso2Formatted,
    int DifInspecciones,
    string DifInspeccionesFormatted,
    decimal PorcentajeDifInspecciones,
    string PorcentajeDifInspeccionesFormatted,
    decimal DifIngresos,
    string DifIngresosFormatted,
    decimal PorcentajeDifIngresos,
    string PorcentajeDifIngresosFormatted
);

public record KpiFacturacionComparativaDto(
    string Id,
    string Titulo,
    string Valor,
    string Subtitulo,
    string Variant,
    string Icon,
    decimal? PorcentajeVariacion = null
);

public record GraficoFacturacionComparativaDto(
    string CodEstacion,
    string EstacionNombre,
    string Sociedad,
    int Inspecciones1,
    int Inspecciones2,
    decimal Ingresos1,
    decimal Ingresos2,
    string Ingresos1Formatted,
    string Ingresos2Formatted,
    decimal PorcentajeVariacionIngresos
);

public record TotalesSociedadFacturacionDto(
    string Sociedad,
    int TotalInspecciones1,
    decimal TotalIngresos1,
    string TotalIngresos1Formatted,
    int TotalInspecciones2,
    decimal TotalIngresos2,
    string TotalIngresos2Formatted,
    decimal DifIngresos,
    string DifIngresosFormatted,
    decimal PorcentajeDifIngresos,
    string PorcentajeDifIngresosFormatted,
    int DifInspecciones,
    string DifInspeccionesFormatted,
    decimal PorcentajeDifInspecciones,
    string PorcentajeDifInspeccionesFormatted
);

public record InformeFacturacionComparativaResponseDto(
    string Rango1Label,
    string Rango2Label,
    IReadOnlyList<FilaFacturacionComparativaDto> Filas,
    int TotalRegistros,
    IReadOnlyList<TotalesSociedadFacturacionDto> TotalesPorSociedad,
    TotalesSociedadFacturacionDto TotalGlobal,
    IReadOnlyList<KpiFacturacionComparativaDto> Kpis,
    IReadOnlyList<GraficoFacturacionComparativaDto> GraficoEstaciones
);

