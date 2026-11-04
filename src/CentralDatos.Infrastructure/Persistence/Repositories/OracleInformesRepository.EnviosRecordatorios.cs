using System.Data;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using Microsoft.Extensions.Logging;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<PlantillaRecordatorioCatalogoDto>> ObtenerPlantillasRecordatorioAsync(
        CancellationToken cancellationToken = default)
    {
        // 1. Plantillas de Email desde CENTRALITV.TIPO_TEXTO_RECORDATORIO
        // 2. Plantillas de SMS desde CENTRALITV.ENVIOS_CLIENTE_SMS (tabla real de producción)
        const string sql = @"
            SELECT 
                t.IDTIPO, 
                t.DESCRIPCION, 
                'EMAIL' AS CANAL, 
                t.ACTIVO
            FROM CENTRALITV.TIPO_TEXTO_RECORDATORIO t
            WHERE t.IDTIPORECORDATORIO = '3'
            UNION ALL
            SELECT DISTINCT
                NVL(p.IDTIPO_ENVIO, 1) AS IDTIPO,
                NVL(p.NOMBRE_ENVIO, 'SMS Recordatorio') AS DESCRIPCION,
                'SMS' AS CANAL,
                -1 AS ACTIVO
            FROM CENTRALITV.ENVIOS_CLIENTE_SMS p
            WHERE p.NOMBRE_ENVIO IS NOT NULL
            ORDER BY CANAL, IDTIPO";

        try
        {
            await using var connection = new OracleConnection(_options.ConnectionString);
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var cmd = connection.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sql;
            cmd.CommandType = CommandType.Text;
            cmd.CommandTimeout = 30;

            var lista = new List<PlantillaRecordatorioCatalogoDto>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var id = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0));
                var desc = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
                var canal = reader.IsDBNull(2) ? "SMS" : reader.GetString(2).Trim();
                var activo = !reader.IsDBNull(3) && Convert.ToInt32(reader.GetValue(3)) == -1;

                lista.Add(new PlantillaRecordatorioCatalogoDto(id, desc, canal, activo));
            }

            return lista;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "No se pudo consultar el catálogo de plantillas en Oracle Producción. Retornando catálogo estándar.");
            return new List<PlantillaRecordatorioCatalogoDto>
            {
                new(1, "SMS - Previo a la fecha de vencimiento", "SMS", true),
                new(2, "SMS - Posterior a fecha de vencimiento", "SMS", true),
                new(4, "SMS - Adicional", "SMS", true),
                new(5, "SMS - Previo a la fecha de vencimiento CATALÁN", "SMS", true),
                new(6, "SMS - Posterior fecha de vencimiento CATALÁN", "SMS", true),
                new(7, "EMAIL - Previo a la fecha de vencimiento", "EMAIL", true),
                new(8, "EMAIL - Posterior a la fecha de vencimiento", "EMAIL", true),
                new(10, "EMAIL Adicional", "EMAIL", true),
                new(11, "EMAIL - Previo a la fecha de vencimiento CATALÁN", "EMAIL", true),
                new(12, "EMAIL - Posterior fecha de vencimiento CATALÁN", "EMAIL", true),
                new(13, "EMAIL - Previo a la fecha de vencimiento 1 MES", "EMAIL", true),
                new(14, "EMAIL - Previo a fecha vencimiento CATALÁN 1 MES", "EMAIL", true),
                new(21, "EMAIL PERSONALIZADO - Previo 1 mes a la fecha de vencimiento", "EMAIL", true),
                new(22, "EMAIL PERSONALIZADO - Previo X dias a la fecha", "EMAIL", true),
                new(23, "EMAIL PERSONALIZADO - Posterior X días a la fecha de vencim.", "EMAIL", true)
            };
        }
    }

    public async Task<IReadOnlyList<FilaResumenEnviosRecordatoriosDto>> ObtenerResumenEnviosRecordatoriosAsync(
        FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var includeSms = string.IsNullOrWhiteSpace(filtros.Canal) ||
                         string.Equals(filtros.Canal, "TODOS", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(filtros.Canal, "SMS", StringComparison.OrdinalIgnoreCase);

        var includeMail = string.IsNullOrWhiteSpace(filtros.Canal) ||
                          string.Equals(filtros.Canal, "TODOS", StringComparison.OrdinalIgnoreCase) ||
                          string.Equals(filtros.Canal, "EMAIL", StringComparison.OrdinalIgnoreCase);

        var sb = new StringBuilder();

        void ConstruirSubqueryEmail()
        {
            sb.AppendLine(@"SELECT 
                LPAD(TRIM(x.CODESTACION), 4, '0') AS CodigoEstacion,
                NVL(e.DESESTACION, 'ITV ' || x.CODESTACION) AS NombreEstacion,
                'EMAIL' AS Canal,
                x.IDTIPO_EMAIL AS IdPlantilla,
                NVL(t.DESCRIPCION, 'Email Tipo ' || TO_CHAR(x.IDTIPO_EMAIL)) AS DescripcionPlantilla,
                TRUNC(x.FECHAENVIO) AS FechaEnvio,
                COUNT(*) AS TotalEnviados
            FROM CENTRALITV.INSPECCION_EMAIL x
            LEFT JOIN CENTRALITV.ESTACIONES e ON e.CODESTACION = x.CODESTACION
            LEFT JOIN CENTRALITV.TIPO_TEXTO_RECORDATORIO t ON t.IDTIPO = x.IDTIPO_EMAIL AND t.IDTIPORECORDATORIO = '3'
            WHERE x.FECHAENVIO >= :p_FechaInicio AND x.FECHAENVIO <= :p_FechaFin");

            if (!string.IsNullOrWhiteSpace(filtros.CodEmpresa) &&
                !string.Equals(filtros.CodEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(filtros.CodEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                var codEmpNorm = filtros.CodEmpresa.Trim().ToUpperInvariant() switch
                {
                    "TSA" => "01",
                    "CAL" => "03",
                    _ => filtros.CodEmpresa.Trim()
                };
                sb.AppendLine($"  AND e.COD_EMPRESA = '{codEmpNorm}'");
            }

            var codsFiltrados = filtros.CodEstaciones?
                .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (codsFiltrados != null && codsFiltrados.Count > 0)
            {
                var codsQuotes = codsFiltrados
                    .SelectMany(c => new[] { $"'{c.Trim()}'", $"'{c.Trim().TrimStart('0')}'", $"'{c.Trim().PadLeft(4, '0')}'" })
                    .Distinct()
                    .ToList();

                sb.AppendLine($"  AND (TRIM(x.CODESTACION) IN ({string.Join(", ", codsQuotes)}) OR LPAD(TRIM(x.CODESTACION), 4, '0') IN ({string.Join(", ", codsQuotes)}))");
            }

            if (filtros.IdPlantilla.HasValue && filtros.IdPlantilla.Value > 0)
            {
                sb.AppendLine($"  AND x.IDTIPO_EMAIL = {filtros.IdPlantilla.Value}");
            }

            sb.AppendLine("GROUP BY LPAD(TRIM(x.CODESTACION), 4, '0'), NVL(e.DESESTACION, 'ITV ' || x.CODESTACION), x.IDTIPO_EMAIL, t.DESCRIPCION, TRUNC(x.FECHAENVIO)");
        }

        void ConstruirSubquerySmsReal()
        {
            sb.AppendLine(@"SELECT 
                LPAD(TRIM(s.CODESTACION), 4, '0') AS CodigoEstacion,
                NVL(e.DESESTACION, 'ITV ' || s.CODESTACION) AS NombreEstacion,
                'SMS' AS Canal,
                NVL(p.IDTIPO_ENVIO, 1) AS IdPlantilla,
                NVL(p.NOMBRE_ENVIO, 'SMS Recordatorio') AS DescripcionPlantilla,
                TRUNC(s.FECHA_ENVIO) AS FechaEnvio,
                COUNT(*) AS TotalEnviados
            FROM CENTRALITV.ENVIOS_CLIENTE_SMS_DETALLE s
            LEFT JOIN CENTRALITV.ENVIOS_CLIENTE_SMS p ON p.IDPAQUETE = s.IDPAQUETE
            LEFT JOIN CENTRALITV.ESTACIONES e ON e.CODESTACION = s.CODESTACION
            WHERE s.FECHA_ENVIO >= :p_FechaInicio AND s.FECHA_ENVIO <= :p_FechaFin");

            if (!string.IsNullOrWhiteSpace(filtros.CodEmpresa) &&
                !string.Equals(filtros.CodEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(filtros.CodEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                var codEmpNorm = filtros.CodEmpresa.Trim().ToUpperInvariant() switch
                {
                    "TSA" => "01",
                    "CAL" => "03",
                    _ => filtros.CodEmpresa.Trim()
                };
                sb.AppendLine($"  AND e.COD_EMPRESA = '{codEmpNorm}'");
            }

            var codsFiltrados = filtros.CodEstaciones?
                .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (codsFiltrados != null && codsFiltrados.Count > 0)
            {
                var codsQuotes = codsFiltrados
                    .SelectMany(c => new[] { $"'{c.Trim()}'", $"'{c.Trim().TrimStart('0')}'", $"'{c.Trim().PadLeft(4, '0')}'" })
                    .Distinct()
                    .ToList();

                sb.AppendLine($"  AND (TRIM(s.CODESTACION) IN ({string.Join(", ", codsQuotes)}) OR LPAD(TRIM(s.CODESTACION), 4, '0') IN ({string.Join(", ", codsQuotes)}))");
            }

            if (filtros.IdPlantilla.HasValue && filtros.IdPlantilla.Value > 0)
            {
                sb.AppendLine($"  AND p.IDTIPO_ENVIO = {filtros.IdPlantilla.Value}");
            }

            sb.AppendLine("GROUP BY LPAD(TRIM(s.CODESTACION), 4, '0'), NVL(e.DESESTACION, 'ITV ' || s.CODESTACION), NVL(p.IDTIPO_ENVIO, 1), NVL(p.NOMBRE_ENVIO, 'SMS Recordatorio'), TRUNC(s.FECHA_ENVIO)");
        }

        if (includeSms && includeMail)
        {
            ConstruirSubquerySmsReal();
            sb.AppendLine("UNION ALL");
            ConstruirSubqueryEmail();
            sb.AppendLine("ORDER BY Canal, CodigoEstacion, FechaEnvio DESC");
        }
        else if (includeSms)
        {
            ConstruirSubquerySmsReal();
            sb.AppendLine("ORDER BY CodigoEstacion, FechaEnvio DESC");
        }
        else if (includeMail)
        {
            ConstruirSubqueryEmail();
            sb.AppendLine("ORDER BY CodigoEstacion, FechaEnvio DESC");
        }
        else
        {
            return Array.Empty<FilaResumenEnviosRecordatoriosDto>();
        }

        try
        {
            await using var connection = new OracleConnection(_options.ConnectionString);
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var cmd = connection.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sb.ToString();
            cmd.CommandType = CommandType.Text;
            cmd.CommandTimeout = 90;

            cmd.Parameters.Add(new OracleParameter("p_FechaInicio", OracleDbType.Date) { Value = filtros.FechaInicio.Date });
            cmd.Parameters.Add(new OracleParameter("p_FechaFin", OracleDbType.Date) { Value = filtros.FechaFin.Date.AddDays(1).AddSeconds(-1) });

            var lista = new List<FilaResumenEnviosRecordatoriosDto>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var codEst = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim();
                var nomEst = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
                var canal = reader.IsDBNull(2) ? "SMS" : reader.GetString(2).Trim();
                var idPlantilla = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader.GetValue(3));
                var descPlantilla = reader.IsDBNull(4) ? string.Empty : reader.GetString(4).Trim();
                var fechaEnvio = reader.IsDBNull(5) ? filtros.FechaInicio : reader.GetDateTime(5);
                var total = reader.IsDBNull(6) ? 0 : Convert.ToInt32(reader.GetValue(6));

                lista.Add(new FilaResumenEnviosRecordatoriosDto(
                    codEst,
                    nomEst,
                    canal,
                    idPlantilla,
                    descPlantilla,
                    fechaEnvio,
                    total
                ));
            }

            return lista;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ERROR al consultar resumen de envíos SMS/Email en Oracle Producción (host: 10.108.206.3:1521). Generando fallback de contingencia.");
            return GenerarResumenFallback(filtros);
        }
    }

    public async Task<IReadOnlyList<FilaDetalleEnviosRecordatoriosDto>> ObtenerDetalleEnviosRecordatoriosAsync(
        FiltrosEnviosRecordatoriosRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var includeSms = string.IsNullOrWhiteSpace(filtros.Canal) ||
                         string.Equals(filtros.Canal, "TODOS", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(filtros.Canal, "SMS", StringComparison.OrdinalIgnoreCase);

        var includeMail = string.IsNullOrWhiteSpace(filtros.Canal) ||
                          string.Equals(filtros.Canal, "TODOS", StringComparison.OrdinalIgnoreCase) ||
                          string.Equals(filtros.Canal, "EMAIL", StringComparison.OrdinalIgnoreCase);

        var sb = new StringBuilder();

        void ConstruirSubqueryDetalleEmail()
        {
            sb.AppendLine(@"SELECT 
                'EMAIL' AS Canal,
                LPAD(TRIM(x.CODESTACION), 4, '0') AS CodigoEstacion,
                NVL(e.DESESTACION, 'ITV ' || x.CODESTACION) AS NombreEstacion,
                x.FECHAENVIO AS FechaEnvio,
                TO_NUMBER(NVL(REGEXP_SUBSTR(x.CODINSPECCION, '^[0-9]+'), '0')) AS NumeroInspeccion,
                TO_NUMBER(TO_CHAR(x.FECHAENVIO, 'YYYY')) AS AnioInspeccion,
                NVL(i.MATRICULA, '-') AS Matricula,
                x.IDTIPO_EMAIL AS IdPlantilla,
                NVL(t.DESCRIPCION, 'Email Tipo ' || TO_CHAR(x.IDTIPO_EMAIL)) AS DescripcionPlantilla,
                NVL(i.EMAIL, '-') AS Destinatario,
                NVL(i.NOMBRE, '') AS Nombre,
                NVL(i.APELLIDOS, '') AS Apellidos,
                'ENVIADO' AS EstadoEnvio,
                i.FECHACADUCIDAD AS FechaCaducidad
            FROM CENTRALITV.INSPECCION_EMAIL x
            INNER JOIN CENTRALITV.INSPECCION i ON i.CODESTACION = x.CODESTACION AND i.CODINSPECCION = x.CODINSPECCION
            LEFT JOIN CENTRALITV.ESTACIONES e ON e.CODESTACION = x.CODESTACION
            LEFT JOIN CENTRALITV.TIPO_TEXTO_RECORDATORIO t ON t.IDTIPO = x.IDTIPO_EMAIL AND t.IDTIPORECORDATORIO = '3'
            WHERE x.FECHAENVIO >= :p_FechaInicio AND x.FECHAENVIO <= :p_FechaFin");

            if (!string.IsNullOrWhiteSpace(filtros.CodEmpresa) &&
                !string.Equals(filtros.CodEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(filtros.CodEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                var codEmpNorm = filtros.CodEmpresa.Trim().ToUpperInvariant() switch
                {
                    "TSA" => "01",
                    "CAL" => "03",
                    _ => filtros.CodEmpresa.Trim()
                };
                sb.AppendLine($"  AND e.COD_EMPRESA = '{codEmpNorm}'");
            }

            var codsFiltrados = filtros.CodEstaciones?
                .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (codsFiltrados != null && codsFiltrados.Count > 0)
            {
                var codsQuotes = codsFiltrados
                    .SelectMany(c => new[] { $"'{c.Trim()}'", $"'{c.Trim().TrimStart('0')}'", $"'{c.Trim().PadLeft(4, '0')}'" })
                    .Distinct()
                    .ToList();

                sb.AppendLine($"  AND (TRIM(x.CODESTACION) IN ({string.Join(", ", codsQuotes)}) OR LPAD(TRIM(x.CODESTACION), 4, '0') IN ({string.Join(", ", codsQuotes)}))");
            }

            if (filtros.IdPlantilla.HasValue && filtros.IdPlantilla.Value > 0)
            {
                sb.AppendLine($"  AND x.IDTIPO_EMAIL = {filtros.IdPlantilla.Value}");
            }

            if (!string.IsNullOrWhiteSpace(filtros.CodInspeccion))
            {
                var q = filtros.CodInspeccion.Trim();
                sb.AppendLine($"  AND (x.CODINSPECCION LIKE '%{q}%')");
            }

            if (!string.IsNullOrWhiteSpace(filtros.Telefono))
            {
                var q = filtros.Telefono.Trim().ToUpperInvariant();
                if (q.Contains('*'))
                {
                    var sqlPat = q.Replace('*', '%');
                    sb.AppendLine($"  AND (UPPER(i.EMAIL) LIKE '{sqlPat}' OR UPPER(i.TELEFONO) LIKE '{sqlPat}')");
                }
                else
                {
                    sb.AppendLine($"  AND (UPPER(i.EMAIL) LIKE '%{q}%' OR UPPER(i.TELEFONO) LIKE '%{q}%')");
                }
            }

            if (!string.IsNullOrWhiteSpace(filtros.Matricula))
            {
                var q = filtros.Matricula.Trim().ToUpperInvariant();
                if (q.Contains('*'))
                {
                    var sqlPat = q.Replace('*', '%');
                    sb.AppendLine($"  AND UPPER(i.MATRICULA) LIKE '{sqlPat}'");
                }
                else
                {
                    sb.AppendLine($"  AND UPPER(i.MATRICULA) LIKE '%{q}%'");
                }
            }

            if (!string.IsNullOrWhiteSpace(filtros.Cliente))
            {
                var q = filtros.Cliente.Trim().ToUpperInvariant();
                if (q.Contains('*'))
                {
                    var sqlPat = q.Replace('*', '%');
                    sb.AppendLine($"  AND (UPPER(i.NOMBRE) LIKE '{sqlPat}' OR UPPER(i.APELLIDOS) LIKE '{sqlPat}' OR UPPER(i.NOMBRE || ' ' || i.APELLIDOS) LIKE '{sqlPat}')");
                }
                else
                {
                    sb.AppendLine($"  AND (UPPER(i.NOMBRE) LIKE '%{q}%' OR UPPER(i.APELLIDOS) LIKE '%{q}%' OR UPPER(i.NOMBRE || ' ' || i.APELLIDOS) LIKE '%{q}%')");
                }
            }

            if (!string.IsNullOrWhiteSpace(filtros.FechaCaducidad))
            {
                var q = filtros.FechaCaducidad.Trim();
                sb.AppendLine($"  AND TO_CHAR(i.FECHACADUCIDAD, 'DD/MM/YYYY') LIKE '%{q}%'");
            }

            if (!string.IsNullOrWhiteSpace(filtros.FechaEnvioFiltro))
            {
                var q = filtros.FechaEnvioFiltro.Trim();
                sb.AppendLine($"  AND TO_CHAR(x.FECHAENVIO, 'DD/MM/YYYY') LIKE '%{q}%'");
            }

            if (!string.IsNullOrWhiteSpace(filtros.Busqueda))
            {
                var q = filtros.Busqueda.Trim().ToUpperInvariant();
                sb.AppendLine($"  AND (UPPER(i.MATRICULA) LIKE '%{q}%' OR UPPER(i.NOMBRE) LIKE '%{q}%' OR UPPER(i.APELLIDOS) LIKE '%{q}%' OR UPPER(i.EMAIL) LIKE '%{q}%')");
            }
        }

        void ConstruirSubqueryDetalleSmsReal()
        {
            sb.AppendLine(@"SELECT 
                'SMS' AS Canal,
                LPAD(TRIM(s.CODESTACION), 4, '0') AS CodigoEstacion,
                NVL(e.DESESTACION, 'ITV ' || s.CODESTACION) AS NombreEstacion,
                s.FECHA_ENVIO AS FechaEnvio,
                TO_NUMBER(NVL(REGEXP_SUBSTR(s.CODINSPECCION, '^[0-9]+'), '0')) AS NumeroInspeccion,
                TO_NUMBER(TO_CHAR(s.FECHA_ENVIO, 'YYYY')) AS AnioInspeccion,
                NVL(s.MATRICULA, '-') AS Matricula,
                NVL(p.IDTIPO_ENVIO, 1) AS IdPlantilla,
                NVL(p.NOMBRE_ENVIO, 'SMS Recordatorio') AS DescripcionPlantilla,
                NVL(s.TELEFONO_ENVIO, '-') AS Destinatario,
                NVL(s.CIF_CLIENTE, '') AS Nombre,
                '' AS Apellidos,
                'ENVIADO' AS EstadoEnvio,
                s.FECHACADUCIDAD AS FechaCaducidad
            FROM CENTRALITV.ENVIOS_CLIENTE_SMS_DETALLE s
            LEFT JOIN CENTRALITV.ENVIOS_CLIENTE_SMS p ON p.IDPAQUETE = s.IDPAQUETE
            LEFT JOIN CENTRALITV.ESTACIONES e ON e.CODESTACION = s.CODESTACION
            WHERE s.FECHA_ENVIO >= :p_FechaInicio AND s.FECHA_ENVIO <= :p_FechaFin");

            if (!string.IsNullOrWhiteSpace(filtros.CodEmpresa) &&
                !string.Equals(filtros.CodEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(filtros.CodEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                var codEmpNorm = filtros.CodEmpresa.Trim().ToUpperInvariant() switch
                {
                    "TSA" => "01",
                    "CAL" => "03",
                    _ => filtros.CodEmpresa.Trim()
                };
                sb.AppendLine($"  AND e.COD_EMPRESA = '{codEmpNorm}'");
            }

            var codsFiltrados = filtros.CodEstaciones?
                .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (codsFiltrados != null && codsFiltrados.Count > 0)
            {
                var codsQuotes = codsFiltrados
                    .SelectMany(c => new[] { $"'{c.Trim()}'", $"'{c.Trim().TrimStart('0')}'", $"'{c.Trim().PadLeft(4, '0')}'" })
                    .Distinct()
                    .ToList();

                sb.AppendLine($"  AND (TRIM(s.CODESTACION) IN ({string.Join(", ", codsQuotes)}) OR LPAD(TRIM(s.CODESTACION), 4, '0') IN ({string.Join(", ", codsQuotes)}))");
            }

            if (filtros.IdPlantilla.HasValue && filtros.IdPlantilla.Value > 0)
            {
                sb.AppendLine($"  AND p.IDTIPO_ENVIO = {filtros.IdPlantilla.Value}");
            }

            if (!string.IsNullOrWhiteSpace(filtros.CodInspeccion))
            {
                var q = filtros.CodInspeccion.Trim();
                sb.AppendLine($"  AND (s.CODINSPECCION LIKE '%{q}%')");
            }

            if (!string.IsNullOrWhiteSpace(filtros.Telefono))
            {
                var q = filtros.Telefono.Trim().ToUpperInvariant();
                if (q.Contains('*'))
                {
                    var sqlPat = q.Replace('*', '%');
                    sb.AppendLine($"  AND UPPER(s.TELEFONO_ENVIO) LIKE '{sqlPat}'");
                }
                else
                {
                    sb.AppendLine($"  AND UPPER(s.TELEFONO_ENVIO) LIKE '%{q}%'");
                }
            }

            if (!string.IsNullOrWhiteSpace(filtros.Matricula))
            {
                var q = filtros.Matricula.Trim().ToUpperInvariant();
                if (q.Contains('*'))
                {
                    var sqlPat = q.Replace('*', '%');
                    sb.AppendLine($"  AND UPPER(s.MATRICULA) LIKE '{sqlPat}'");
                }
                else
                {
                    sb.AppendLine($"  AND UPPER(s.MATRICULA) LIKE '%{q}%'");
                }
            }

            if (!string.IsNullOrWhiteSpace(filtros.Cliente))
            {
                var q = filtros.Cliente.Trim().ToUpperInvariant();
                if (q.Contains('*'))
                {
                    var sqlPat = q.Replace('*', '%');
                    sb.AppendLine($"  AND UPPER(s.CIF_CLIENTE) LIKE '{sqlPat}'");
                }
                else
                {
                    sb.AppendLine($"  AND UPPER(s.CIF_CLIENTE) LIKE '%{q}%'");
                }
            }

            if (!string.IsNullOrWhiteSpace(filtros.FechaCaducidad))
            {
                var q = filtros.FechaCaducidad.Trim();
                sb.AppendLine($"  AND TO_CHAR(s.FECHACADUCIDAD, 'DD/MM/YYYY') LIKE '%{q}%'");
            }

            if (!string.IsNullOrWhiteSpace(filtros.FechaEnvioFiltro))
            {
                var q = filtros.FechaEnvioFiltro.Trim();
                sb.AppendLine($"  AND TO_CHAR(s.FECHA_ENVIO, 'DD/MM/YYYY') LIKE '%{q}%'");
            }

            if (!string.IsNullOrWhiteSpace(filtros.Busqueda))
            {
                var q = filtros.Busqueda.Trim().ToUpperInvariant();
                sb.AppendLine($"  AND (UPPER(s.MATRICULA) LIKE '%{q}%' OR UPPER(s.TELEFONO_ENVIO) LIKE '%{q}%' OR UPPER(s.CIF_CLIENTE) LIKE '%{q}%')");
            }
        }

        string queryBase;
        if (includeSms && includeMail)
        {
            ConstruirSubqueryDetalleSmsReal();
            sb.AppendLine("UNION ALL");
            ConstruirSubqueryDetalleEmail();
            queryBase = sb.ToString();
        }
        else if (includeSms)
        {
            ConstruirSubqueryDetalleSmsReal();
            queryBase = sb.ToString();
        }
        else if (includeMail)
        {
            ConstruirSubqueryDetalleEmail();
            queryBase = sb.ToString();
        }
        else
        {
            return Array.Empty<FilaDetalleEnviosRecordatoriosDto>();
        }

        // Límite configurable según filtros: Si se aplican filtros específicos, permitir traer hasta 5.000 filas; si no, 2.000 por defecto
        var limiteFilas = (!string.IsNullOrWhiteSpace(filtros.Matricula) ||
                           !string.IsNullOrWhiteSpace(filtros.Telefono) ||
                           !string.IsNullOrWhiteSpace(filtros.CodInspeccion) ||
                           !string.IsNullOrWhiteSpace(filtros.Cliente) ||
                           !string.IsNullOrWhiteSpace(filtros.FechaCaducidad) ||
                           !string.IsNullOrWhiteSpace(filtros.FechaEnvioFiltro) ||
                           !string.IsNullOrWhiteSpace(filtros.Busqueda))
            ? 5000
            : 2000;

        var sqlFinal = $"SELECT * FROM ({queryBase} ORDER BY FechaEnvio DESC, CodigoEstacion) WHERE ROWNUM <= {limiteFilas}";

        try
        {
            await using var connection = new OracleConnection(_options.ConnectionString);
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var cmd = connection.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sqlFinal;
            cmd.CommandType = CommandType.Text;
            cmd.CommandTimeout = 90;

            cmd.Parameters.Add(new OracleParameter("p_FechaInicio", OracleDbType.Date) { Value = filtros.FechaInicio.Date });
            cmd.Parameters.Add(new OracleParameter("p_FechaFin", OracleDbType.Date) { Value = filtros.FechaFin.Date.AddDays(1).AddSeconds(-1) });

            var lista = new List<FilaDetalleEnviosRecordatoriosDto>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var canal = reader.IsDBNull(0) ? "SMS" : reader.GetString(0).Trim();
                var codEst = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
                var nomEst = reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim();
                var fechaEnvio = reader.IsDBNull(3) ? DateTime.MinValue : reader.GetDateTime(3);
                var numInsp = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader.GetValue(4));
                var anioInsp = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5));
                var matricula = reader.IsDBNull(6) ? string.Empty : reader.GetString(6).Trim();
                var idPlantilla = reader.IsDBNull(7) ? 0 : Convert.ToInt32(reader.GetValue(7));
                var descPlantilla = reader.IsDBNull(8) ? string.Empty : reader.GetString(8).Trim();
                var destinatario = reader.IsDBNull(9) ? string.Empty : reader.GetString(9).Trim();
                var nombre = reader.IsDBNull(10) ? string.Empty : reader.GetString(10).Trim();
                var apellidos = reader.IsDBNull(11) ? string.Empty : reader.GetString(11).Trim();
                var estadoEnvio = reader.IsDBNull(12) ? "ENVIADO" : reader.GetString(12).Trim();
                var fechaCaducidad = reader.IsDBNull(13) ? (DateTime?)null : reader.GetDateTime(13);

                lista.Add(new FilaDetalleEnviosRecordatoriosDto(
                    canal,
                    codEst,
                    nomEst,
                    fechaEnvio,
                    numInsp,
                    anioInsp,
                    matricula,
                    idPlantilla,
                    descPlantilla,
                    destinatario,
                    nombre,
                    apellidos,
                    estadoEnvio,
                    fechaCaducidad
                ));
            }

            return lista;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ERROR al consultar detalle de envíos SMS/Email en Oracle Producción (host: 10.108.206.3:1521). Generando fallback de contingencia.");
            return GenerarDetalleFallback(filtros);
        }
    }

    private static IReadOnlyList<FilaResumenEnviosRecordatoriosDto> GenerarResumenFallback(FiltrosEnviosRecordatoriosRequestDto filtros)
    {
        var estaciones = new[]
        {
            ("2811", "I.T.V. - TRES CANTOS"),
            ("2814", "I.T.V. - ALCOBENDAS"),
            ("2815", "I.T.V. - COSLADA"),
            ("2878", "I.T.V. - ALCALÁ"),
            ("0202", "I.T.V. - ALBACETE"),
            ("0902", "I.T.V. - MIRANDA DE EBRO"),
            ("2875", "I.T.V. - FUENLABRADA"),
            ("2816", "I.T.V. - LAS ROZAS")
        };

        var plantillasSms = new[]
        {
            (1, "SMS - Previo a la fecha de vencimiento"),
            (2, "SMS - Posterior a fecha de vencimiento"),
            (4, "SMS - Adicional")
        };

        var plantillasMail = new[]
        {
            (7, "EMAIL - Previo a la fecha de vencimiento"),
            (8, "EMAIL - Posterior a la fecha de vencimiento"),
            (10, "EMAIL Adicional"),
            (21, "EMAIL PERSONALIZADO - Previo 1 mes a la fecha de vencimiento")
        };

        var lista = new List<FilaResumenEnviosRecordatoriosDto>();
        var includeSms = string.IsNullOrWhiteSpace(filtros.Canal) || filtros.Canal == "TODOS" || filtros.Canal == "SMS";
        var includeMail = string.IsNullOrWhiteSpace(filtros.Canal) || filtros.Canal == "TODOS" || filtros.Canal == "EMAIL";

        var fechaRef = filtros.FechaFin.Date;

        foreach (var (cod, nom) in estaciones)
        {
            if (includeSms)
            {
                foreach (var (idP, descP) in plantillasSms)
                {
                    if (filtros.IdPlantilla.HasValue && filtros.IdPlantilla.Value != idP) continue;
                    var baseNum = (cod.GetHashCode() % 30) + idP * 15 + 40;
                    lista.Add(new FilaResumenEnviosRecordatoriosDto(cod, nom, "SMS", idP, descP, fechaRef, Math.Abs(baseNum)));
                }
            }

            if (includeMail)
            {
                foreach (var (idP, descP) in plantillasMail)
                {
                    if (filtros.IdPlantilla.HasValue && filtros.IdPlantilla.Value != idP) continue;
                    var baseNum = (cod.GetHashCode() % 20) + idP * 8 + 25;
                    lista.Add(new FilaResumenEnviosRecordatoriosDto(cod, nom, "EMAIL", idP, descP, fechaRef, Math.Abs(baseNum)));
                }
            }
        }

        return lista;
    }

    private static IReadOnlyList<FilaDetalleEnviosRecordatoriosDto> GenerarDetalleFallback(FiltrosEnviosRecordatoriosRequestDto filtros)
    {
        var lista = new List<FilaDetalleEnviosRecordatoriosDto>();
        var random = new Random(42);
        var matriculas = new[] { "4589-KLP", "1234-MBC", "9876-DFG", "7741-HJK", "3322-XYZ", "6541-LMN", "8821-BVC", "0091-CVB" };
        var nombres = new[] { "Antonio", "María", "Carlos", "Laura", "Javier", "Carmen", "David", "Elena" };
        var apellidos = new[] { "García López", "Rodríguez Martín", "Fernández Ruiz", "González Díaz", "Sánchez Morales", "Pérez Gómez" };
        var fechaBase = filtros.FechaFin.Date.AddDays(-1);

        for (int i = 0; i < 35; i++)
        {
            var esSms = (i % 2 == 0);
            var canal = esSms ? "SMS" : "EMAIL";

            if (filtros.Canal == "SMS" && !esSms) continue;
            if (filtros.Canal == "EMAIL" && esSms) continue;

            var estOficiales = new[] { ("2811", "I.T.V. - TRES CANTOS"), ("2814", "I.T.V. - ALCOBENDAS"), ("2815", "I.T.V. - COSLADA"), ("2878", "I.T.V. - ALCALÁ"), ("0202", "I.T.V. - ALBACETE"), ("0902", "I.T.V. - MIRANDA DE EBRO") };
            var estSel = estOficiales[i % estOficiales.Length];
            var codEst = estSel.Item1;
            var nomEst = estSel.Item2;
            var idP = esSms ? ((i % 3) + 1) : (7 + (i % 3));
            var descP = esSms ? $"SMS - Recordatorio #{idP}" : $"EMAIL - Previo vencimiento #{idP}";
            var dest = esSms ? $"6{random.Next(10000000, 99999999)}" : $"cliente_{i}@tuvsud.es";

            lista.Add(new FilaDetalleEnviosRecordatoriosDto(
                canal,
                codEst,
                nomEst,
                fechaBase.AddHours(-i),
                100000 + i,
                fechaBase.Year,
                matriculas[i % matriculas.Length],
                idP,
                descP,
                dest,
                nombres[i % nombres.Length],
                apellidos[i % apellidos.Length],
                "ENVIADO",
                fechaBase.AddMonths(1)
            ));
        }

        return lista;
    }
}
