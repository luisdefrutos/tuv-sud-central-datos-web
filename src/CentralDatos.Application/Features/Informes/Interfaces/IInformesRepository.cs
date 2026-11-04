using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesRepository
{
    Task<IReadOnlyList<EstacionFacturacionDato>> ObtenerFacturacionAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EstacionNumeroInspeccionesDato>> ObtenerNumeroInspeccionesAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EstacionDuracionPromedioDato>> ObtenerDuracionPromedioAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InspeccionDefectoObdDato>> ObtenerDefectosObdAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InspeccionSinInspectorDato>> ObtenerInspeccionesSinInspectorAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InspeccionCuponDescuentoDato>> ObtenerInspeccionesCuponDescuentoAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FacturacionComparativaDato>> ObtenerFacturacionComparativaAsync(
        DateTime fechaInicioRango1,
        DateTime fechaFinRango1,
        DateTime fechaInicioRango2,
        DateTime fechaFinRango2,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default);

    Task<MinerEstadisticaGlobalDato> ObtenerEstadisticaMinerAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BastidorObdNoCoincidenteDato>> ObtenerBastidoresObdNoCoincidentesAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<InspRangoHorarioDato>> ObtenerInspRangoHorarioAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VolumenDefectosDato>> ObtenerVolumenDefectosAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? bloque = null,
        string? defecto = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DTOs.CatalogoDefectoItemDto>> ObtenerBloquesDefectosAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DTOs.CatalogoDefectoItemDto>> ObtenerElementosDefectosAsync(
        string bloque,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClienteVolumenDato>> ObtenerClientesVolumenAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        int limiteCuenta,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        int? idProyecto = null,
        IReadOnlyList<string>? tiposVehiculo = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DTOs.ProyectoComercialDto>> ObtenerProyectosComercialesAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DTOs.PlantillaRecordatorioCatalogoDto>> ObtenerPlantillasRecordatorioAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DTOs.FilaResumenEnviosRecordatoriosDto>> ObtenerResumenEnviosRecordatoriosAsync(
        DTOs.FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DTOs.FilaDetalleEnviosRecordatoriosDto>> ObtenerDetalleEnviosRecordatoriosAsync(
        DTOs.FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default);
}
