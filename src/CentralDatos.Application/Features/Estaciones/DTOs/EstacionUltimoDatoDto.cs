namespace CentralDatos.Application.Features.Estaciones.DTOs;

public record EstacionUltimoDatoDto(
    string CodEstacion,
    string DesEstacion,
    string? CodEmpresa,
    string NombreEmpresa,
    string? TipoEstacion,
    DateTime? UltimaInspeccion,
    string UltimaInspeccionFormatted,
    bool TieneInspecciones,
    int? DiasSinTransmitir,
    string EstadoSincronizacion,
    string EstadoSincronizacionLabel,
    string NivelSincronizacion,
    string TooltipSincronizacion
);

public record ResumenEstadoEstacionesDto(
    int TotalEstaciones,
    int TotalTsa,
    int TotalCal,
    int ConInspecciones,
    string? UltimaFechaGlobal,
    IReadOnlyList<EstacionUltimoDatoDto> Estaciones
);
