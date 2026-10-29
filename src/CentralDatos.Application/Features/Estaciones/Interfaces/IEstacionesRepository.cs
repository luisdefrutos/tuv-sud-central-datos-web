using CentralDatos.Domain.Entities.Estaciones;

namespace CentralDatos.Application.Features.Estaciones.Interfaces;

public interface IEstacionesRepository
{
    Task<IReadOnlyList<EstacionUltimoDato>> ObtenerUltimosDatosCentralizadosAsync(CancellationToken cancellationToken = default);
}

