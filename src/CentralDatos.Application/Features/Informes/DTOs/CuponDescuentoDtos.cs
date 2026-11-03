namespace CentralDatos.Application.Features.Informes.DTOs;

/// <summary>
/// Filtros de entrada para la consulta de inspecciones con cupón descuento.
/// </summary>
public sealed record FiltrosCuponDescuentoRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Sociedad,
    IReadOnlyList<string>? CodEstaciones,
    string? Fase = null);

/// <summary>
/// Fila de detalle para la tabla de inspecciones con cupón descuento.
/// </summary>
public sealed record FilaCuponDescuentoDto(
    string CodInspeccion,
    string CodEstacion,
    string DesEstacion,
    string CodEmpresa,
    string NombreEmpresa,
    string ClaveSociedad,
    string Matricula,
    DateTime FechaInspeccion,
    string FechaInspeccionFormatted,
    string CodCupon,
    string Promocion,
    decimal Descuento,
    string DescuentoFormatted,
    decimal ImporteAbonado,
    string ImporteAbonadoFormatted,
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
public sealed record GraficoEstacionCuponDescuentoDto(
    string CodEstacion,
    string DesEstacion,
    string ClaveSociedad,
    int TotalInspecciones,
    decimal TotalDescuento,
    string TotalDescuentoFormatted,
    decimal TotalAbonado,
    string TotalAbonadoFormatted,
    string PctSobreTotal);

/// <summary>
/// Resumen ejecutivo por promoción/campaña para gráfico Donut.
/// </summary>
public sealed record GraficoPromocionCuponDto(
    string Promocion,
    int TotalInspecciones,
    decimal TotalDescuento,
    string TotalDescuentoFormatted,
    string PctSobreTotal);

/// <summary>
/// Tarjeta KPI ejecutiva corporativa.
/// </summary>
public sealed record KpiCuponDescuentoDto(
    string Id,
    string Titulo,
    string Valor,
    string Subtitulo,
    string Variant,
    string Icon);

/// <summary>
/// Respuesta consolidada completa del informe de inspecciones con cupón descuento.
/// </summary>
public sealed record InformeCuponDescuentoResponseDto(
    IReadOnlyList<FilaCuponDescuentoDto> Filas,
    int TotalInspecciones,
    string TotalInspeccionesFormatted,
    decimal TotalDescuento,
    string TotalDescuentoFormatted,
    decimal TotalImporteAbonado,
    string TotalImporteAbonadoFormatted,
    int TotalEstacionesAfectadas,
    IReadOnlyList<KpiCuponDescuentoDto> Kpis,
    IReadOnlyList<GraficoEstacionCuponDescuentoDto> GraficoEstaciones,
    IReadOnlyList<GraficoPromocionCuponDto> GraficoPromociones);

