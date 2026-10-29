using CentralDatos.Application.Features.Estaciones.DTOs;
using CentralDatos.Application.Features.Estaciones.Interfaces;
using CentralDatos.Domain.Constants;

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
                e.TipoEstacion ?? EmpresasConstants.TipoEstacionDefault,
                e.UltimaInspeccion,
                formatted,
                e.UltimaInspeccion.HasValue,
                e.DiasSinTransmitir,
                e.EstadoSincronizacion,
                e.EstadoSincronizacionLabel,
                e.NivelSincronizacion,
                e.TooltipSincronizacion
            );
        }).ToList();

        var totalTsa = dtos.Count(d => d.CodEmpresa == EmpresasConstants.CodigoAtisae);
        var totalCal = dtos.Count(d => d.CodEmpresa == EmpresasConstants.CodigoCal);
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
