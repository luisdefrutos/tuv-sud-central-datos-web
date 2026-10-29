namespace CentralDatos.Infrastructure.Configuration;

/// <summary>
/// Opciones de configuración para la emisión y validación de tokens JWT.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SecretKey { get; set; } = "TuvSud_CentralDatos_SuperSecret_JwtKey_2026_KeyMustBeAtLeast32BytesLong!";
    public string Issuer { get; set; } = "TuvSud.CentralDatos.Api";
    public string Audience { get; set; } = "TuvSud.CentralDatos.Web";
    public int ExpirationHours { get; set; } = 8;
}

/// <summary>
/// Opciones para los servicios de autenticación corporativos (Active Directory / SOAP).
/// </summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string LoginSoapUrl { get; set; } = "https://gestion-desa.atisae.com/loginwebservice/login.asmx";
    public string LdapEncryptionKey { get; set; } = "HELKFN23AJURJSK2D";
    public string WindowsDomain { get; set; } = "ww001.itgr.net";
}

