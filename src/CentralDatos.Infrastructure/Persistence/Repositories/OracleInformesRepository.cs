using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;
using CentralDatos.Infrastructure.Configuration;
using CentralDatos.Infrastructure.Persistence.Sql;
using Dapper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed class OracleInformesRepository : IInformesRepository
{
    private readonly CentralItvOptions _options;
    private readonly ISqlLoader _sqlLoader;
    private readonly ILogger<OracleInformesRepository> _logger;

    public OracleInformesRepository(
        IOptions<CentralItvOptions> options,
        ISqlLoader sqlLoader,
        ILogger<OracleInformesRepository> logger)
    {
        _options = options.Value ?? throw new ArgumentNullException(nameof(options));
        _sqlLoader = sqlLoader ?? throw new ArgumentNullException(nameof(sqlLoader));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<EstacionFacturacionDato>> ObtenerFacturacionAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeFacturacion");

        // 1. Filtrado dinámico adicional si aplica
        var sqlFinal = sqlBase;
        var whereExtraOuter = new StringBuilder();
        var whereExtraCte = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(codEmpresa))
        {
            whereExtraOuter.Append($" AND e.Cod_Empresa = '{codEmpresa.Trim()}'");
        }

        if (codEstaciones != null && codEstaciones.Count > 0)
        {
            var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim()}'"));
            whereExtraOuter.Append($" AND LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') IN ({codsIn})");
            whereExtraCte.Append($" AND i.CODESTACION IN ({codsIn})");
        }

        if (whereExtraCte.Length > 0)
        {
            var idxGroupCte = sqlFinal.IndexOf("GROUP BY i.CODESTACION", StringComparison.OrdinalIgnoreCase);
            if (idxGroupCte > 0)
            {
                sqlFinal = sqlFinal.Insert(idxGroupCte, whereExtraCte.ToString() + "\n   ");
            }
        }

        if (whereExtraOuter.Length > 0)
        {
            var idxOrder = sqlFinal.IndexOf("ORDER BY", StringComparison.OrdinalIgnoreCase);
            if (idxOrder > 0)
            {
                sqlFinal = sqlFinal.Insert(idxOrder, whereExtraOuter.ToString() + "\n ");
            }
        }

        // 2. Ejecución DIRECTA sobre Oracle (ODP.NET Thin + OracleDbType.Date :1521) - Rendimiento 3.6s vs 78s
        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return await ObtenerPorOracleDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
        }

        // 3. Fallback de contingencia (únicamente si la cadena directa no estuviera configurada en appsettings)
        if (!string.IsNullOrWhiteSpace(_options.SoapUrl))
        {
            _logger.LogWarning("Cadena de conexión directa Oracle no detectada. Usando pasarela de contingencia SOAP...");
            var sqlSoap = sqlFinal
                .Replace(":FechaInicio", $"TO_DATE('{fechaInicio:yyyy-MM-dd HH:mm:ss}', 'YYYY-MM-DD HH24:MI:SS')")
                .Replace(":FechaFin", $"TO_DATE('{fechaFin:yyyy-MM-dd HH:mm:ss}', 'YYYY-MM-DD HH24:MI:SS')");

            return await ObtenerPorSoapAsync(sqlSoap, cancellationToken);
        }

        throw new InvalidOperationException("No se ha configurado la cadena de conexión Oracle en ConnectionStrings:CentralItv.");
    }

    public async Task<IReadOnlyList<EstacionNumeroInspeccionesDato>> ObtenerNumeroInspeccionesAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeNumeroInspecciones");

        // 1. Filtrado dinámico adicional si aplica
        var sqlFinal = sqlBase;
        var whereExtraOuter = new StringBuilder();
        var whereExtraCte = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(codEmpresa))
        {
            whereExtraOuter.Append($" AND e.Cod_Empresa = '{codEmpresa.Trim()}'");
        }

        if (codEstaciones != null && codEstaciones.Count > 0)
        {
            var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim()}'"));
            whereExtraOuter.Append($" AND LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') IN ({codsIn})");
            whereExtraCte.Append($" AND i.CODESTACION IN ({codsIn})");
        }

        if (whereExtraCte.Length > 0)
        {
            var idxGroupCte = sqlFinal.IndexOf("GROUP BY i.CODESTACION", StringComparison.OrdinalIgnoreCase);
            if (idxGroupCte > 0)
            {
                sqlFinal = sqlFinal.Insert(idxGroupCte, whereExtraCte.ToString() + "\n   ");
            }
        }

        if (whereExtraOuter.Length > 0)
        {
            var idxOrder = sqlFinal.IndexOf("ORDER BY", StringComparison.OrdinalIgnoreCase);
            if (idxOrder > 0)
            {
                sqlFinal = sqlFinal.Insert(idxOrder, whereExtraOuter.ToString() + "\n ");
            }
        }

        // 2. Ejecución DIRECTA sobre Oracle (ODP.NET Thin)
        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return await ObtenerNumeroInspeccionesDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
        }

        // 3. Fallback de contingencia SOAP
        if (!string.IsNullOrWhiteSpace(_options.SoapUrl))
        {
            _logger.LogWarning("Cadena de conexión directa Oracle no detectada. Usando pasarela de contingencia SOAP para Número de Inspecciones...");
            var sqlSoap = sqlFinal
                .Replace(":FechaInicio", $"TO_DATE('{fechaInicio:yyyy-MM-dd HH:mm:ss}', 'YYYY-MM-DD HH24:MI:SS')")
                .Replace(":FechaFin", $"TO_DATE('{fechaFin:yyyy-MM-dd HH:mm:ss}', 'YYYY-MM-DD HH24:MI:SS')");

            return await ObtenerNumeroInspeccionesPorSoapAsync(sqlSoap, cancellationToken);
        }

        throw new InvalidOperationException("No se ha configurado la cadena de conexión Oracle en ConnectionStrings:CentralItv.");
    }

    private async Task<IReadOnlyList<EstacionNumeroInspeccionesDato>> ObtenerNumeroInspeccionesDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        await using var conn = new OracleConnection(_options.ConnectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = conn.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandText = sql;
        cmd.CommandTimeout = 120;

        cmd.Parameters.Add("FechaInicio", OracleDbType.Date).Value = fechaInicio;
        cmd.Parameters.Add("FechaFin", OracleDbType.Date).Value = fechaFin;

        var lista = new List<EstacionNumeroInspeccionesDato>();
        await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            lista.Add(new EstacionNumeroInspeccionesDato
            {
                CodEstacion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                DesEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                CodEmpresa = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim(),
                Favorables1 = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3)),
                Rechazadas1 = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4)),
                Favorables2 = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
                Rechazadas2 = reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6)),
                TotalInspecciones = reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7))
            });
        }
        return lista;
    }

    private async Task<IReadOnlyList<EstacionNumeroInspeccionesDato>> ObtenerNumeroInspeccionesPorSoapAsync(string sql, CancellationToken cancellationToken)
    {
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
        client.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 60);

        var request = new HttpRequestMessage(HttpMethod.Post, _options.SoapUrl)
        {
            Content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml")
        };
        request.Headers.Add("SOAPAction", "\"http://tempuri.org/GetDatos_Paginados_3\"");

        var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var xmlBytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        return ParsearRespuestaSoapNumeroInspecciones(xmlBytes);
    }

    private static IReadOnlyList<EstacionNumeroInspeccionesDato> ParsearRespuestaSoapNumeroInspecciones(byte[] xmlBytes)
    {
        var responseXml = Encoding.UTF8.GetString(xmlBytes);
        var xdoc = XDocument.Parse(responseXml);

        var rows = xdoc.Descendants().Where(e => e.Name.LocalName.Equals("Datos", StringComparison.OrdinalIgnoreCase) ||
                                                 e.Name.LocalName.Equals("Table", StringComparison.OrdinalIgnoreCase));

        int GetInt(XElement parent, string colName)
        {
            var val = parent.Elements().FirstOrDefault(e => e.Name.LocalName.Equals(colName, StringComparison.OrdinalIgnoreCase))?.Value;
            return int.TryParse(val, out var res) ? res : 0;
        }

        var lista = new List<EstacionNumeroInspeccionesDato>();
        foreach (var row in rows)
        {
            var codEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var desEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("DESESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var codEmpresa = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODEMPRESA", StringComparison.OrdinalIgnoreCase) || e.Name.LocalName.Equals("COD_EMPRESA", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? "01";

            lista.Add(new EstacionNumeroInspeccionesDato
            {
                CodEstacion = codEstacion,
                DesEstacion = desEstacion,
                CodEmpresa = codEmpresa,
                Favorables1 = GetInt(row, "FAVORABLES1"),
                Rechazadas1 = GetInt(row, "RECHAZADAS1"),
                Favorables2 = GetInt(row, "FAVORABLES2"),
                Rechazadas2 = GetInt(row, "RECHAZADAS2"),
                TotalInspecciones = GetInt(row, "TOTALINSPECCIONES")
            });
        }

        return lista;
    }

    private async Task<IReadOnlyList<EstacionFacturacionDato>> ObtenerPorOracleDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        await using var conn = new OracleConnection(_options.ConnectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = conn.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandText = sql;
        cmd.CommandTimeout = 120;

        cmd.Parameters.Add("FechaInicio", OracleDbType.Date).Value = fechaInicio;
        cmd.Parameters.Add("FechaFin", OracleDbType.Date).Value = fechaFin;

        var lista = new List<EstacionFacturacionDato>();
        await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            lista.Add(new EstacionFacturacionDato
            {
                CodEstacion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                DesEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                CodEmpresa = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim(),
                TotalInspecciones = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3)),
                TotalIngresos = reader.IsDBNull(4) ? 0m : Convert.ToDecimal(reader.GetValue(4)),

                ContadosNumInspecciones = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5)),
                ContadosBase = reader.IsDBNull(6) ? 0m : Convert.ToDecimal(reader.GetValue(6)),
                ContadosIva = reader.IsDBNull(7) ? 0m : Convert.ToDecimal(reader.GetValue(7)),
                ContadosTasas = reader.IsDBNull(8) ? 0m : Convert.ToDecimal(reader.GetValue(8)),
                ContadosTotal = reader.IsDBNull(9) ? 0m : Convert.ToDecimal(reader.GetValue(9)),

                TercerosNumInspecciones = reader.IsDBNull(10) ? 0 : Convert.ToInt32(reader.GetValue(10)),
                TercerosBase = reader.IsDBNull(11) ? 0m : Convert.ToDecimal(reader.GetValue(11)),
                TercerosIva = reader.IsDBNull(12) ? 0m : Convert.ToDecimal(reader.GetValue(12)),
                TercerosTasas = reader.IsDBNull(13) ? 0m : Convert.ToDecimal(reader.GetValue(13)),
                TercerosTotal = reader.IsDBNull(14) ? 0m : Convert.ToDecimal(reader.GetValue(14)),

                TarjetasNumInspecciones = reader.IsDBNull(15) ? 0 : Convert.ToInt32(reader.GetValue(15)),
                TarjetasBase = reader.IsDBNull(16) ? 0m : Convert.ToDecimal(reader.GetValue(16)),
                TarjetasIva = reader.IsDBNull(17) ? 0m : Convert.ToDecimal(reader.GetValue(17)),
                TarjetasTasas = reader.IsDBNull(18) ? 0m : Convert.ToDecimal(reader.GetValue(18)),
                TarjetasTotal = reader.IsDBNull(19) ? 0m : Convert.ToDecimal(reader.GetValue(19)),

                TotalesNumInspecciones = reader.IsDBNull(20) ? 0 : Convert.ToInt32(reader.GetValue(20)),
                TotalesBase = reader.IsDBNull(21) ? 0m : Convert.ToDecimal(reader.GetValue(21)),
                TotalesIva = reader.IsDBNull(22) ? 0m : Convert.ToDecimal(reader.GetValue(22)),
                TotalesTasas = reader.IsDBNull(23) ? 0m : Convert.ToDecimal(reader.GetValue(23)),
                TotalesTasasTrafico = reader.IsDBNull(24) ? 0m : Convert.ToDecimal(reader.GetValue(24)),
                TotalesTasasIndustria = reader.IsDBNull(25) ? 0m : Convert.ToDecimal(reader.GetValue(25)),
                TotalesTotal = reader.IsDBNull(26) ? 0m : Convert.ToDecimal(reader.GetValue(26)),
                Gratuitas = reader.IsDBNull(27) ? 0 : Convert.ToInt32(reader.GetValue(27))
            });
        }
        return lista;
    }

    private async Task<IReadOnlyList<EstacionFacturacionDato>> ObtenerPorSoapAsync(string sql, CancellationToken cancellationToken)
    {
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
        client.Timeout = TimeSpan.FromSeconds(_options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 60);

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

    private static IReadOnlyList<EstacionFacturacionDato> ParsearRespuestaSoap(byte[] xmlBytes)
    {
        var responseXml = Encoding.UTF8.GetString(xmlBytes);
        var xdoc = XDocument.Parse(responseXml);

        var rows = xdoc.Descendants().Where(e => e.Name.LocalName.Equals("Datos", StringComparison.OrdinalIgnoreCase) ||
                                                 e.Name.LocalName.Equals("Table", StringComparison.OrdinalIgnoreCase));

        int GetInt(XElement parent, string colName)
        {
            var val = parent.Elements().FirstOrDefault(e => e.Name.LocalName.Equals(colName, StringComparison.OrdinalIgnoreCase))?.Value;
            return int.TryParse(val, out var res) ? res : 0;
        }

        decimal GetDecimal(XElement parent, string colName)
        {
            var val = parent.Elements().FirstOrDefault(e => e.Name.LocalName.Equals(colName, StringComparison.OrdinalIgnoreCase))?.Value;
            return decimal.TryParse(val, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var res) ? res : 0m;
        }

        var lista = new List<EstacionFacturacionDato>();
        foreach (var row in rows)
        {
            var codEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var desEstacion = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("DESESTACION", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? string.Empty;
            var codEmpresa = row.Elements().FirstOrDefault(e => e.Name.LocalName.Equals("CODEMPRESA", StringComparison.OrdinalIgnoreCase) || e.Name.LocalName.Equals("COD_EMPRESA", StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? "01";

            lista.Add(new EstacionFacturacionDato
            {
                CodEstacion = codEstacion,
                DesEstacion = desEstacion,
                CodEmpresa = codEmpresa,
                TotalInspecciones = GetInt(row, "TOTALINSPECCIONES"),
                TotalIngresos = GetDecimal(row, "TOTALINGRESOS"),

                ContadosNumInspecciones = GetInt(row, "CONTADOSNUMINSPECCIONES"),
                ContadosBase = GetDecimal(row, "CONTADOSBASE"),
                ContadosIva = GetDecimal(row, "CONTADOSIVA"),
                ContadosTasas = GetDecimal(row, "CONTADOSTASAS"),
                ContadosTotal = GetDecimal(row, "CONTADOSTOTAL"),

                TercerosNumInspecciones = GetInt(row, "TERCEROSNUMINSPECCIONES"),
                TercerosBase = GetDecimal(row, "TERCEROSBASE"),
                TercerosIva = GetDecimal(row, "TERCEROSIVA"),
                TercerosTasas = GetDecimal(row, "TERCEROSTASAS"),
                TercerosTotal = GetDecimal(row, "TERCEROSTOTAL"),

                TarjetasNumInspecciones = GetInt(row, "TARJETASNUMINSPECCIONES"),
                TarjetasBase = GetDecimal(row, "TARJETASBASE"),
                TarjetasIva = GetDecimal(row, "TARJETASIVA"),
                TarjetasTasas = GetDecimal(row, "TARJETASTASAS"),
                TarjetasTotal = GetDecimal(row, "TARJETASTOTAL"),

                TotalesNumInspecciones = GetInt(row, "TOTALESNUMINSPECCIONES"),
                TotalesBase = GetDecimal(row, "TOTALESBASE"),
                TotalesIva = GetDecimal(row, "TOTALESIVA"),
                TotalesTasas = GetDecimal(row, "TOTALESTASAS"),
                TotalesTasasTrafico = GetDecimal(row, "TOTALESTASASTRAFICO"),
                TotalesTasasIndustria = GetDecimal(row, "TOTALESTASASINDUSTRIA"),
                TotalesTotal = GetDecimal(row, "TOTALESTOTAL"),
                Gratuitas = GetInt(row, "GRATUITAS")
            });
        }

        return lista;
    }
}

