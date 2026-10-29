using CentralDatos.Domain.Constants;

namespace CentralDatos.Domain.Entities.Estaciones;

public class EstacionUltimoDato
{
    public required string CodEstacion { get; init; }
    public required string DesEstacion { get; init; }
    public string? CodEmpresa { get; init; }
    public string? TipoEstacion { get; init; }
    public DateTime? UltimaInspeccion { get; init; }

    public string NombreEmpresa => CodEmpresa switch
    {
        EmpresasConstants.CodigoAtisae => EmpresasConstants.NombreAtisae,
        EmpresasConstants.CodigoCal => EmpresasConstants.NombreCal,
        _ => !string.IsNullOrEmpty(CodEmpresa) ? $"Sociedad {CodEmpresa}" : "General"
    };

    public string EstadoSincronizacion
    {
        get
        {
            if (UltimaInspeccion == null) return "SinDatos";
            var dias = (DateTime.Now - UltimaInspeccion.Value).TotalDays;
            if (dias <= 1) return "AlDia";
            if (dias <= 7) return "DesfaseLeve";
            return "Desconectada";
        }
    }
}
