using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CentralDatos.Infrastructure.Services.Auth;

public sealed class SoapLoginClient : ISoapLoginClient
{
    private readonly HttpClient _httpClient;
    private readonly AuthOptions _options;
    private readonly ILogger<SoapLoginClient> _logger;

    public SoapLoginClient(
        HttpClient httpClient,
        IOptions<AuthOptions> options,
        ILogger<SoapLoginClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<(bool Success, string Message)> ValidateLdapAsync(string username, string password, CancellationToken cancellationToken = default)
    {
        var cleanUser = username.Trim().ToUpperInvariant();
        var passport = ComputePassport(cleanUser, _options.LdapEncryptionKey);

        var soapEnvelope = $"""
            <?xml version="1.0" encoding="utf-8"?>
            <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
              <soap:Body>
                <LoginLDAP_AD xmlns="http://tempuri.org/LoginWebService/Login">
                  <user>{EscapeXml(cleanUser)}</user>
                  <password>{EscapeXml(password)}</password>
                  <passport>{passport}</passport>
                </LoginLDAP_AD>
              </soap:Body>
            </soap:Envelope>
            """;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, _options.LoginSoapUrl);
            request.Headers.Add("SOAPAction", "\"http://tempuri.org/LoginWebService/Login/LoginLDAP_AD\"");
            request.Content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseXml = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Respuesta HTTP no exitosa del WebService LoginLDAP_AD: {StatusCode}", response.StatusCode);
                return (false, "Error de comunicación con el servicio de autenticación corporativo.");
            }

            var doc = XDocument.Parse(responseXml);
            XNamespace ns = "http://tempuri.org/LoginWebService/Login";
            var resultNode = doc.Descendants(ns + "LoginLDAP_ADResult").FirstOrDefault();
            var resultCode = resultNode?.Value?.Trim().ToUpperInvariant();

            return resultCode switch
            {
                "OK" => (true, "Autenticación correcta"),
                "USUARIO_NO_EXISTE" => (false, "El usuario introducido no es un usuario AD válido"),
                "CONTRASENNA_INCORRECTA" => (false, "La contraseña es incorrecta"),
                "USUARIO_DESHABILITADO" => (false, "El usuario AD está deshabilitado"),
                "ERROR_NO_CONTROLADO" => (false, "Error no controlado en el servicio de autenticación AD"),
                _ => (false, $"Resultado de autenticación no reconocido: {resultCode}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al invocar el WebService LoginLDAP_AD para el usuario '{Username}'", cleanUser);
            return (false, "No fue posible conectar con el Directorio Activo corporativo.");
        }
    }

    private static string ComputePassport(string user, string key)
    {
        var raw = user + key;
        var hash = MD5.HashData(Encoding.Default.GetBytes(raw));
        return Convert.ToHexStringLower(hash);
    }

    private static string EscapeXml(string input) =>
        input.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;").Replace("'", "&apos;");
}

