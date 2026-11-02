using System.Data;
using System.Text;
using System.Xml.Linq;
using CentralDatos.Domain.Entities.Informes;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Extensions.Logging;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<InspeccionDefectoObdDato>> ObtenerDefectosObdAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeDefectosObd");

        var sqlFinal = sqlBase;
        var whereExtra = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(codEmpresa))
        {
            whereExtra.Append($" AND e.Cod_Empresa = '{codEmpresa.Trim()}'");
        }

        if (codEstaciones != null && codEstaciones.Count > 0)
        {
            var codsInts = codEstaciones
                .Select(c => int.TryParse(c.Trim(), out var n) ? n.ToString() : null)
                .Where(n => n != null)
                .ToList();

            if (codsInts.Count > 0)
            {
                var codsIn = string.Join(", ", codsInts);
                whereExtra.Append($" AND i.CODESTACION IN ({codsIn})");
            }
            else
            {
                var codsIn = string.Join(", ", codEstaciones.Select(c => $"'{c.Trim()}'"));
                whereExtra.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        if (!string.IsNullOrWhiteSpace(fase) && (fase == "1" || fase == "2"))
        {
            whereExtra.Append($" AND i.INDICA12 = '{fase.Trim()}'");
        }

        if (whereExtra.Length > 0)
        {
            var idxOrder = sqlFinal.IndexOf("ORDER BY", StringComparison.OrdinalIgnoreCase);
            if (idxOrder > 0)
            {
                sqlFinal = sqlFinal.Insert(idxOrder, whereExtra.ToString() + "\n ");
            }
            else
            {
                sqlFinal += whereExtra.ToString();
            }
        }

        if (!string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            return await ObtenerDefectosObdDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(_options.SoapUrl))
        {
            _logger.LogWarning("Cadena de conexión directa Oracle no detectada. Usando pasarela SOAP para Defectos OBD...");
            var sqlSoap = sqlFinal
                .Replace(":FechaInicio", $"TO_DATE('{fechaInicio:yyyy-MM-dd HH:mm:ss}', 'YYYY-MM-DD HH24:MI:SS')")
                .Replace(":FechaFin", $"TO_DATE('{fechaFin:yyyy-MM-dd HH:mm:ss}', 'YYYY-MM-DD HH24:MI:SS')");

            return await ObtenerDefectosObdPorSoapAsync(sqlSoap, cancellationToken);
        }

        throw new InvalidOperationException("No se ha configurado la cadena de conexión Oracle en ConnectionStrings:CentralItv.");
    }

    private async Task<IReadOnlyList<InspeccionDefectoObdDato>> ObtenerDefectosObdDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        LogSqlEjecutada("DEFECTOS_OBD", sql, fechaInicio, fechaFin);

        async Task<IReadOnlyList<InspeccionDefectoObdDato>> EjecutarQueryAsync(bool esReintento = false)
        {
            await using var conn = new OracleConnection(_options.ConnectionString);
            if (esReintento)
            {
                OracleConnection.ClearPool(conn);
            }
            await conn.OpenAsync(cancellationToken);

            await using var cmd = conn.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sql;
            cmd.CommandTimeout = 120;

            cmd.Parameters.Add("FechaInicio", OracleDbType.Date).Value = fechaInicio;
            cmd.Parameters.Add("FechaFin", OracleDbType.Date).Value = fechaFin;

            var lista = new List<InspeccionDefectoObdDato>();
            await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                lista.Add(new InspeccionDefectoObdDato
                {
                    CodInspeccion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                    CodEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                    DesEstacion = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim(),
                    CodEmpresa = reader.IsDBNull(3) ? "01" : reader.GetString(3).Trim(),
                    Matricula = reader.IsDBNull(4) ? string.Empty : reader.GetString(4).Trim(),
                    FechaInspeccion = reader.IsDBNull(5) ? DateTime.MinValue : reader.GetDateTime(5),
                    Marca = reader.IsDBNull(6) ? "-" : reader.GetString(6).Trim(),
                    Modelo = reader.IsDBNull(7) ? "-" : reader.GetString(7).Trim(),
                    TipoMotor = reader.IsDBNull(8) ? "-" : reader.GetString(8).Trim(),
                    TipoVehiculo = reader.IsDBNull(9) ? "-" : reader.GetString(9).Trim(),
                    CHomologacion = reader.IsDBNull(10) ? null : reader.GetString(10).Trim(),
                    Clasificacion = reader.IsDBNull(11) ? "-" : reader.GetString(11).Trim(),
                    Mma = reader.IsDBNull(12) ? null : Convert.ToInt32(reader.GetValue(12)),
                    Kilometraje = reader.IsDBNull(13) ? null : reader.GetString(13).Trim(),
                    TipoInspeccion = reader.IsDBNull(14) ? "001" : reader.GetString(14).Trim(),
                    Resultado = reader.IsDBNull(15) ? "3" : reader.GetString(15).Trim(),
                    Fase = reader.IsDBNull(16) ? "1" : reader.GetString(16).Trim(),
                    DesNivelEmisiones = reader.IsDBNull(17) ? "-" : reader.GetString(17).Trim(),
                    Bloque = reader.IsDBNull(18) ? "15" : reader.GetString(18).Trim(),
                    Defecto = reader.IsDBNull(19) ? "02" : reader.GetString(19).Trim(),
                    Subdefecto = reader.IsDBNull(20) ? "06" : reader.GetString(20).Trim(),
                    Numero = reader.IsDBNull(21) ? "03" : reader.GetString(21).Trim()
                });
            }
            return lista;
        }

        try
        {
            return await EjecutarQueryAsync();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogInformation("Consulta de defectos OBD cancelada por el cliente al interactuar con filtros.");
            return Array.Empty<InspeccionDefectoObdDato>();
        }
        catch (OracleException ex) when (cancellationToken.IsCancellationRequested || ex.Number == 12570 || ex.Message.Contains("ORA-12570", StringComparison.OrdinalIgnoreCase))
        {
            if (cancellationToken.IsCancellationRequested)
            {
                _logger.LogInformation("Conexión Oracle interrumpida por cancelación de cliente (ORA-12570).");
                return Array.Empty<InspeccionDefectoObdDato>();
            }
            _logger.LogWarning(ex, "ORA-12570 en informe de defectos OBD. Limpiando pool y reintentando...");
            try
            {
                return await EjecutarQueryAsync(esReintento: true);
            }
            catch (Exception retryEx) when (cancellationToken.IsCancellationRequested || retryEx is OperationCanceledException)
            {
                return Array.Empty<InspeccionDefectoObdDato>();
            }
        }
        catch (IOException ex) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogInformation("Conexión interrumpida por el cliente al recargar o filtrar: {Message}", ex.Message);
            return Array.Empty<InspeccionDefectoObdDato>();
        }
        catch (Exception ex) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogInformation("Operación cancelada por el cliente durante consulta OBD: {Message}", ex.Message);
            return Array.Empty<InspeccionDefectoObdDato>();
        }
        catch (Exception ex) when (ex is IOException || ex.InnerException is IOException || ex.Message.Contains("interrupción", StringComparison.OrdinalIgnoreCase) || ex.Message.Contains("transport connection", StringComparison.OrdinalIgnoreCase))
        {
            if (cancellationToken.IsCancellationRequested)
            {
                return Array.Empty<InspeccionDefectoObdDato>();
            }
            _logger.LogWarning(ex, "Socket Oracle interrumpido en informe de defectos OBD. Limpiando pool y reintentando...");
            try
            {
                return await EjecutarQueryAsync(esReintento: true);
            }
            catch (Exception) when (cancellationToken.IsCancellationRequested)
            {
                return Array.Empty<InspeccionDefectoObdDato>();
            }
        }
    }

    private async Task<IReadOnlyList<InspeccionDefectoObdDato>> ObtenerDefectosObdPorSoapAsync(string sql, CancellationToken cancellationToken)
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
        return ParsearRespuestaSoapDefectosObd(xmlBytes);
    }

    private static IReadOnlyList<InspeccionDefectoObdDato> ParsearRespuestaSoapDefectosObd(byte[] xmlBytes)
    {
        var responseXml = Encoding.UTF8.GetString(xmlBytes);
        var xdoc = XDocument.Parse(responseXml);

        var rows = xdoc.Descendants().Where(e => e.Name.LocalName.Equals("Datos", StringComparison.OrdinalIgnoreCase) ||
                                                 e.Name.LocalName.Equals("Table", StringComparison.OrdinalIgnoreCase));

        int? GetNullableInt(XElement parent, string colName)
        {
            var val = parent.Elements().FirstOrDefault(e => e.Name.LocalName.Equals(colName, StringComparison.OrdinalIgnoreCase))?.Value;
            return int.TryParse(val, out var res) ? res : null;
        }

        DateTime GetDate(XElement parent, string colName)
        {
            var val = parent.Elements().FirstOrDefault(e => e.Name.LocalName.Equals(colName, StringComparison.OrdinalIgnoreCase))?.Value;
            return DateTime.TryParse(val, out var res) ? res : DateTime.MinValue;
        }

        string GetStr(XElement parent, string colName, string def = "")
        {
            return parent.Elements().FirstOrDefault(e => e.Name.LocalName.Equals(colName, StringComparison.OrdinalIgnoreCase))?.Value?.Trim() ?? def;
        }

        var lista = new List<InspeccionDefectoObdDato>();
        foreach (var row in rows)
        {
            lista.Add(new InspeccionDefectoObdDato
            {
                CodInspeccion = GetStr(row, "CODINSPECCION"),
                CodEstacion = GetStr(row, "CODESTACION"),
                DesEstacion = GetStr(row, "DESESTACION"),
                CodEmpresa = GetStr(row, "CODEMPRESA", "01"),
                Matricula = GetStr(row, "MATRICULA"),
                FechaInspeccion = GetDate(row, "FECHAINSPECCION"),
                Marca = GetStr(row, "MARCA", "-"),
                Modelo = GetStr(row, "MODELO", "-"),
                TipoMotor = GetStr(row, "TIPOMOTOR", "-"),
                TipoVehiculo = GetStr(row, "TIPOVEHICULO", "-"),
                CHomologacion = GetStr(row, "CHOMOLOGACION"),
                Clasificacion = GetStr(row, "CLASIFICACION", "-"),
                Mma = GetNullableInt(row, "MMA"),
                Kilometraje = GetStr(row, "KILOMETRAJE"),
                TipoInspeccion = GetStr(row, "TIPOINSPECCION", "001"),
                Resultado = GetStr(row, "RESULTADO", "3"),
                Fase = GetStr(row, "FASE", "1"),
                DesNivelEmisiones = GetStr(row, "DESNIVELEMISIONES", "-"),
                Bloque = GetStr(row, "BLOQUE", "15"),
                Defecto = GetStr(row, "DEFECTO", "02"),
                Subdefecto = GetStr(row, "SUBDEFECTO", "06"),
                Numero = GetStr(row, "NUMERO", "03")
            });
        }

        return lista;
    }
}

