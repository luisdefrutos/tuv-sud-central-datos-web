namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Entidad de dominio que representa una inspección técnica con cupón descuento aplicado en Central Datos.
/// Mapea la consulta de control oficial (frmCriterios.vb - Inspecciones_Cupon_Descuento).
/// </summary>
public sealed class InspeccionCuponDescuentoDato
{
    public string CodInspeccion { get; set; } = string.Empty;
    public string CodEstacion { get; set; } = string.Empty;
    public string DesEstacion { get; set; } = string.Empty;
    public string CodEmpresa { get; set; } = string.Empty;
    public string NombreEmpresa { get; set; } = string.Empty;
    public string ClaveSociedad { get; set; } = string.Empty;
    public string Matricula { get; set; } = string.Empty;
    public DateTime FechaInspeccion { get; set; }
    public string CodCupon { get; set; } = string.Empty;
    public string Promocion { get; set; } = string.Empty;
    public decimal Descuento { get; set; }
    public decimal ImporteAbonado { get; set; }
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string TipoMotor { get; set; } = string.Empty;
    public string TipoVehiculo { get; set; } = string.Empty;
    public string TipoInspeccion { get; set; } = string.Empty;
    public string TextoResultado { get; set; } = string.Empty;
    public string Resultado { get; set; } = string.Empty;
    public string Fase { get; set; } = string.Empty;
    public string Indica12 { get; set; } = string.Empty;
    public string? CHomologacion { get; set; }
    public string Clasificacion { get; set; } = string.Empty;
    public decimal? Mma { get; set; }
    public string? Kilometraje { get; set; }
}

