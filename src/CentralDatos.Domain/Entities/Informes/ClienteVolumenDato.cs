namespace CentralDatos.Domain.Entities.Informes;

public class ClienteVolumenDato
{
    public string CodEstacion { get; set; } = string.Empty;
    public string DesEstacion { get; set; } = string.Empty;
    public string CodEmpresa { get; set; } = "01";
    public string ClaveSociedad => (CodEmpresa == "03" || CodEstacion.StartsWith("09")) ? "CAL" : "TSA";
    
    public string CifFactura { get; set; } = string.Empty;
    public string CifTitular { get; set; } = string.Empty;
    public string NombreCliente { get; set; } = string.Empty;
    public string Domicilio { get; set; } = string.Empty;
    public string CodigoPostal { get; set; } = string.Empty;
    public string Poblacion { get; set; } = string.Empty;
    public string Provincia { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string Telefono2 { get; set; } = string.Empty;
    public string Resultado { get; set; } = string.Empty;
    
    public int Cuenta { get; set; }
    public int CuentaCif { get; set; }
}

