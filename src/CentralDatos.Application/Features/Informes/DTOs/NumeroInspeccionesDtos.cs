namespace CentralDatos.Application.Features.Informes.DTOs;

public sealed record FiltrosNumeroInspeccionesRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Sociedad = "TODAS",
    IReadOnlyList<string>? CodEstaciones = null
);

public sealed record FilaNumeroInspeccionesDto(
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string NombreEmpresa,
    string ClaveSociedad,
    int Favorables1,
    string Favorables1Formatted,
    int Rechazadas1,
    string Rechazadas1Formatted,
    int TotalFase1,
    string TotalFase1Formatted,
    decimal PorcentajeRechazoFase1,
    string PorcentajeRechazoFase1Formatted,
    int Favorables2,
    string Favorables2Formatted,
    int Rechazadas2,
    string Rechazadas2Formatted,
    int TotalFase2,
    string TotalFase2Formatted,
    decimal PorcentajeRechazoFase2,
    string PorcentajeRechazoFase2Formatted,
    int TotalFavorables,
    string TotalFavorablesFormatted,
    int TotalRechazadas,
    string TotalRechazadasFormatted,
    int TotalInspecciones,
    string TotalInspeccionesFormatted,
    decimal PorcentajeRechazoGlobal,
    string PorcentajeRechazoGlobalFormatted
);

public sealed record InformeNumeroInspeccionesResponseDto(
    IReadOnlyList<ReportKpiDto> Kpis,
    IReadOnlyList<ReportGraficoPointDto> GraficoBarras,
    IReadOnlyList<ReportGraficoPointDto> GraficoCuota,
    IReadOnlyList<FilaNumeroInspeccionesDto> Filas,
    int TotalInspeccionesGlobal,
    string TotalInspeccionesGlobalFormatted,
    int TotalFavorablesGlobal,
    string TotalFavorablesGlobalFormatted,
    int TotalRechazadasGlobal,
    string TotalRechazadasGlobalFormatted,
    decimal PorcentajeRechazoGlobal,
    string PorcentajeRechazoGlobalFormatted,
    int TotalFase1Global,
    int TotalFase2Global,
    int TotalEstaciones
);

