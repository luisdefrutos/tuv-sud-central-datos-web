namespace CentralDatos.Application.Features.Informes.DTOs;

public sealed record FiltrosMinerRequestDto(
    DateTime FechaInicio,
    DateTime FechaFin,
    IReadOnlyList<string>? CodEstaciones = null
);

public sealed record FilaMinerDefectoDto(
    string CodigoGravedad, // "11L", "11G"...
    int CapituloNumero,    // 1 al 10
    string CapituloNombre, // "Capítulo 1 (Identificación)"
    string GravedadTipo,   // "Leve", "Grave"
    int Grupo01Mo,
    int Grupo02Tp,
    int Grupo03Tr,
    int Grupo04Mp,
    int Grupo05Mg,
    int Grupo06Au,
    int Grupo07Rs,
    int Grupo08Ag,
    int Grupo09Ot,
    int Total
);

public sealed record FilaMinerResumenFaseDto(
    string FaseNombre, // "Primera Inspección (Fase 1)" / "Segunda Inspección (Fase 2)"
    int Grupo01MoFav, int Grupo01MoDesfav, int Grupo01MoTotal, decimal Grupo01MoPctRechazo,
    int Grupo02TpFav, int Grupo02TpDesfav, int Grupo02TpTotal, decimal Grupo02TpPctRechazo,
    int Grupo03TrFav, int Grupo03TrDesfav, int Grupo03TrTotal, decimal Grupo03TrPctRechazo,
    int Grupo04MpFav, int Grupo04MpDesfav, int Grupo04MpTotal, decimal Grupo04MpPctRechazo,
    int Grupo05MgFav, int Grupo05MgDesfav, int Grupo05MgTotal, decimal Grupo05MgPctRechazo,
    int Grupo06AuFav, int Grupo06AuDesfav, int Grupo06AuTotal, decimal Grupo06AuPctRechazo,
    int Grupo07RsFav, int Grupo07RsDesfav, int Grupo07RsTotal, decimal Grupo07RsPctRechazo,
    int Grupo08AgFav, int Grupo08AgDesfav, int Grupo08AgTotal, decimal Grupo08AgPctRechazo,
    int Grupo09OtFav, int Grupo09OtDesfav, int Grupo09OtTotal, decimal Grupo09OtPctRechazo,
    int TotalFav, int TotalDesfav, int TotalInspecciones, decimal PctRechazoGlobal
);

public sealed record KpiMinerDto(
    string Id,
    string Titulo,
    string Valor,
    string Subtitulo,
    string Variant, // "primary", "success", "warning", "danger", "neutral"
    string Icon
);

public sealed record GraficoPuntoMinerDto(
    string Id,
    string Label,
    decimal Valor,
    string ValorFormateado,
    string? Categoria = null,
    string? Color = null
);

public sealed record InformeMinerResponseDto(
    string RangoFechasLabel,
    string EstacionesLabel,
    IReadOnlyList<FilaMinerDefectoDto> Defectos,
    FilaMinerResumenFaseDto PrimeraInspeccion,
    FilaMinerResumenFaseDto SegundaInspeccion,
    IReadOnlyList<KpiMinerDto> Kpis,
    IReadOnlyList<GraficoPuntoMinerDto> GraficoCapitulos,
    IReadOnlyList<GraficoPuntoMinerDto> GraficoCategorias
);
