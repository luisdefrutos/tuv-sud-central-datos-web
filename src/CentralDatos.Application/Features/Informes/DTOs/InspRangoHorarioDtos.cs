using System;
using System.Collections.Generic;

namespace CentralDatos.Application.Features.Informes.DTOs;

public class InspRangoHorarioFiltroDto
{
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public string? Sociedad { get; set; }
    public List<string>? Estaciones { get; set; }
    public string? Fase { get; set; } // '1' = Primera, '2' = Segunda/Reiterada, null/vacio = Todas
}

public class InspRangoHorarioFilaDto
{
    public DateTime Fecha { get; set; }
    public string FechaFormatted { get; set; } = string.Empty;
    public string DiaSemana { get; set; } = string.Empty;
    public int H06 { get; set; }
    public int H07 { get; set; }
    public int H08 { get; set; }
    public int H09 { get; set; }
    public int H10 { get; set; }
    public int H11 { get; set; }
    public int H12 { get; set; }
    public int H13 { get; set; }
    public int H14 { get; set; }
    public int H15 { get; set; }
    public int H16 { get; set; }
    public int H17 { get; set; }
    public int H18 { get; set; }
    public int H19 { get; set; }
    public int H20 { get; set; }
    public int H21 { get; set; }
    public int TotalFila { get; set; }
}

public class HeatmapCeldaDto
{
    public string DiaSemana { get; set; } = string.Empty; // 'Lunes', 'Martes', ...
    public int DiaNumero { get; set; } // 1 a 6
    public string Hora { get; set; } = string.Empty; // '06' a '21'
    public int Cantidad { get; set; }
    public double Porcentaje { get; set; }
}

public class InspRangoHorarioKpiDto
{
    public string Id { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public string Subtitulo { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Variant { get; set; } = "neutral";
}

public sealed record GraficoEstacionInspRangoHorarioDto(
    string CodEstacion,
    string DesEstacion,
    string Sociedad,
    int TotalInspecciones,
    string PctSobreTotal,
    double Porcentaje);

public class InspRangoHorarioResponseDto
{
    public List<InspRangoHorarioKpiDto> Kpis { get; set; } = new();
    public List<GraficoEstacionInspRangoHorarioDto> GraficoEstaciones { get; set; } = new();
    public List<InspRangoHorarioFilaDto> Filas { get; set; } = new();
    public List<HeatmapCeldaDto> Heatmap { get; set; } = new();
    public int TotalInspecciones { get; set; }
    public string HoraPunta { get; set; } = string.Empty;
    public string DiaPunta { get; set; } = string.Empty;
    public double PromedioPorHora { get; set; }
}

