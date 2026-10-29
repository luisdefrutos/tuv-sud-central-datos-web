using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using CentralDatos.Application.Features.Estaciones.Interfaces;
using CentralDatos.Domain.Entities.Estaciones;
using CentralDatos.Infrastructure.Configuration;
using CentralDatos.Infrastructure.Persistence.Sql;
using Dapper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public class OracleEstacionesRepository : IEstacionesRepository
{
    private readonly CentralItvOptions _options;
    private readonly ISqlLoader _sqlLoader;
    private readonly ILogger<OracleEstacionesRepository> _logger;

    public OracleEstacionesRepository(
        IOptions<CentralItvOptions> options,
        ISqlLoader sqlLoader,
        ILogger<OracleEstacionesRepository> logger)
    {
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _sqlLoader = sqlLoader ?? throw new ArgumentNullException(nameof(sqlLoader));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<EstacionUltimoDato>> ObtenerUltimosDatosCentralizadosAsync(CancellationToken cancellationToken = default)
    {
        // 1. Cargar consulta SQL externalizada y cacheada
        var sql = _sqlLoader.GetQuery("ObtenerUltimosDatosCentralizados");

        // 2. Intentar conexión directa ODP.NET Thin con Dapper
        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            try
            {
                return await ObtenerPorDapperAsync(sql, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fallo en conexión directa Oracle. Probando pasarela SOAP gestion-desa...");
            }
        }

        // 3. Fallback mediante pasarela SOAP CentralITV_Svc
        return await ObtenerPorSoapAsync(sql, cancellationToken);
    }

    private async Task<IReadOnlyList<EstacionUltimoDato>> ObtenerPorDapperAsync(string sql, CancellationToken cancellationToken)
    {
        using var conn = new OracleConnection(_options.ConnectionString);
        var command = new CommandDefinition(sql, cancellationToken: cancellationToken);
        var resultado = await conn.QueryAsync<EstacionUltimoDato>(command);
        return resultado.ToList();
    }

    private async Task<IReadOnlyList<EstacionUltimoDato>> ObtenerPorSoapAsync(string sql, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.SoapUrl))
        {
            throw new InvalidOperationException("La URL del servicio SOAP ('CentralItv:SoapUrl') no está configurada.");
        }

        var soapEnvelope = $@"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" 
               xmlns:xsd=""http://www.w3.org/2001/XMLSchema"" 
               xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/"">
  <soap:Body>
    <ExecuteQuery xmlns=""http://tempuri.org/"">
      <sql>{System.Security.SecurityElement.Escape(sql)}</sql>
    </ExecuteQuery>
  </soap:Body>
</soap:Envelope>";

        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        using var client = new HttpClient(handler);
        client.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 30);

        var request = new HttpRequestMessage(HttpMethod.Post, _options.SoapUrl)
        {
            Content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml")
        };
        request.Headers.Add("SOAPAction", "\"http://tempuri.org/ExecuteQuery\"");

        var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var xmlBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        return DesencriptarYParsearRespuesta(xmlBytes, _options.SoapDesKey);
    }

    private static IReadOnlyList<EstacionUltimoDato> DesencriptarYParsearRespuesta(byte[] encryptedBytes, string desKey)
    {
        var responseXml = Encoding.UTF8.GetString(encryptedBytes);
        var xdoc = XDocument.Parse(responseXml);
        XNamespace ns = "http://tempuri.org/";
        var base64Result = xdoc.Descendants(ns + "ExecuteQueryResult").FirstOrDefault()?.Value
                           ?? xdoc.Descendants().FirstOrDefault(e => e.Name.LocalName == "ExecuteQueryResult")?.Value;

        if (string.IsNullOrWhiteSpace(base64Result))
            return Array.Empty<EstacionUltimoDato>();

        var rawPayload = Convert.FromBase64String(base64Result);

        // Clave DES configurada en appsettings.json
        if (string.IsNullOrEmpty(desKey))
        {
            throw new InvalidOperationException("La clave DES ('CentralItv:SoapDesKey') no está configurada.");
        }

        var key = Encoding.ASCII.GetBytes(desKey);
        using var des = DES.Create();
        des.Key = key;
        des.IV = key;
        des.Mode = CipherMode.CBC;
        des.Padding = PaddingMode.PKCS7;

        using var decryptor = des.CreateDecryptor();
        var decryptedBytes = decryptor.TransformFinalBlock(rawPayload, 0, rawPayload.Length);
        var datasetXml = Encoding.UTF8.GetString(decryptedBytes);

        var dataDoc = XDocument.Parse(datasetXml);
        var rows = dataDoc.Descendants().Where(e => e.Name.LocalName == "Table");

        var lista = new List<EstacionUltimoDato>();
        foreach (var row in rows)
        {
            var codEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var desEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("DESESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var codEmpresa = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("COD_EMPRESA", StringComparison.OrdinalIgnoreCase))?.Value?.Trim();
            var tipoEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("TIPO_ESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim();
            var fechaStr = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("ULTIMA_INSPECCION", StringComparison.OrdinalIgnoreCase))?.Value;

            DateTime? fecha = null;
            if (DateTime.TryParse(fechaStr, out var parsed))
                fecha = parsed;

            lista.Add(new EstacionUltimoDato
            {
                CodEstacion = codEstacion,
                DesEstacion = desEstacion,
                CodEmpresa = codEmpresa,
                TipoEstacion = tipoEstacion,
                UltimaInspeccion = fecha
            });
        }

        return lista;
    }
}
