using System.Globalization;
using CentralDatos.Application.Features.Informes.Common;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;
using ClosedXML.Excel;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesMinerService : IInformesMinerService
{
    private static readonly CultureInfo CultureEs = new("es-ES");
    private readonly IInformesRepository _repository;
    private readonly ILogger<InformesMinerService> _logger;

    private static readonly (int Bloque, int Capitulo, string Nombre)[] CapitulosDefectos = [
        (11, 1, "Capítulo 1 (Identificación)"),
        (12, 2, "Capítulo 2 (Acond. Exterior, Carrocería y Chasis)"),
        (13, 3, "Capítulo 3 (Acondicionamiento Interior)"),
        (14, 4, "Capítulo 4 (Alumbrado y Señalización)"),
        (15, 5, "Capítulo 5 (Emisiones Contaminantes)"),
        (16, 6, "Capítulo 6 (Frenos)"),
        (17, 7, "Capítulo 7 (Dirección)"),
        (18, 8, "Capítulo 8 (Ejes, Ruedas, Neumáticos y Suspensión)"),
        (19, 9, "Capítulo 9 (Motor y Transmisión)"),
        (20, 10, "Capítulo 10 (Otros)")
    ];

    public InformesMinerService(
        IInformesRepository repository,
        ILogger<InformesMinerService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<InformeMinerResponseDto> ConsultarEstadisticaMinerAsync(
        FiltrosMinerRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        var datos = await _repository.ObtenerEstadisticaMinerAsync(
            fInicio,
            fFin,
            filtros.CodEstaciones,
            cancellationToken);

        string rangoLabel = $"{fInicio:dd/MM/yyyy} - {fFin:dd/MM/yyyy}";
        string estLabel = filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0
            ? (filtros.CodEstaciones.Count == 1 ? $"Estación {filtros.CodEstaciones[0]}" : $"{filtros.CodEstaciones.Count} estaciones")
            : "Red Completa";

        // Mapeo estructurado de los 20 renglones de defectos (10 capítulos x 2 gravedades)
        var dictDefectos = datos.Defectos.ToDictionary(d => d.Gravedad.ToUpperInvariant(), d => d);
        var listaDefectosDto = new List<FilaMinerDefectoDto>();

        foreach (var (bloque, capNum, capNom) in CapitulosDefectos)
        {
            // Leve (L)
            string keyL = $"{bloque}L";
            dictDefectos.TryGetValue(keyL, out var defL);
            listaDefectosDto.Add(new FilaMinerDefectoDto(
                keyL, capNum, capNom, "Leve",
                defL?.Grupo01Mo ?? 0, defL?.Grupo02Tp ?? 0, defL?.Grupo03Tr ?? 0,
                defL?.Grupo04Mp ?? 0, defL?.Grupo05Mg ?? 0, defL?.Grupo06Au ?? 0,
                defL?.Grupo07Rs ?? 0, defL?.Grupo08Ag ?? 0, defL?.Grupo09Ot ?? 0,
                defL?.Total ?? 0
            ));

            // Grave (G)
            string keyG = $"{bloque}G";
            dictDefectos.TryGetValue(keyG, out var defG);
            listaDefectosDto.Add(new FilaMinerDefectoDto(
                keyG, capNum, capNom, "Grave",
                defG?.Grupo01Mo ?? 0, defG?.Grupo02Tp ?? 0, defG?.Grupo03Tr ?? 0,
                defG?.Grupo04Mp ?? 0, defG?.Grupo05Mg ?? 0, defG?.Grupo06Au ?? 0,
                defG?.Grupo07Rs ?? 0, defG?.Grupo08Ag ?? 0, defG?.Grupo09Ot ?? 0,
                defG?.Total ?? 0
            ));
        }

        // Mapeo Fase 1 y Fase 2
        var fase1Dto = ConstruirResumenFase("Primera Inspección (Fase 1)", datos.PrimerasInspecciones);
        var fase2Dto = ConstruirResumenFase("Segunda Inspección (Fase 2)", datos.SegundasInspecciones);

        // KPIs Ejecutivos
        int totalDefectosLeves = listaDefectosDto.Where(d => d.GravedadTipo == "Leve").Sum(d => d.Total);
        int totalDefectosGraves = listaDefectosDto.Where(d => d.GravedadTipo == "Grave").Sum(d => d.Total);
        int totalDefectos = totalDefectosLeves + totalDefectosGraves;

        var kpis = new List<KpiMinerDto>
        {
            new(
                "kpi-fase1-inspecciones",
                "Primeras Inspecciones",
                fase1Dto.TotalInspecciones.ToString("N0", CultureEs),
                $"Fav: {fase1Dto.TotalFav:N0} | Desfav: {fase1Dto.TotalDesfav:N0} ({fase1Dto.PctRechazoGlobal:F2}% rechazo)",
                "primary",
                "🚗"
            ),
            new(
                "kpi-fase2-inspecciones",
                "Segundas Inspecciones",
                fase2Dto.TotalInspecciones.ToString("N0", CultureEs),
                $"Fav: {fase2Dto.TotalFav:N0} | Desfav: {fase2Dto.TotalDesfav:N0} ({fase2Dto.PctRechazoGlobal:F2}% rechazo)",
                "success",
                "🔄"
            ),
            new(
                "kpi-total-defectos",
                "Defectos Detectados",
                totalDefectos.ToString("N0", CultureEs),
                $"Graves: {totalDefectosGraves:N0} | Leves: {totalDefectosLeves:N0}",
                totalDefectosGraves > 0 ? "danger" : "neutral",
                "⚠️"
            ),
            new(
                "kpi-categoria-principal",
                "Categoría Mayoritaria",
                "Turismos (TP)",
                $"{fase1Dto.Grupo02TpTotal:N0} insp. Fase 1 ({CalcularPct(fase1Dto.Grupo02TpTotal, fase1Dto.TotalInspecciones):F1}% del parque)",
                "neutral",
                "🏷️"
            )
        };

        // Gráfico 1: Defectos por Capítulo
        var graficoCapitulos = CapitulosDefectos
            .Select(c =>
            {
                int totCap = listaDefectosDto.Where(d => d.CapituloNumero == c.Capitulo).Sum(d => d.Total);
                int gravesCap = listaDefectosDto.Where(d => d.CapituloNumero == c.Capitulo && d.GravedadTipo == "Grave").Sum(d => d.Total);
                return new GraficoPuntoMinerDto(
                    $"cap-{c.Capitulo}",
                    $"Cap. {c.Capitulo} - {c.Nombre.Split('(')[1].TrimEnd(')')}",
                    totCap,
                    $"{totCap:N0} def. ({gravesCap:N0} graves)"
                );
            })
            .OrderByDescending(g => g.Valor)
            .ToList();

        // Gráfico 2: Inspecciones por Categoría MINER
        var graficoCategorias = new List<GraficoPuntoMinerDto>
        {
            new("MO", "Motocicletas (MO)", fase1Dto.Grupo01MoTotal, $"{fase1Dto.Grupo01MoTotal:N0} insp."),
            new("TP", "Turismos Particulares (TP)", fase1Dto.Grupo02TpTotal, $"{fase1Dto.Grupo02TpTotal:N0} insp."),
            new("TR", "Turismos Alquiler/Taxi (TR)", fase1Dto.Grupo03TrTotal, $"{fase1Dto.Grupo03TrTotal:N0} insp."),
            new("MP", "Mercancías Ligeras (MP)", fase1Dto.Grupo04MpTotal, $"{fase1Dto.Grupo04MpTotal:N0} insp."),
            new("MG", "Mercancías Pesadas (MG)", fase1Dto.Grupo05MgTotal, $"{fase1Dto.Grupo05MgTotal:N0} insp."),
            new("AU", "Autobuses (AU)", fase1Dto.Grupo06AuTotal, $"{fase1Dto.Grupo06AuTotal:N0} insp."),
            new("RS", "Remolques (RS)", fase1Dto.Grupo07RsTotal, $"{fase1Dto.Grupo07RsTotal:N0} insp."),
            new("AG", "Agrícolas (AG)", fase1Dto.Grupo08AgTotal, $"{fase1Dto.Grupo08AgTotal:N0} insp."),
            new("OT", "Otros (OT)", fase1Dto.Grupo09OtTotal, $"{fase1Dto.Grupo09OtTotal:N0} insp.")
        }
        .OrderByDescending(g => g.Valor)
        .ToList();

        return new InformeMinerResponseDto(
            rangoLabel,
            estLabel,
            listaDefectosDto,
            fase1Dto,
            fase2Dto,
            kpis,
            graficoCapitulos,
            graficoCategorias
        );
    }

    public async Task<byte[]> ExportarExcelMinerAsync(
        FiltrosMinerRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ReportDateRangeValidator.Validar(filtros.FechaInicio, filtros.FechaFin);

        var datos = await _repository.ObtenerEstadisticaMinerAsync(
            fInicio,
            fFin,
            filtros.CodEstaciones,
            cancellationToken);

        string templatePath = Path.Combine(AppContext.BaseDirectory, "Templates", "Plantilla_Industria_MINER.xlsx");
        if (!File.Exists(templatePath))
        {
            // Búsqueda alternativa en desarrollo
            string altPath = Path.Combine(Directory.GetCurrentDirectory(), "Templates", "Plantilla_Industria_MINER.xlsx");
            if (File.Exists(altPath)) templatePath = altPath;
        }

        using var workbook = File.Exists(templatePath)
            ? new XLWorkbook(templatePath)
            : new XLWorkbook();

        var ws = workbook.Worksheets.FirstOrDefault(w => w.Name == "PERIODICAS") ?? workbook.Worksheet(1);

        // 1. Fechas cabecera
        ws.Cell(2, 15).SetValue(fInicio.ToString("dd/MM/yyyy"));
        ws.Cell(3, 15).SetValue(fFin.ToString("dd/MM/yyyy"));

        // 2. Tabla Defectos (Filas 9 a 28, Columnas 6 a 14)
        var dictDefectos = datos.Defectos.ToDictionary(d => d.Gravedad.ToUpperInvariant(), d => d);
        string[] codigosGravedad = [
            "11L", "11G", "12L", "12G", "13L", "13G", "14L", "14G", "15L", "15G",
            "16L", "16G", "17L", "17G", "18L", "18G", "19L", "19G", "20L", "20G"
        ];

        int filaDef = 9;
        foreach (var cod in codigosGravedad)
        {
            dictDefectos.TryGetValue(cod, out var item);
            ws.Cell(filaDef, 6).SetValue(item?.Grupo01Mo ?? 0);
            ws.Cell(filaDef, 7).SetValue(item?.Grupo02Tp ?? 0);
            ws.Cell(filaDef, 8).SetValue(item?.Grupo03Tr ?? 0);
            ws.Cell(filaDef, 9).SetValue(item?.Grupo04Mp ?? 0);
            ws.Cell(filaDef, 10).SetValue(item?.Grupo05Mg ?? 0);
            ws.Cell(filaDef, 11).SetValue(item?.Grupo06Au ?? 0);
            ws.Cell(filaDef, 12).SetValue(item?.Grupo07Rs ?? 0);
            ws.Cell(filaDef, 13).SetValue(item?.Grupo08Ag ?? 0);
            ws.Cell(filaDef, 14).SetValue(item?.Grupo09Ot ?? 0);
            filaDef++;
        }

        // 3. Tabla Primeras Inspecciones (Fila 30 FAV, Fila 31 RECH)
        var fav1 = datos.PrimerasInspecciones.FirstOrDefault(x => x.Resultado == "FAV");
        var desfav1 = datos.PrimerasInspecciones.FirstOrDefault(x => x.Resultado == "DESFAV");

        ws.Cell(30, 6).SetValue(fav1?.Grupo01Mo ?? 0);
        ws.Cell(30, 7).SetValue(fav1?.Grupo02Tp ?? 0);
        ws.Cell(30, 8).SetValue(fav1?.Grupo03Tr ?? 0);
        ws.Cell(30, 9).SetValue(fav1?.Grupo04Mp ?? 0);
        ws.Cell(30, 10).SetValue(fav1?.Grupo05Mg ?? 0);
        ws.Cell(30, 11).SetValue(fav1?.Grupo06Au ?? 0);
        ws.Cell(30, 12).SetValue(fav1?.Grupo07Rs ?? 0);
        ws.Cell(30, 13).SetValue(fav1?.Grupo08Ag ?? 0);
        ws.Cell(30, 14).SetValue(fav1?.Grupo09Ot ?? 0);

        ws.Cell(31, 6).SetValue(desfav1?.Grupo01Mo ?? 0);
        ws.Cell(31, 7).SetValue(desfav1?.Grupo02Tp ?? 0);
        ws.Cell(31, 8).SetValue(desfav1?.Grupo03Tr ?? 0);
        ws.Cell(31, 9).SetValue(desfav1?.Grupo04Mp ?? 0);
        ws.Cell(31, 10).SetValue(desfav1?.Grupo05Mg ?? 0);
        ws.Cell(31, 11).SetValue(desfav1?.Grupo06Au ?? 0);
        ws.Cell(31, 12).SetValue(desfav1?.Grupo07Rs ?? 0);
        ws.Cell(31, 13).SetValue(desfav1?.Grupo08Ag ?? 0);
        ws.Cell(31, 14).SetValue(desfav1?.Grupo09Ot ?? 0);

        // 4. Tabla Segundas Inspecciones (Fila 34 FAV, Fila 35 RECH)
        var fav2 = datos.SegundasInspecciones.FirstOrDefault(x => x.Resultado == "FAV");
        var desfav2 = datos.SegundasInspecciones.FirstOrDefault(x => x.Resultado == "DESFAV");

        ws.Cell(34, 6).SetValue(fav2?.Grupo01Mo ?? 0);
        ws.Cell(34, 7).SetValue(fav2?.Grupo02Tp ?? 0);
        ws.Cell(34, 8).SetValue(fav2?.Grupo03Tr ?? 0);
        ws.Cell(34, 9).SetValue(fav2?.Grupo04Mp ?? 0);
        ws.Cell(34, 10).SetValue(fav2?.Grupo05Mg ?? 0);
        ws.Cell(34, 11).SetValue(fav2?.Grupo06Au ?? 0);
        ws.Cell(34, 12).SetValue(fav2?.Grupo07Rs ?? 0);
        ws.Cell(34, 13).SetValue(fav2?.Grupo08Ag ?? 0);
        ws.Cell(34, 14).SetValue(fav2?.Grupo09Ot ?? 0);

        ws.Cell(35, 6).SetValue(desfav2?.Grupo01Mo ?? 0);
        ws.Cell(35, 7).SetValue(desfav2?.Grupo02Tp ?? 0);
        ws.Cell(35, 8).SetValue(desfav2?.Grupo03Tr ?? 0);
        ws.Cell(35, 9).SetValue(desfav2?.Grupo04Mp ?? 0);
        ws.Cell(35, 10).SetValue(desfav2?.Grupo05Mg ?? 0);
        ws.Cell(35, 11).SetValue(desfav2?.Grupo06Au ?? 0);
        ws.Cell(35, 12).SetValue(desfav2?.Grupo07Rs ?? 0);
        ws.Cell(35, 13).SetValue(desfav2?.Grupo08Ag ?? 0);
        ws.Cell(35, 14).SetValue(desfav2?.Grupo09Ot ?? 0);

        // 5. Filtro de estaciones (Fila 40, Columna 2 - Celda B40 en Industria.xls)
        string strFiltrosEst = filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0
            ? $"ESTACIONES: {string.Join(", ", filtros.CodEstaciones)}"
            : "ESTACIONES: TODAS";
        ws.Cell(40, 2).SetValue(strFiltrosEst);

        // Recalcular fórmulas integradas (sumatorios horizontales y % rechazo)
        ws.RecalculateAllFormulas();

        using var memoryStream = new MemoryStream();
        workbook.SaveAs(memoryStream);
        return memoryStream.ToArray();
    }

    private static FilaMinerResumenFaseDto ConstruirResumenFase(
        string faseNombre,
        IReadOnlyList<MinerInspeccionDato> datos)
    {
        var fav = datos.FirstOrDefault(x => x.Resultado == "FAV");
        var desfav = datos.FirstOrDefault(x => x.Resultado == "DESFAV");

        int m1Fav = fav?.Grupo01Mo ?? 0; int m1Desfav = desfav?.Grupo01Mo ?? 0; int m1Tot = m1Fav + m1Desfav;
        int m2Fav = fav?.Grupo02Tp ?? 0; int m2Desfav = desfav?.Grupo02Tp ?? 0; int m2Tot = m2Fav + m2Desfav;
        int m3Fav = fav?.Grupo03Tr ?? 0; int m3Desfav = desfav?.Grupo03Tr ?? 0; int m3Tot = m3Fav + m3Desfav;
        int m4Fav = fav?.Grupo04Mp ?? 0; int m4Desfav = desfav?.Grupo04Mp ?? 0; int m4Tot = m4Fav + m4Desfav;
        int m5Fav = fav?.Grupo05Mg ?? 0; int m5Desfav = desfav?.Grupo05Mg ?? 0; int m5Tot = m5Fav + m5Desfav;
        int m6Fav = fav?.Grupo06Au ?? 0; int m6Desfav = desfav?.Grupo06Au ?? 0; int m6Tot = m6Fav + m6Desfav;
        int m7Fav = fav?.Grupo07Rs ?? 0; int m7Desfav = desfav?.Grupo07Rs ?? 0; int m7Tot = m7Fav + m7Desfav;
        int m8Fav = fav?.Grupo08Ag ?? 0; int m8Desfav = desfav?.Grupo08Ag ?? 0; int m8Tot = m8Fav + m8Desfav;
        int m9Fav = fav?.Grupo09Ot ?? 0; int m9Desfav = desfav?.Grupo09Ot ?? 0; int m9Tot = m9Fav + m9Desfav;

        int totFav = fav?.Total ?? 0;
        int totDesfav = desfav?.Total ?? 0;
        int totGlobal = totFav + totDesfav;

        return new FilaMinerResumenFaseDto(
            faseNombre,
            m1Fav, m1Desfav, m1Tot, CalcularPct(m1Desfav, m1Tot),
            m2Fav, m2Desfav, m2Tot, CalcularPct(m2Desfav, m2Tot),
            m3Fav, m3Desfav, m3Tot, CalcularPct(m3Desfav, m3Tot),
            m4Fav, m4Desfav, m4Tot, CalcularPct(m4Desfav, m4Tot),
            m5Fav, m5Desfav, m5Tot, CalcularPct(m5Desfav, m5Tot),
            m6Fav, m6Desfav, m6Tot, CalcularPct(m6Desfav, m6Tot),
            m7Fav, m7Desfav, m7Tot, CalcularPct(m7Desfav, m7Tot),
            m8Fav, m8Desfav, m8Tot, CalcularPct(m8Desfav, m8Tot),
            m9Fav, m9Desfav, m9Tot, CalcularPct(m9Desfav, m9Tot),
            totFav, totDesfav, totGlobal, CalcularPct(totDesfav, totGlobal)
        );
    }

    private static decimal CalcularPct(int parte, int total)
    {
        return total > 0 ? Math.Round(((decimal)parte / total) * 100m, 2) : 0.00m;
    }
}
