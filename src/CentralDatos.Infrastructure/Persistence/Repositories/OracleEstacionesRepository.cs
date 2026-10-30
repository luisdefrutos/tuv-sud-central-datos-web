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

        // 2. Ejecución DIRECTA sobre Oracle (ODP.NET Thin + Dapper :1521) - Arquitectura Oficial Web
        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return await ObtenerPorDapperAsync(sql, cancellationToken);
        }

        // 3. Fallback de contingencia (únicamente si la cadena directa no estuviera configurada en appsettings)
        if (!string.IsNullOrWhiteSpace(_options.SoapUrl))
        {
            _logger.LogWarning("Cadena de conexión directa Oracle no detectada. Usando pasarela de contingencia SOAP ({SoapUrl})...", _options.SoapUrl);
            return await ObtenerPorSoapAsync(sql, cancellationToken);
        }

        throw new InvalidOperationException("No se ha configurado la cadena de conexión Oracle en ConnectionStrings:CentralItv.");
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

        // 1. Limpieza de SQL y cálculo de Clave y Passport (protocolo histórico CentralITV_Svc)
        var sqlLimpia = System.Text.RegularExpressions.Regex.Replace(sql, @"[^A-Za-z0-9]", "");
        var clave = ComputeMd5(sqlLimpia);
        var passport = ComputeMd5(clave + _options.SoapSecret);

        var soapEnvelope = $@"<?xml version=""1.0"" encoding=""utf-8""?>
<soap:Envelope xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" 
               xmlns:xsd=""http://www.w3.org/2001/XMLSchema"" 
               xmlns:soap=""http://schemas.xmlsoap.org/soap/envelope/"">
  <soap:Body>
    <GetDatos_Paginados_3 xmlns=""http://tempuri.org/"">
      <strSQL>{System.Security.SecurityElement.Escape(sql)}</strSQL>
      <intLimite_Inferior>-1</intLimite_Inferior>
      <intLimite_Superior>-1</intLimite_Superior>
      <Clave>{clave}</Clave>
      <Passport>{passport}</Passport>
    </GetDatos_Paginados_3>
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
        request.Headers.Add("SOAPAction", "\"http://tempuri.org/GetDatos_Paginados_3\"");

        var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var xmlBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        return ParsearRespuestaSoap(xmlBytes);
    }

    private static string ComputeMd5(string input)
    {
        var bytes = Encoding.Latin1.GetBytes(input);
        var hash = MD5.HashData(bytes);
        return Convert.ToHexStringLower(hash);
    }

    private static IReadOnlyList<EstacionUltimoDato> ParsearRespuestaSoap(byte[] xmlBytes)
    {
        var responseXml = Encoding.UTF8.GetString(xmlBytes);
        var xdoc = XDocument.Parse(responseXml);

        var rows = xdoc.Descendants().Where(e => e.Name.LocalName.Equals("Datos", StringComparison.OrdinalIgnoreCase) ||
                                                 e.Name.LocalName.Equals("Table", StringComparison.OrdinalIgnoreCase));

        var lista = new List<EstacionUltimoDato>();
        foreach (var row in rows)
        {
            var codEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var desEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("DESESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var codEmpresa = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODEMPRESA", StringComparison.OrdinalIgnoreCase) || e.Name.LocalName.Equals("COD_EMPRESA", StringComparison.OrdinalIgnoreCase))?.Value?.Trim();
            var tipoEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("TIPOESTACION", StringComparison.OrdinalIgnoreCase) || e.Name.LocalName.Equals("TIPO_ESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? "ITV";
            var fechaStr = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("ULTIMAINSPECCION", StringComparison.OrdinalIgnoreCase) || e.Name.LocalName.Equals("ULTIMA_INSPECCION", StringComparison.OrdinalIgnoreCase))?.Value;

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
