using CentralDatos.Application.Features.Estaciones.DTOs;
using CentralDatos.Application.Features.Estaciones.Interfaces;

namespace CentralDatos.Application.Features.Estaciones.Services;

public class EstacionesService
{
    private readonly IEstacionesRepository _repository;

    public EstacionesService(IEstacionesRepository repository)
    {
        _repository = repository;
    }

    public async Task<ResumenEstadoEstacionesDto> ObtenerResumenUltimosDatosAsync(CancellationToken cancellationToken = default)
    {
        var entidades = await _repository.ObtenerUltimosDatosCentralizadosAsync(cancellationToken);

        var dtos = entidades.Select(e =>
        {
            var formatted = e.UltimaInspeccion.HasValue 
                ? e.UltimaInspeccion.Value.ToString("dd/MM/yyyy HH:mm") 
                : "Sin registros";

            return new EstacionUltimoDatoDto(
                e.CodEstacion,
                e.DesEstacion,
                e.CodEmpresa,
                e.NombreEmpresa,
                e.TipoEstacion ?? "ITV",
                e.UltimaInspeccion,
                formatted,
                e.UltimaInspeccion.HasValue
            );
        }).ToList();

        var totalTsa = dtos.Count(d => d.CodEmpresa == "01");
        var totalCal = dtos.Count(d => d.CodEmpresa == "03");
        var conInspecciones = dtos.Count(d => d.TieneInspecciones);

        var maxFecha = dtos.Where(d => d.UltimaInspeccion.HasValue)
                           .Select(d => d.UltimaInspeccion!.Value)
                           .OrderByDescending(f => f)
                           .FirstOrDefault();

        var maxFechaStr = maxFecha != default ? maxFecha.ToString("dd/MM/yyyy HH:mm") : "N/D";

        return new ResumenEstadoEstacionesDto(
            TotalEstaciones: dtos.Count,
            TotalTsa: totalTsa,
            TotalCal: totalCal,
            ConInspecciones: conInspecciones,
            UltimaFechaGlobal: maxFechaStr,
            Estaciones: dtos
        );
    }
}
