using System.Threading;
using System.Threading.Tasks;
using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesInspRangoHorarioService
{
    Task<InspRangoHorarioResponseDto> ObtenerInformeAsync(
        InspRangoHorarioFiltroDto filtro,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExcelAsync(
        InspRangoHorarioFiltroDto filtro,
        CancellationToken cancellationToken = default);
}

