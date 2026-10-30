using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesDuracionPromedioService
{
    Task<InformeDuracionPromedioResponseDto> GenerarInformeDuracionPromedioAsync(
        FiltrosDuracionPromedioRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionDuracionPromedioCsvAsync(
        FiltrosDuracionPromedioRequestDto filtros,
        CancellationToken cancellationToken = default);
}

