using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesMinerService
{
    Task<InformeMinerResponseDto> ConsultarEstadisticaMinerAsync(
        FiltrosMinerRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportarExcelMinerAsync(
        FiltrosMinerRequestDto filtros,
        CancellationToken cancellationToken = default);
}
