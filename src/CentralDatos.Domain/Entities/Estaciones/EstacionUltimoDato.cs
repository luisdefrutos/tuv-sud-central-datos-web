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

    public int? DiasSinTransmitir => UltimaInspeccion.HasValue
        ? Math.Max(0, (int)(DateTime.Now.Date - UltimaInspeccion.Value.Date).TotalDays)
        : null;

    public string EstadoSincronizacion
    {
        get
        {
            if (!UltimaInspeccion.HasValue) return "SinDatos";
            var dias = DiasSinTransmitir!.Value;
            if (dias <= 1) return "AlDia";
            if (dias <= 5) return "Alerta";
            return "Critico";
        }
    }

    public string EstadoSincronizacionLabel
    {
        get
        {
            if (!UltimaInspeccion.HasValue) return "Sin datos";
            var dias = DiasSinTransmitir!.Value;
            if (dias == 0) return "Al día (Hoy)";
            if (dias == 1) return "Al día (Ayer)";
            if (dias <= 5) return $"Alerta (hace {dias} días)";
            if (dias >= 365)
            {
                var anios = dias / 365;
                return $"Crítico (> {anios} {(anios == 1 ? "año" : "años")})";
            }
            if (dias >= 30)
            {
                var meses = dias / 30;
                return $"Crítico (> {meses} {(meses == 1 ? "mes" : "meses")})";
            }
            return $"Crítico (hace {dias} días)";
        }
    }

    public string NivelSincronizacion => EstadoSincronizacion switch
    {
        "AlDia" => "success",
        "Alerta" => "warning",
        "Critico" => "danger",
        _ => "danger"
    };

    public string TooltipSincronizacion
    {
        get
        {
            if (!UltimaInspeccion.HasValue) return "No hay ninguna inspección centralizada registrada para esta estación";
            var dias = DiasSinTransmitir!.Value;
            if (dias <= 1) return "Sincronización activa dentro de las últimas 24-48 horas";
            if (dias <= 5) return $"Retraso en la transmisión: última inspección recibida hace {dias} días";
            return $"Estación sin transmisión de inspecciones durante más de {dias} días";
        }
    }
}
