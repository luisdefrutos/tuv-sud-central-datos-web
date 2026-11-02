using CentralDatos.Domain.Constants;

namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Representa el registro de una inspección con defecto detectado en la lectura OBD (Bloque 15)
/// conforme a la reglamentación técnica de inspecciones periódicas ITV.
/// </summary>
public sealed class InspeccionDefectoObdDato
{
    public required string CodInspeccion { get; init; }
    public required string CodEstacion { get; init; }
    public required string DesEstacion { get; init; }
    public required string CodEmpresa { get; init; }
    public required string Matricula { get; init; }
    public DateTime FechaInspeccion { get; init; }
    public string Marca { get; init; } = "-";
    public string Modelo { get; init; } = "-";
    public string TipoMotor { get; init; } = "-";
    public string TipoVehiculo { get; init; } = "-";
    public string? CHomologacion { get; init; }
    public string Clasificacion { get; init; } = "-";
    public int? Mma { get; init; }
    public string? Kilometraje { get; init; }
    public string TipoInspeccion { get; init; } = "001";
    public string Resultado { get; init; } = "3";
    public string Fase { get; init; } = "1";
    public string DesNivelEmisiones { get; init; } = "-";
    public string Bloque { get; init; } = "15";
    public string Defecto { get; init; } = "02";
    public string Subdefecto { get; init; } = "06";
    public string Numero { get; init; } = "03";

    /// <summary>
    /// Código compuesto oficial del defecto ITV: Bloque.Defecto.Subdefecto.Numero (ej. 15.02.06.03)
    /// </summary>
    public string CodigoDefectoCompleto => $"{Bloque}.{Defecto}.{Subdefecto}.{Numero}";

    /// <summary>
    /// Tipo de motorización / combustible según código de defecto (02: Gasolina, 03: Diésel)
    /// </summary>
    public string TipoCombustible => Defecto switch
    {
        "02" => "Gasolina",
        "03" => "Diésel",
        _ => !string.IsNullOrWhiteSpace(TipoMotor) ? TipoMotor : "Otro"
    };

    /// <summary>
    /// Calificación de gravedad reglamentaria según el manual oficial ITV.
    /// </summary>
    public string GravedadDefecto => Numero switch
    {
        "51" => "Defecto Leve (DL)",
        _ => "Defecto Grave (DG)"
    };

    /// <summary>
    /// Descripción textual reglamentaria oficial del defecto OBD
    /// </summary>
    public string DescripcionDefecto => (Defecto, Numero) switch
    {
        ("02", "02") => "MIL no se enciende al poner el contacto (Gasolina)",
        ("02", "03") => "MIL permanece encendida tras el arranque del motor (Gasolina)",
        ("02", "04") => "Conector OBD inaccesible, deteriorado o sin señal (Gasolina)",
        ("02", "05") => "Conexión OBD no permitida / manipulación o fallo de enlace (Gasolina)",
        ("02", "31") => "Códigos de anomalía OBD confirmados en centralita (Gasolina)",
        ("02", "51") => "Desconexión o anomalía en protocolo de comunicación OBD (Gasolina)",

        ("03", "02") => "MIL no se enciende al poner el contacto (Diésel)",
        ("03", "03") => "MIL permanece encendida tras el arranque del motor (Diésel)",
        ("03", "04") => "Conector OBD inaccesible, deteriorado o sin señal (Diésel)",
        ("03", "05") => "Conexión OBD no permitida / manipulación o fallo de enlace (Diésel)",
        ("03", "31") => "Códigos de anomalía OBD confirmados en centralita (Diésel)",
        ("03", "51") => "Desconexión o anomalía en protocolo de comunicación OBD (Diésel)",

        _ => $"Defecto OBD {CodigoDefectoCompleto}"
    };

    /// <summary>
    /// Texto explicativo de la resolución de la inspección.
    /// </summary>
    public string TextoResultado => Resultado switch
    {
        "1" => "Favorable",
        "2" => "Favorable c/d leves",
        "3" => "Desfavorable",
        "4" => "Negativa",
        _ => "Desfavorable"
    };

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
}

