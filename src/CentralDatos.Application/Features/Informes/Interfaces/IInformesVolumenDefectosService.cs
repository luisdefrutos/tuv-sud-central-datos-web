using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesVolumenDefectosService
{
    Task<VolumenDefectosResponseDto> ObtenerInformeAsync(
        VolumenDefectosFiltroDto filtro,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportarExcelAsync(
        VolumenDefectosFiltroDto filtro,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CatalogoDefectoItemDto>> ObtenerBloquesAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CatalogoDefectoItemDto>> ObtenerElementosAsync(
        string bloque,
        CancellationToken cancellationToken = default);
}

