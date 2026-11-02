using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

/// <summary>
/// Contrato del servicio de negocio para el informe de inspecciones sin inspector.
/// </summary>
public interface IInformesSinInspectorService
{
    Task<InformeSinInspectorResponseDto> GenerarInformeSinInspectorAsync(
        FiltrosSinInspectorRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerarExportacionSinInspectorExcelAsync(
        FiltrosSinInspectorRequestDto filtros,
        CancellationToken cancellationToken = default);
}

