using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesRepository
{
    Task<IReadOnlyList<EstacionFacturacionDato>> ObtenerFacturacionAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default);
}

