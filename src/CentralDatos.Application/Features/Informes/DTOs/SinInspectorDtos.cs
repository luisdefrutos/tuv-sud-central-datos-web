namespace CentralDatos.Application.Features.Informes.DTOs;

/// <summary>
/// Filtros de entrada para la consulta de inspecciones sin inspector.
/// </summary>
public sealed record FiltrosSinInspectorRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Sociedad,
    IReadOnlyList<string>? CodEstaciones,
    string? Fase = null);

/// <summary>
/// Fila de detalle para la tabla de inspecciones sin inspector.
/// </summary>
public sealed record FilaSinInspectorDto(
    string CodInspeccion,
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string NombreEmpresa,
    string ClaveSociedad,
    string Matricula,
    DateTime FechaInspeccion,
    string FechaInspeccionFormatted,
    string Marca,
    string Modelo,
    string TipoMotor,
    string TipoVehiculo,
    string TipoInspeccion,
    string TextoResultado,
    string Resultado,
    string Fase,
    string Indica12,
    string? CHomologacion,
    string Clasificacion,
    decimal? Mma,
    string? Kilometraje);

/// <summary>
/// Resumen ejecutivo por estación para gráficos.
/// </summary>
public sealed record GraficoEstacionSinInspectorDto(
    string CodEstacion,
    string DesEstacion,
    string ClaveSociedad,
    int TotalInspecciones,
    int TotalFase1,
    int TotalFase2,
    string PctSobreTotal);

/// <summary>
/// Tarjeta KPI ejecutiva corporativa.
/// </summary>
public sealed record KpiSinInspectorDto(
    string Id,
    string Titulo,
    string Valor,
    string Subtitulo,
    string Variant,
    string Icon);

/// <summary>
/// Respuesta consolidada completa del informe de inspecciones sin inspector.
/// </summary>
public sealed record InformeSinInspectorResponseDto(
    IReadOnlyList<FilaSinInspectorDto> Filas,
    int TotalInspecciones,
    string TotalInspeccionesFormatted,
    int TotalFase1,
    int TotalFase2,
    int TotalEstacionesAfectadas,
    IReadOnlyList<KpiSinInspectorDto> Kpis,
    IReadOnlyList<GraficoEstacionSinInspectorDto> GraficoEstaciones);

