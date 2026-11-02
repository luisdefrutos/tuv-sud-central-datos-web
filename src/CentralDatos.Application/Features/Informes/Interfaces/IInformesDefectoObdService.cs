using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesDefectoObdService
{
    Task<InformeDefectoObdResponseDto> GenerarInformeDefectoObdAsync(
        FiltrosDefectoObdRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionDefectoObdExcelAsync(
        FiltrosDefectoObdRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionDefectoObdCsvAsync(
        FiltrosDefectoObdRequestDto filtros,
        CancellationToken cancellationToken = default);
}

