using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesNumeroInspeccionesService
{
    Task<InformeNumeroInspeccionesResponseDto> GenerarInformeNumeroInspeccionesAsync(
        FiltrosNumeroInspeccionesRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionNumeroInspeccionesCsvAsync(
        FiltrosNumeroInspeccionesRequestDto filtros,
        CancellationToken cancellationToken = default);
}

