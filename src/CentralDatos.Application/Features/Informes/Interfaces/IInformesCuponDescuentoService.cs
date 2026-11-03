using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

/// <summary>
/// Contrato del servicio de negocio para el informe de inspecciones con cupón descuento.
/// </summary>
public interface IInformesCuponDescuentoService
{
    Task<InformeCuponDescuentoResponseDto> GenerarInformeCuponDescuentoAsync(
        FiltrosCuponDescuentoRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionCuponDescuentoExcelAsync(
        FiltrosCuponDescuentoRequestDto filtros,
        CancellationToken cancellationToken = default);
}

