namespace CentralDatos.Application.Features.Informes.DTOs;

/// <summary>
/// Filtros de entrada para la consulta de bastidores OBD no coincidentes.
/// </summary>
public sealed record FiltrosBastidoresObdRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Sociedad,
    IReadOnlyList<string>? CodEstaciones);

/// <summary>
/// Fila de detalle para el grid de bastidores OBD no coincidentes.
/// </summary>
public sealed record FilaBastidorObdNoCoincidenteDto(
    string CodInspeccion,
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string ClaveSociedad,
    string Matricula,
    DateTime FechaInspeccion,
    string FechaInspeccionFormatted,
    string BastidorInspeccion,
    string BastidorObd,
    string Categoria,
    string Clasificacion,
    string? Nombre,
    string? Apellidos,
    string? NombreCompleto,
    string? CifFactura,
    string? CodInspector,
    string? CodInspector1,
    string? CodInspector2,
    string? CodInspector3,
    string? InspectorResponsableValidacion,
    string? EquipoObd,
    string? CodEmpleadoBastidor);

/// <summary>
/// Resumen por estación para gráficos de barras.
/// </summary>
public sealed record GraficoEstacionBastidoresObdDto(
    string CodEstacion,
    string DesEstacion,
    string ClaveSociedad,
    int TotalDiscordancias,
    string PctSobreTotal);

/// <summary>
/// Resumen por categoría de vehículo para gráfico Donut.
/// </summary>
public sealed record GraficoCategoriaBastidoresObdDto(
    string Categoria,
    string Descripcion,
    int TotalDiscordancias,
    string PctSobreTotal);

/// <summary>
/// Tarjeta KPI ejecutiva corporativa.
/// </summary>
public sealed record KpiBastidoresObdDto(
    string Id,
    string Titulo,
    string Valor,
    string Subtitulo,
    string Variant,
    string Icon);

/// <summary>
/// Respuesta consolidada del informe de bastidores OBD no coincidentes.
/// </summary>
public sealed record InformeBastidoresObdResponseDto(
    IReadOnlyList<FilaBastidorObdNoCoincidenteDto> Filas,
    int TotalDiscordancias,
    string TotalDiscordanciasFormatted,
    int TotalEstacionesAfectadas,
    string EstacionMayorIncidencia,
    string EquipoObdMayorIncidencia,
    IReadOnlyList<GraficoEstacionBastidoresObdDto> GraficoPorEstacion,
    IReadOnlyList<GraficoCategoriaBastidoresObdDto> GraficoPorCategoria,
    IReadOnlyList<KpiBastidoresObdDto> Kpis,
    DateTime FechaDesde,
    DateTime FechaHasta);

