using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using CentralDatos.Application.Features.Estaciones.Interfaces;
using CentralDatos.Domain.Entities.Estaciones;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public class OracleEstacionesRepository : IEstacionesRepository
{
    private readonly string _connectionString;
    private readonly string _soapUrl;
    private readonly ILogger<OracleEstacionesRepository> _logger;

    private const string SqlUltimosDatos = @"
        SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CODESTACION,
               e.DesEstacion,
               e.Cod_Empresa,
               'ITV' AS TIPO_ESTACION,
               (SELECT MAX(i.FECHAINSPECCION) 
                  FROM CENTRALITV.INSPECCION i 
                 WHERE i.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')) AS ULTIMA_INSPECCION
          FROM CENTRALITV.ESTACIONES e
         WHERE e.Central_Datos = -1
         ORDER BY e.DesEstacion";

    public OracleEstacionesRepository(IConfiguration configuration, ILogger<OracleEstacionesRepository> logger)
    {
        _connectionString = configuration.GetConnectionString("CentralItv") ?? string.Empty;
        _soapUrl = configuration["CentralItv:SoapUrl"] ?? "https://gestion-desa.atisae.com/centralitvwebservice/centralitv.asmx";
        _logger = logger;
    }

    public async Task<IReadOnlyList<EstacionUltimoDato>> ObtenerUltimosDatosCentralizadosAsync(CancellationToken cancellationToken = default)
    {
        // 1. Intentar conexión directa ODP.NET Thin
        if (!string.IsNullOrWhiteSpace(_connectionString))
        {
            try
            {
                return await ObtenerPorOracleDirectoAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Fallo en conexión directa Oracle. Probando pasarela SOAP gestion-desa...");
            }
        }

        // 2. Fallback de desarrollo mediante CentralITV_Svc SOAP
        return await ObtenerPorSoapAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<EstacionUltimoDato>> ObtenerPorOracleDirectoAsync(CancellationToken cancellationToken)
    {
        var lista = new List<EstacionUltimoDato>();
        using var conn = new OracleConnection(_connectionString);
        await conn.OpenAsync(cancellationToken);

        using var cmd = conn.CreateCommand();
        cmd.CommandText = SqlUltimosDatos;
        cmd.CommandType = CommandType.Text;

        using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            lista.Add(new EstacionUltimoDato
            {
                CodEstacion = reader.GetString(0).Trim(),
                DesEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                CodEmpresa = reader.IsDBNull(2) ? null : reader.GetString(2).Trim(),
                TipoEstacion = reader.IsDBNull(3) ? null : reader.GetString(3).Trim(),
                UltimaInspeccion = reader.IsDBNull(4) ? null : reader.GetDateTime(4)
            });
        }

        return lista;
    }

    private async Task<IReadOnlyList<EstacionUltimoDato>> ObtenerPorSoapAsync(CancellationToken cancellationToken)
    {
        var soapEnvelope = $@"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" 
               xmlns:xsd=""http://www.w3.org/2001/XMLSchema"" 
               xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/"">
  <soap:Body>
    <ExecuteQuery xmlns=""http://tempuri.org/"">
      <sql>{System.Security.SecurityElement.Escape(SqlUltimosDatos)}</sql>
    </ExecuteQuery>
  </soap:Body>
</soap:Envelope>";

        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true
        };
        using var client = new HttpClient(handler);
        client.Timeout = TimeSpan.FromSeconds(30);

        var request = new HttpRequestMessage(HttpMethod.Post, _soapUrl)
        {
            Content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml")
        };
        request.Headers.Add("SOAPAction", "\"http://tempuri.org/ExecuteQuery\"");

        var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var xmlBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        return DesencriptarYParsearRespuesta(xmlBytes);
    }

    private static IReadOnlyList<EstacionUltimoDato> DesencriptarYParsearRespuesta(byte[] encryptedBytes)
    {
        // 1. Extraer contenido Base64 de la respuesta SOAP
        var responseXml = Encoding.UTF8.GetString(encryptedBytes);
        var xdoc = XDocument.Parse(responseXml);
        XNamespace ns = "http://tempuri.org/";
        var base64Result = xdoc.Descendants(ns + "ExecuteQueryResult").FirstOrDefault()?.Value
                           ?? xdoc.Descendants().FirstOrDefault(e => e.Name.LocalName == "ExecuteQueryResult")?.Value;

        if (string.IsNullOrWhiteSpace(base64Result))
            return Array.Empty<EstacionUltimoDato>();

        var rawPayload = Convert.FromBase64String(base64Result);

        // 2. Desencriptar DES Legacy (Key/IV fijos de CentralITV_Svc)
        var key = Encoding.ASCII.GetBytes("20030514");
        using var des = DES.Create();
        des.Key = key;
        des.IV = key;
        des.Mode = CipherMode.CBC;
        des.Padding = PaddingMode.PKCS7;

        using var decryptor = des.CreateDecryptor();
        var decryptedBytes = decryptor.TransformFinalBlock(rawPayload, 0, rawPayload.Length);
        var datasetXml = Encoding.UTF8.GetString(decryptedBytes);

        // 3. Parsear Diffgram / DataSet
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

