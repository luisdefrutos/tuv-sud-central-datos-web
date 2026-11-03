namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Representa el registro agregado de facturación e inspecciones por estación y rango temporal.
/// </summary>
public record FacturacionComparativaDato(
    int RangoId,
    string CodEstacion,
    string DesEstacion,
    string ClaveSociedad,
    int TotalInspecciones,
    decimal TotalIngresos
);

