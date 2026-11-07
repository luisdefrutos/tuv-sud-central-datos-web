using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesLocalizacionService
{
    Task<CatalogosLocalizacionResponseDto> ObtenerCatalogosAsync(
        string tipo,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OpcionComboLocalizacionDto>> ObtenerBloquesPorSeccionAsync(
        string? seccionManual,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OpcionComboLocalizacionDto>> ObtenerElementosPorBloqueAsync(
        string bloque,
        string? seccionManual = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SubdefectoLocalizacionDto>> ObtenerSubdefectosAsync(
        string bloque,
        string defecto,
        string? seccionManual = null,
        CancellationToken cancellationToken = default);

    Task<LocalizacionResponseDto> ConsultarLocalizacionAsync(
        FiltrosLocalizacionRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<(Stream Content, string FileName)> ExportarExcelAsync(
        FiltrosLocalizacionRequestDto filtros,
        CancellationToken cancellationToken = default);
}
