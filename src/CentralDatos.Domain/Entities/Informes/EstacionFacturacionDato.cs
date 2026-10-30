using CentralDatos.Domain.Constants;

namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Representa el resumen de facturación e inspecciones centralizadas para una estación ITV,
/// incluyendo métricas agregadas y desglose completo por formas de pago compatible 1:1 con Crystal Reports.
/// </summary>
public sealed class EstacionFacturacionDato
{
    public required string CodEstacion { get; init; }
    public required string DesEstacion { get; init; }
    public required string CodEmpresa { get; init; }
    public int TotalInspecciones { get; init; }
    public decimal TotalIngresos { get; init; }

    // Desglose Contados (CODTIPOFORMAPAGO in 'C', 'X')
    public int ContadosNumInspecciones { get; init; }
    public decimal ContadosBase { get; init; }
    public decimal ContadosIva { get; init; }
    public decimal ContadosTasas { get; init; }
    public decimal ContadosTotal { get; init; }

    // Desglose Terceros (CODTIPOFORMAPAGO in '3', 'O')
    public int TercerosNumInspecciones { get; init; }
    public decimal TercerosBase { get; init; }
    public decimal TercerosIva { get; init; }
    public decimal TercerosTasas { get; init; }
    public decimal TercerosTotal { get; init; }

    // Desglose Tarjetas (CODTIPOFORMAPAGO = 'T')
    public int TarjetasNumInspecciones { get; init; }
    public decimal TarjetasBase { get; init; }
    public decimal TarjetasIva { get; init; }
    public decimal TarjetasTasas { get; init; }
    public decimal TarjetasTotal { get; init; }

    // Totales Oficiales de Inspecciones Crystal Reports
    public int TotalesNumInspecciones { get; init; }
    public decimal TotalesBase { get; init; }
    public decimal TotalesIva { get; init; }
    public decimal TotalesTasas { get; init; }
    public decimal TotalesTasasTrafico { get; init; }
    public decimal TotalesTasasIndustria { get; init; }
    public decimal TotalesTotal { get; init; }
    public int Gratuitas { get; init; }

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

    public decimal TicketMedio => TotalInspecciones > 0
        ? Math.Round(TotalIngresos / TotalInspecciones, 2)
        : 0.00m;
}
