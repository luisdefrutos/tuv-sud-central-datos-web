namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Entidad de dominio que representa una inspección técnica con discrepancia
/// entre el bastidor de la inspección y el bastidor extraído por el escáner OBD.
/// Réplica 1:1 de frmCriterios.vb (Informe_Bastidores_OBD_No_Coincidentes).
/// </summary>
public sealed class BastidorObdNoCoincidenteDato
{
    public string CodInspeccion { get; set; } = string.Empty;
    public string CodEstacion { get; set; } = string.Empty;
    public string DesEstacion { get; set; } = string.Empty;
    public string CodEmpresa { get; set; } = string.Empty;
    public string ClaveSociedad { get; set; } = string.Empty;
    public DateTime FechaInspeccion { get; set; }
    public string Matricula { get; set; } = string.Empty;
    public string BastidorInspeccion { get; set; } = string.Empty;
    public string BastidorObd { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public string Clasificacion { get; set; } = string.Empty;
    public string? Nombre { get; set; }
    public string? Apellidos { get; set; }
    public string? CifFactura { get; set; }
    public string? CodInspector { get; set; }
    public string? CodInspector1 { get; set; }
    public string? CodInspector2 { get; set; }
    public string? CodInspector3 { get; set; }
    public string? InspectorResponsableValidacion { get; set; }
    public string? EquipoObd { get; set; }
    public string? CodEmpleadoBastidor { get; set; }
}

