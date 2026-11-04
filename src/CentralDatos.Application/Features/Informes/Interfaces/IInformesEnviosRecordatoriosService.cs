using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesEnviosRecordatoriosService
{
    Task<IReadOnlyList<PlantillaRecordatorioCatalogoDto>> ObtenerPlantillasAsync(
        CancellationToken cancellationToken = default);

    Task<InformeEnviosRecordatoriosResponseDto> ConsultarEnviosRecordatoriosAsync(
        FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportarExcelAsync(
        FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default);
}

