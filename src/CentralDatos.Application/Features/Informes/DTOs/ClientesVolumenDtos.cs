using System;
using System.Collections.Generic;

namespace CentralDatos.Application.Features.Informes.DTOs;

public class ClientesVolumenFiltroDto
{
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public string? Sociedad { get; set; }
    public List<string>? Estaciones { get; set; }
    public string? Fase { get; set; } // "TODAS", "1", "2"
    public int LimiteCuenta { get; set; } = 5; // Límite mínimo de inspecciones por titular
    public int? IdProyecto { get; set; } // Filtro opcional por proyecto comercial
    public List<string>? TiposVehiculo { get; set; } // Categorías MINER: MO, TP, TR, MP, MG, AU, RS, AG, OT
}

public class ClientesVolumenFilaDto
{
    public string CodEstacion { get; set; } = string.Empty;
    public string DesEstacion { get; set; } = string.Empty;
    public string ClaveSociedad { get; set; } = "TSA";
    
    public string CifFactura { get; set; } = string.Empty;
    public string CifTitular { get; set; } = string.Empty;
    public string NombreCliente { get; set; } = string.Empty;
    public string Domicilio { get; set; } = string.Empty;
    public string CodigoPostal { get; set; } = string.Empty;
    public string Poblacion { get; set; } = string.Empty;
    public string Provincia { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Telefono2 { get; set; } = string.Empty;
    public string Resultado { get; set; } = "FAV"; // FAV o DESFAV
    
    public int Cuenta { get; set; }
    public int CuentaCif { get; set; }
}

public class ClientesVolumenKpiDto
{
    public string Id { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
    public string Subtitulo { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Variant { get; set; } = "neutral";
}

public sealed record GraficoPuntoClienteDto(
    string Id,
    string Label,
    int Valor,
    string ValorFormateado,
    string Subtitulo,
    string Color
);

public class ClientesVolumenResponseDto
{
    public DateTime FechaInicio { get; set; }
    public DateTime FechaFin { get; set; }
    public int TotalClientes { get; set; }
    public int TotalInspecciones { get; set; }
    public int TotalFavorables { get; set; }
    public int TotalDesfavorables { get; set; }
    public List<ClientesVolumenKpiDto> Kpis { get; set; } = new();
    public List<ClientesVolumenFilaDto> Filas { get; set; } = new();
    public List<GraficoPuntoClienteDto> GraficoTopClientes { get; set; } = new();
    public List<GraficoPuntoClienteDto> GraficoEstaciones { get; set; } = new();
}

public sealed record ProyectoComercialDto(int IdProyecto, string DesProyecto);
public sealed record TipoVehiculoMinerDto(string Codigo, string Descripcion);

