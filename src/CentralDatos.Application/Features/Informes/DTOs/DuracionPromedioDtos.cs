namespace CentralDatos.Application.Features.Informes.DTOs;

public record FiltrosDuracionPromedioRequestDto(
    string FechaInicio,
    string FechaFin,
    string Sociedad = "TODAS",
    IReadOnlyList<string>? CodEstaciones = null,
    string? Fase = "TODAS"
);

public record FilaDuracionPromedioDto(
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string NombreEmpresa,
    string ClaveSociedad,
    string TipoVehiculo,
    int OrdenTipo,
    int TotalInspecciones,
    decimal DuracionPromedioMinutos,
    string DuracionFormateada
);

public record ResumenEstacionDuracionDto(
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string NombreEmpresa,
    string ClaveSociedad,
    int TotalInspecciones,
    decimal DuracionPromedioMinutos,
    string DuracionFormateada
);

public record ResumenTipoVehiculoDuracionDto(
    string TipoVehiculo,
    int OrdenTipo,
    int TotalInspecciones,
    decimal DuracionPromedioMinutos,
    string DuracionFormateada
);

public record InformeDuracionPromedioResponseDto(
    string FechaInicio,
    string FechaFin,
    string Fase,
    int TotalInspeccionesGlobal,
    decimal DuracionPromedioGlobalMinutos,
    string DuracionPromedioGlobalFormateada,
    string EstacionMasRapida,
    string DuracionEstacionMasRapida,
    string TipoVehiculoMasRapido,
    string DuracionTipoVehiculoMasRapido,
    IReadOnlyList<FilaDuracionPromedioDto> Filas,
    IReadOnlyList<ResumenEstacionDuracionDto> ResumenEstaciones,
    IReadOnlyList<ResumenTipoVehiculoDuracionDto> ResumenTiposVehiculo,
    IReadOnlyList<ReportGraficoPointDto> GraficoRankingEstaciones,
    IReadOnlyList<ReportGraficoPointDto> GraficoTiposVehiculo
);
