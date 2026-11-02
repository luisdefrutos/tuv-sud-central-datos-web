namespace CentralDatos.Application.Features.Informes.DTOs;

public sealed record FiltrosDefectoObdRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Fase = "TODAS",
    string? Sociedad = "TODAS",
    IReadOnlyList<string>? CodEstaciones = null
);

public sealed record FilaDefectoObdDto(
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
    string? CHomologacion,
    string Clasificacion,
    int? Mma,
    string? Kilometraje,
    string TipoInspeccion,
    string Resultado,
    string TextoResultado,
    string Fase,
    string DesNivelEmisiones,
    string Bloque,
    string Defecto,
    string Subdefecto,
    string Numero,
    string CodigoDefectoCompleto,
    string DescripcionDefecto,
    string TipoCombustible,
    string GravedadDefecto
);

public sealed record InformeDefectoObdResponseDto(
    IReadOnlyList<ReportKpiDto> Kpis,
    IReadOnlyList<ReportGraficoPointDto> GraficoEstaciones,
    IReadOnlyList<ReportGraficoPointDto> GraficoTipologia,
    IReadOnlyList<ReportGraficoPointDto> GraficoCombustible,
    IReadOnlyList<FilaDefectoObdDto> Filas,
    int TotalDefectosGlobal,
    string TotalDefectosGlobalFormatted,
    int TotalGasolinaGlobal,
    int TotalDieselGlobal,
    int TotalFase1Global,
    int TotalFase2Global,
    int TotalEstacionesAfectadas
);

