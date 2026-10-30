using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesFacturacionService
{
    Task<InformeFacturacionResponseDto> GenerarInformeFacturacionAsync(
        FiltrosFacturacionRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionFacturacionCsvAsync(
        FiltrosFacturacionRequestDto filtros,
        CancellationToken cancellationToken = default);
}

