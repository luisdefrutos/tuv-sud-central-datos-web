using System;

namespace CentralDatos.Domain.Entities.Informes;

public class InspRangoHorarioDato
{
    public int CodEstacion { get; set; }
    public string DesEstacion { get; set; } = string.Empty;
    public string CodEmpresa { get; set; } = "01";
    public string ClaveSociedad => (CodEmpresa == "03" || CodEstacion.ToString().PadLeft(4, '0').StartsWith("09")) ? "CAL" : "TSA";
    public DateTime Fecha { get; set; }
    public int H06 { get; set; }
    public int H07 { get; set; }
    public int H08 { get; set; }
    public int H09 { get; set; }
    public int H10 { get; set; }
    public int H11 { get; set; }
    public int H12 { get; set; }
    public int H13 { get; set; }
    public int H14 { get; set; }
    public int H15 { get; set; }
    public int H16 { get; set; }
    public int H17 { get; set; }
    public int H18 { get; set; }
    public int H19 { get; set; }
    public int H20 { get; set; }
    public int H21 { get; set; }

    public int TotalFila => H06 + H07 + H08 + H09 + H10 + H11 + H12 + H13 + H14 + H15 + H16 + H17 + H18 + H19 + H20 + H21;
}

