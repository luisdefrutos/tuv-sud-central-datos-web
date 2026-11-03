using System;
using System.Collections.Generic;

namespace CentralDatos.Application.Features.Informes.DTOs;

public class VolumenDefectosFiltroDto
{
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public string? Sociedad { get; set; }
    public List<string>? Estaciones { get; set; }
    public string? Bloque { get; set; }
    public string? Defecto { get; set; }
}

public class VolumenDefectosFilaDto
{
    public string CodEstacion { get; set; } = string.Empty;
    public string DesEstacion { get; set; } = string.Empty;
    public string ClaveSociedad { get; set; } = "TSA";
    public string GrupoCategoria { get; set; } = string.Empty;
    public string Bloque { get; set; } = string.Empty;
    public string Defecto { get; set; } = string.Empty;
    public string Subdefecto { get; set; } = string.Empty;
    public string CodigoCompleto => $"{Bloque}.{Defecto}.{Subdefecto}";
    public string Gravedad { get; set; } = "L";
    public string Descripcion { get; set; } = string.Empty;
    public int NumDefectos { get; set; }
    public double PctSobreTotal { get; set; }
}

public class VolumenDefectosKpiDto
{
    public string Id { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public string Subtitulo { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Variant { get; set; } = "neutral";
}

public sealed record GraficoPuntoDefectosDto(
    string Id,
    string Label,
    int Valor,
    string ValorFormateado,
    string Subtitulo,
    string Color
);

public class VolumenDefectosResponseDto
{
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public int TotalDefectos { get; set; }
    public int TotalLeves { get; set; }
    public int TotalGraves { get; set; }
    public int TotalMuyGraves { get; set; }
    public List<VolumenDefectosKpiDto> Kpis { get; set; } = new();
    public List<VolumenDefectosFilaDto> Filas { get; set; } = new();
    public List<GraficoPuntoDefectosDto> GraficoEstaciones { get; set; } = new();
    public List<GraficoPuntoDefectosDto> GraficoTopDefectos { get; set; } = new();
    public List<GraficoPuntoDefectosDto> GraficoCategorias { get; set; } = new();
}

public sealed record CatalogoDefectoItemDto(string Codigo, string Descripcion);

