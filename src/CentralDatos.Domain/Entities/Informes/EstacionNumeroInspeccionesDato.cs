using CentralDatos.Domain.Constants;

namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Representa el resumen de inspecciones (favorables y rechazadas por fase)
/// para una estación ITV de la red centralizada.
/// </summary>
public sealed class EstacionNumeroInspeccionesDato
{
    public required string CodEstacion { get; init; }
    public required string DesEstacion { get; init; }
    public required string CodEmpresa { get; init; }

    public int Favorables1 { get; init; }
    public int Rechazadas1 { get; init; }
    public int Favorables2 { get; init; }
    public int Rechazadas2 { get; init; }
    public int TotalInspecciones { get; init; }

    public int TotalFase1 => Favorables1 + Rechazadas1;
    public int TotalFase2 => Favorables2 + Rechazadas2;
    public int TotalFavorables => Favorables1 + Favorables2;
    public int TotalRechazadas => Rechazadas1 + Rechazadas2;

    public decimal PorcentajeRechazoFase1 => TotalFase1 > 0
        ? Math.Round((decimal)Rechazadas1 / TotalFase1 * 100m, 2)
        : 0.00m;

    public decimal PorcentajeRechazoFase2 => TotalFase2 > 0
        ? Math.Round((decimal)Rechazadas2 / TotalFase2 * 100m, 2)
        : 0.00m;

    public decimal PorcentajeRechazoGlobal => TotalInspecciones > 0
        ? Math.Round((decimal)TotalRechazadas / TotalInspecciones * 100m, 2)
        : 0.00m;

    public string NombreEmpresa => CodEmpresa switch
    {
        EmpresasConstants.CodigoAtisae => EmpresasConstants.NombreAtisae,
        EmpresasConstants.CodigoCal => EmpresasConstants.NombreCal,
        _ => $"Sociedad {CodEmpresa}"
    };

    public string ClaveSociedad => CodEmpresa switch
    {
        EmpresasConstants.CodigoAtisae => "TSA",
        EmpresasConstants.CodigoCal => "CAL",
        _ => "OTRA"
    };
}

