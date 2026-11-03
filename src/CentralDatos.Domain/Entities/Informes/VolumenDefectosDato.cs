namespace CentralDatos.Domain.Entities.Informes;

public class VolumenDefectosDato
{
    public string CodEstacion { get; set; } = string.Empty;
    public string DesEstacion { get; set; } = string.Empty;
    public string CodEmpresa { get; set; } = "01";
    public string ClaveSociedad => (CodEmpresa == "03" || CodEstacion.StartsWith("09")) ? "CAL" : "TSA";
    public string GrupoCategoria { get; set; } = string.Empty;
    public string Bloque { get; set; } = string.Empty;
    public string Defecto { get; set; } = string.Empty;
    public string Subdefecto { get; set; } = string.Empty;
    public string Gravedad { get; set; } = "L"; // L = Leve, G = Grave, MG = Muy Grave
    public string Descripcion { get; set; } = string.Empty;
    public int NumDefectos { get; set; }
}

