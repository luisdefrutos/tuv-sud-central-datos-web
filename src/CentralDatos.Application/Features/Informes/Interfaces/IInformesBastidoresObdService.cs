using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesBastidoresObdService
{
    Task<InformeBastidoresObdResponseDto> GenerarInformeBastidoresObdAsync(
        FiltrosBastidoresObdRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<(byte[] Contenido, string NombreArchivo, string ContentType)> ExportarExcelAsync(
        FiltrosBastidoresObdRequestDto filtros,
        CancellationToken cancellationToken = default);
}

