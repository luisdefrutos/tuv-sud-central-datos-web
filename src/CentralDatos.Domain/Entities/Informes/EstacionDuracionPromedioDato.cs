using CentralDatos.Domain.Constants;

namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Representa el desglose de duración promedio de inspecciones periódicas (001)
/// por estación y tipo de vehículo (clasificación MINER).
/// </summary>
public sealed class EstacionDuracionPromedioDato
{
    public required string CodEstacion { get; init; }
    public required string DesEstacion { get; init; }
    public required string CodEmpresa { get; init; }

    public required string TipoVehiculo { get; init; }
    public int OrdenTipo { get; init; }

    public int TotalInspecciones { get; init; }
    public decimal DuracionPromedioMinutos { get; init; }

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

    public string DuracionFormateada
    {
        get
        {
            if (DuracionPromedioMinutos <= 0) return "0 min";
            var mins = (int)Math.Floor(DuracionPromedioMinutos);
            var secs = (int)Math.Round((DuracionPromedioMinutos - mins) * 60);
            return secs > 0 ? $"{mins} min {secs:00} s" : $"{mins} min";
        }
    }
}

