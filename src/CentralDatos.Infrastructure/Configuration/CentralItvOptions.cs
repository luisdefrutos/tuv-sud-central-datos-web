namespace CentralDatos.Infrastructure.Configuration;

/// <summary>
/// Opciones de configuración fuertemente tipadas para la conexión y servicios de Central Datos.
/// Evita cadenas hardcodeadas en constructores y centraliza la configuración en appsettings.json.
/// </summary>
public class CentralItvOptions
{
    public const string SectionName = "CentralItv";

    public string ConnectionString { get; set; } = string.Empty;
    public string SoapUrl { get; set; } = string.Empty;
    public string SoapDesKey { get; set; } = string.Empty;
    public string SoapSecret { get; set; } = "HELKFN23AJURJSK2D";
    public int TimeoutSeconds { get; set; } = 30;
}
