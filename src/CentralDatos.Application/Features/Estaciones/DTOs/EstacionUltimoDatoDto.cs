namespace CentralDatos.Application.Features.Estaciones.DTOs;

public record EstacionUltimoDatoDto(
    string CodEstacion,
    string DesEstacion,
    string? CodEmpresa,
    string NombreEmpresa,
    string? TipoEstacion,
    DateTime? UltimaInspeccion,
    string UltimaInspeccionFormatted,
    bool TieneInspecciones
);

public record ResumenEstadoEstacionesDto(
    int TotalEstaciones,
    int TotalTsa,
    int TotalCal,
    int ConInspecciones,
    string? UltimaFechaGlobal,
    IReadOnlyList<EstacionUltimoDatoDto> Estaciones
);
