using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesFacturacionComparativaService
{
    Task<InformeFacturacionComparativaResponseDto> GenerarInformeFacturacionComparativaAsync(
        FiltrosFacturacionComparativaRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionFacturacionComparativaExcelAsync(
        FiltrosFacturacionComparativaRequestDto filtros,
        CancellationToken cancellationToken = default);
}

