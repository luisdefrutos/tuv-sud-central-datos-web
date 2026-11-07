using System.Collections.Concurrent;
using System.Data;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using Microsoft.Extensions.Logging;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    private static readonly ConcurrentDictionary<string, IReadOnlyList<CampoLocalizacionDto>> _cacheColumnasLocalizacion = new(StringComparer.OrdinalIgnoreCase);
    private static CatalogosComunesLocalizacionCache? _cacheCatalogosComunes;
    private static readonly SemaphoreSlim _catalogLock = new(1, 1);

    private sealed record CatalogosComunesLocalizacionCache(
        IReadOnlyList<OpcionComboLocalizacionDto> Provincias,
        IReadOnlyList<OpcionComboLocalizacionDto> Categorias,
        IReadOnlyList<OpcionComboLocalizacionDto> TiposMotor,
        IReadOnlyList<OpcionComboLocalizacionDto> Construcciones,
        IReadOnlyList<OpcionComboLocalizacionDto> Utilizaciones,
        IReadOnlyList<OpcionComboLocalizacionDto> SeccionesManual,
        IReadOnlyList<OpcionComboLocalizacionDto> BloquesGenerales,
        IReadOnlyList<OpcionComboLocalizacionDto> TiposVehiculoMiner
    );

    public static string NormalizarTipoLocalizacion(string? tipo)
    {
        var t = (tipo ?? "inspecciones").Trim().ToLowerInvariant();
        return t switch
        {
            "loc-defectos" or "defectos" => "defectos",
            "loc-elementos" or "elementos" => "elementos",
            "loc-mediciones" or "mediciones" => "mediciones",
            _ => "inspecciones"
        };
    }

    public async Task<CatalogosLocalizacionResponseDto> ObtenerCatalogosLocalizacionAsync(
        string tipo,
        CancellationToken cancellationToken = default)
    {
        var tipoNorm = NormalizarTipoLocalizacion(tipo);
        var columnas = await ObtenerColumnasMetadataAsync(tipoNorm, cancellationToken);
        var comunes = await ObtenerCatalogosComunesAsync(cancellationToken);

        return new CatalogosLocalizacionResponseDto(
            Tipo: tipoNorm,
            Columnas: columnas,
            Provincias: comunes.Provincias,
            Categorias: comunes.Categorias,
            TiposMotor: comunes.TiposMotor,
            Construcciones: comunes.Construcciones,
            Utilizaciones: comunes.Utilizaciones,
            SeccionesManual: comunes.SeccionesManual,
            Bloques: comunes.BloquesGenerales,
            TiposVehiculoMiner: comunes.TiposVehiculoMiner
        );
    }

    private async Task<IReadOnlyList<CampoLocalizacionDto>> ObtenerColumnasMetadataAsync(
        string tipoNorm,
        CancellationToken cancellationToken)
    {
        if (_cacheColumnasLocalizacion.TryGetValue(tipoNorm, out var cached) && cached.Count > 0)
        {
            return cached;
        }

        string sql = tipoNorm switch
        {
            "defectos" => @"
                SELECT IdCampo, NVL(DesCampo, Columna_Excel) AS DesCampo, Campo_SQL, Columna_Excel, NVL(Columna_Excel_TipoDato, 'C') AS TipoDato, NVL(Por_Defecto, 0) AS PorDefecto, 'DEFECTOS' AS CategoriaCampo
                FROM CENTRALITV.CAMPOS_DEFECTOSLOCALIZADOS
                WHERE Activo = -1
                ORDER BY IdCampo",
            "elementos" => @"
                SELECT IdCampo, NVL(DesCampo, Columna_Excel) AS DesCampo, Campo_SQL, Columna_Excel, NVL(Columna_Excel_TipoDato, 'C') AS TipoDato,
                       CASE WHEN NVL(Por_Defecto, 0) = -1 AND NVL(Activo_Gerencia, 0) = -1 THEN -1 ELSE 0 END AS PorDefecto,
                       'ELEMENTOS' AS CategoriaCampo
                FROM CENTRALITV.CAMPOS_ELEMENTOSLOCALIZADOS
                WHERE NVL(Activo_Central, 0) = -1
                   OR (NVL(Activo_Gerencia, 0) = -1 AND NVL(Por_Defecto, 0) = -1)
                ORDER BY IdCampo",
            "mediciones" => @"
                SELECT IdCampo, NVL(DesCampo, Columna_Excel) AS DesCampo, Campo_SQL, Columna_Excel, NVL(Columna_Excel_TipoDato, 'C') AS TipoDato, NVL(Por_Defecto, 0) AS PorDefecto, NVL(Categoria_Campo, 'MEDICIONES') AS CategoriaCampo
                FROM CENTRALITV.CAMPOS_MEDICIONESLOCALIZADAS
                WHERE Activo_Central = -1
                ORDER BY CASE WHEN Categoria_Campo = 'INSPECCION' THEN 0 ELSE 1 END, Categoria_Campo,
                         CASE WHEN Categoria_Campo = 'INSPECCION' THEN TO_CHAR(IdCampo, '00000') ELSE DesCampo END",
            _ => @"
                SELECT IdCampo, NVL(DesCampo, Columna_Excel) AS DesCampo, Campo_SQL, Columna_Excel, NVL(Columna_Excel_TipoDato, 'C') AS TipoDato, NVL(Por_Defecto, 0) AS PorDefecto, 'INSPECCION' AS CategoriaCampo
                FROM CENTRALITV.CAMPOS_INSPECCIONESLOCALIZADAS
                WHERE Activo = -1
                ORDER BY IdCampo"
        };

        var lista = new List<CampoLocalizacionDto>();
        await using var connection = new OracleConnection(_options.ConnectionString);
        await connection.OpenAsync(CancellationToken.None);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandTimeout = 45;

        await using var reader = await cmd.ExecuteReaderAsync(CancellationToken.None);
        while (await reader.ReadAsync(CancellationToken.None))
        {
            var idCampo = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0));
            var desCampo = reader.IsDBNull(1) ? string.Empty : Convert.ToString(reader.GetValue(1))?.Trim() ?? string.Empty;
            var campoSql = reader.IsDBNull(2) ? string.Empty : Convert.ToString(reader.GetValue(2))?.Trim() ?? string.Empty;
            var colExcel = reader.IsDBNull(3) ? string.Empty : Convert.ToString(reader.GetValue(3))?.Trim() ?? string.Empty;
            var tipoDato = reader.IsDBNull(4) ? "C" : Convert.ToString(reader.GetValue(4))?.Trim() ?? "C";
            var porDefectoVal = reader.IsDBNull(5) ? 0 : Convert.ToInt32(reader.GetValue(5));
            var catCampo = reader.IsDBNull(6) ? "GENERAL" : Convert.ToString(reader.GetValue(6))?.Trim() ?? "GENERAL";

            if (!string.IsNullOrWhiteSpace(campoSql) && !string.IsNullOrWhiteSpace(colExcel))
            {
                lista.Add(new CampoLocalizacionDto(
                    IdCampo: idCampo,
                    DesCampo: string.IsNullOrWhiteSpace(desCampo) ? colExcel : desCampo,
                    ColumnaExcel: colExcel,
                    TipoDato: tipoDato,
                    PorDefecto: porDefectoVal == -1 || porDefectoVal == 1,
                    CategoriaCampo: catCampo,
                    CampoSql: campoSql
                ));
            }
        }

        if (lista.Count > 0)
        {
            _cacheColumnasLocalizacion[tipoNorm] = lista;
        }

        return lista;
    }

    private async Task<CatalogosComunesLocalizacionCache> ObtenerCatalogosComunesAsync(CancellationToken cancellationToken)
    {
        if (_cacheCatalogosComunes != null)
        {
            return _cacheCatalogosComunes;
        }

        await _catalogLock.WaitAsync(CancellationToken.None);
        try
        {
            if (_cacheCatalogosComunes != null)
            {
                return _cacheCatalogosComunes;
            }

            await using var connection = new OracleConnection(_options.ConnectionString);
            await connection.OpenAsync(CancellationToken.None);

            async Task<List<OpcionComboLocalizacionDto>> LeerOpcionesAsync(string query, bool unaColumna = false)
            {
                var items = new List<OpcionComboLocalizacionDto>();
                await using var cmd = connection.CreateCommand();
                cmd.CommandText = query;
                cmd.CommandTimeout = 30;
                await using var rdr = await cmd.ExecuteReaderAsync(CancellationToken.None);
                while (await rdr.ReadAsync(CancellationToken.None))
                {
                    var cod = rdr.IsDBNull(0) ? string.Empty : Convert.ToString(rdr.GetValue(0))?.Trim() ?? string.Empty;
                    var desc = unaColumna
                        ? cod
                        : (rdr.IsDBNull(1) ? cod : Convert.ToString(rdr.GetValue(1))?.Trim() ?? cod);
                    if (!string.IsNullOrWhiteSpace(cod))
                    {
                        items.Add(new OpcionComboLocalizacionDto(cod, desc));
                    }
                }
                return items;
            }

            var provincias = await LeerOpcionesAsync("SELECT CODPROVINCIA, DESCRIPCION FROM CENTRALITV.PROVINCIA ORDER BY DESCRIPCION");
            var categorias = await LeerOpcionesAsync("SELECT CODCATEGORIA, DESCATEGORIA FROM CENTRALITV.CATEGORIAS ORDER BY CODCATEGORIA");
            var tiposMotor = await LeerOpcionesAsync("SELECT CODMOTOR, DESMOTOR FROM CENTRALITV.TIPOSMOTOR ORDER BY CODMOTOR");
            var construcciones = await LeerOpcionesAsync("SELECT CODCONSTRUCCION FROM CENTRALITV.CONSTRUCCION ORDER BY CODCONSTRUCCION", true);
            var utilizaciones = await LeerOpcionesAsync("SELECT CODUTILIZACION FROM CENTRALITV.UTILIZACION ORDER BY CODUTILIZACION", true);
            var secciones = await LeerOpcionesAsync("SELECT DISTINCT CODSECCION FROM CENTRALITV.DEFECTOSSUB_SECCION WHERE CODIDIOMA = 'ESP' ORDER BY CODSECCION", true);
            var bloques = await LeerOpcionesAsync(@"
                SELECT DISTINCT DEF_BLOQ.BLOQUE, DEF_BLOQ.DESCRIPCION
                FROM CENTRALITV.DEFECTOSBLOQUES DEF_BLOQ
                WHERE DEF_BLOQ.BLOQUE > '10' AND DEF_BLOQ.CODIDIOMA = 'ESP'
                ORDER BY DEF_BLOQ.BLOQUE");
            var tiposMiner = await LeerOpcionesAsync("SELECT ID_CONST, DESCRIPCION FROM CENTRALITV.TIPOS_CLASIFICACION_MINER ORDER BY ORDEN");

            _cacheCatalogosComunes = new CatalogosComunesLocalizacionCache(
                Provincias: provincias,
                Categorias: categorias,
                TiposMotor: tiposMotor,
                Construcciones: construcciones,
                Utilizaciones: utilizaciones,
                SeccionesManual: secciones,
                BloquesGenerales: bloques,
                TiposVehiculoMiner: tiposMiner
            );

            return _cacheCatalogosComunes;
        }
        finally
        {
            _catalogLock.Release();
        }
    }

    public async Task<IReadOnlyList<OpcionComboLocalizacionDto>> ObtenerBloquesLocalizacionAsync(
        string? seccionManual,
        CancellationToken cancellationToken = default)
    {
        await using var connection = new OracleConnection(_options.ConnectionString);
        await connection.OpenAsync(CancellationToken.None);

        await using var cmd = connection.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandTimeout = 30;

        if (!string.IsNullOrWhiteSpace(seccionManual))
        {
            cmd.CommandText = @"
                SELECT DISTINCT DEF_BLOQ.BLOQUE, DEF_BLOQ.DESCRIPCION
                FROM CENTRALITV.DEFECTOSSUB_SECCION DEF_SUB
                INNER JOIN CENTRALITV.DEFECTOSBLOQUES DEF_BLOQ ON DEF_SUB.BLOQUE = DEF_BLOQ.BLOQUE
                WHERE DEF_BLOQ.BLOQUE > '10'
                  AND DEF_BLOQ.CODIDIOMA = 'ESP'
                  AND DEF_SUB.CODSECCION = :p_Seccion
                ORDER BY DEF_BLOQ.BLOQUE";
            cmd.Parameters.Add(new OracleParameter("p_Seccion", OracleDbType.Varchar2) { Value = seccionManual.Trim() });
        }
        else
        {
            cmd.CommandText = @"
                SELECT DISTINCT DEF_BLOQ.BLOQUE, DEF_BLOQ.DESCRIPCION
                FROM CENTRALITV.DEFECTOSBLOQUES DEF_BLOQ
                WHERE DEF_BLOQ.BLOQUE > '10'
                  AND DEF_BLOQ.CODIDIOMA = 'ESP'
                ORDER BY DEF_BLOQ.BLOQUE";
        }

        var lista = new List<OpcionComboLocalizacionDto>();
        await using var reader = await cmd.ExecuteReaderAsync(CancellationToken.None);
        while (await reader.ReadAsync(CancellationToken.None))
        {
            var cod = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim();
            var desc = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
            if (!string.IsNullOrWhiteSpace(cod))
            {
                lista.Add(new OpcionComboLocalizacionDto(cod, desc));
            }
        }
        return lista;
    }

    public async Task<IReadOnlyList<OpcionComboLocalizacionDto>> ObtenerElementosLocalizacionAsync(
        string bloque,
        string? seccionManual = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(bloque))
        {
            return Array.Empty<OpcionComboLocalizacionDto>();
        }

        await using var connection = new OracleConnection(_options.ConnectionString);
        await connection.OpenAsync(CancellationToken.None);

        await using var cmd = connection.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandTimeout = 30;

        if (!string.IsNullOrWhiteSpace(seccionManual))
        {
            cmd.CommandText = @"
                SELECT DISTINCT DEF.DEFECTO, DEF.DESCRIPCION
                FROM CENTRALITV.DEFECTOSSUB_SECCION DEF_SUB
                INNER JOIN CENTRALITV.DEFECTOS DEF ON DEF_SUB.BLOQUE = DEF.BLOQUE AND DEF_SUB.DEFECTO = DEF.DEFECTO
                WHERE DEF.BLOQUE = :p_Bloque
                  AND DEF.CODIDIOMA = 'ESP'
                  AND DEF_SUB.CODSECCION = :p_Seccion
                ORDER BY DEF.DEFECTO";
            cmd.Parameters.Add(new OracleParameter("p_Bloque", OracleDbType.Varchar2) { Value = bloque.Trim() });
            cmd.Parameters.Add(new OracleParameter("p_Seccion", OracleDbType.Varchar2) { Value = seccionManual.Trim() });
        }
        else
        {
            cmd.CommandText = @"
                SELECT DISTINCT DEF.DEFECTO, DEF.DESCRIPCION
                FROM CENTRALITV.DEFECTOSBLOQUES DEF_BLOQ
                INNER JOIN CENTRALITV.DEFECTOS DEF ON DEF_BLOQ.BLOQUE = DEF.BLOQUE
                WHERE DEF.BLOQUE = :p_Bloque
                  AND DEF.CODIDIOMA = 'ESP'
                ORDER BY DEF.DEFECTO";
            cmd.Parameters.Add(new OracleParameter("p_Bloque", OracleDbType.Varchar2) { Value = bloque.Trim() });
        }

        var lista = new List<OpcionComboLocalizacionDto>();
        await using var reader = await cmd.ExecuteReaderAsync(CancellationToken.None);
        while (await reader.ReadAsync(CancellationToken.None))
        {
            var cod = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim();
            var desc = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
            if (!string.IsNullOrWhiteSpace(cod))
            {
                lista.Add(new OpcionComboLocalizacionDto(cod, desc));
            }
        }
        return lista;
    }

    public async Task<IReadOnlyList<SubdefectoLocalizacionDto>> ObtenerSubdefectosLocalizacionAsync(
        string bloque,
        string defecto,
        string? seccionManual = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(bloque) || string.IsNullOrWhiteSpace(defecto))
        {
            return Array.Empty<SubdefectoLocalizacionDto>();
        }

        await using var connection = new OracleConnection(_options.ConnectionString);
        await connection.OpenAsync(CancellationToken.None);

        await using var cmd = connection.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandTimeout = 30;

        var sb = new StringBuilder(@"
            SELECT DISTINCT BLOQUE, DEFECTO, SUBDEFECTO, NUMERO, DESCRIPCION
            FROM CENTRALITV.DEFECTOSSUB_SECCION
            WHERE BLOQUE = :p_Bloque
              AND DEFECTO = :p_Defecto
              AND CODIDIOMA = 'ESP'");

        cmd.Parameters.Add(new OracleParameter("p_Bloque", OracleDbType.Varchar2) { Value = bloque.Trim() });
        cmd.Parameters.Add(new OracleParameter("p_Defecto", OracleDbType.Varchar2) { Value = defecto.Trim() });

        if (!string.IsNullOrWhiteSpace(seccionManual))
        {
            sb.Append(" AND CODSECCION = :p_Seccion");
            cmd.Parameters.Add(new OracleParameter("p_Seccion", OracleDbType.Varchar2) { Value = seccionManual.Trim() });
        }

        sb.Append(" ORDER BY BLOQUE, DEFECTO, SUBDEFECTO, NUMERO");
        cmd.CommandText = sb.ToString();

        var lista = new List<SubdefectoLocalizacionDto>();
        await using var reader = await cmd.ExecuteReaderAsync(CancellationToken.None);
        while (await reader.ReadAsync(CancellationToken.None))
        {
            lista.Add(new SubdefectoLocalizacionDto(
                Bloque: reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                Defecto: reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                Subdefecto: reader.IsDBNull(2) ? string.Empty : reader.GetString(2).Trim(),
                Numero: reader.IsDBNull(3) ? string.Empty : Convert.ToString(reader.GetValue(3))?.Trim() ?? string.Empty,
                Descripcion: reader.IsDBNull(4) ? string.Empty : reader.GetString(4).Trim()
            ));
        }

        return lista;
    }

    public async Task<ResultadoEjecucionLocalizacionRaw> EjecutarConsultaLocalizacionAsync(
        FiltrosLocalizacionRequestDto filtros,
        int maxFilasRetorno,
        CancellationToken cancellationToken = default,
        Func<IReadOnlyList<ColumnaResultadoLocalizacionDto>, IReadOnlyList<string>, CancellationToken, Task>? onMetadata = null,
        Func<IReadOnlyList<object?>, CancellationToken, Task>? onRow = null)
    {
        var tipoNorm = NormalizarTipoLocalizacion(filtros.Tipo);
        var catalogoColumnas = await ObtenerColumnasMetadataAsync(tipoNorm, cancellationToken);

        // 1. Determinar columnas activas (validadas estrictamente contra catálogo para evitar SQL Injection)
        List<CampoLocalizacionDto> columnasSeleccionadas;
        if (filtros.IdsCamposSeleccionados != null && filtros.IdsCamposSeleccionados.Count > 0)
        {
            var setIds = filtros.IdsCamposSeleccionados.ToHashSet();
            columnasSeleccionadas = catalogoColumnas.Where(c => setIds.Contains(c.IdCampo)).ToList();
        }
        else
        {
            columnasSeleccionadas = catalogoColumnas.Where(c => c.PorDefecto).ToList();
        }

        if (columnasSeleccionadas.Count == 0 && catalogoColumnas.Count > 0)
        {
            columnasSeleccionadas = catalogoColumnas.Take(10).ToList();
        }

        // 2. Construir cláusula WHERE parametrizada y lista de Filtros Aplicados (fiel al legacy)
        var parametros = new List<OracleParameter>();
        var whereSb = new StringBuilder();
        var filtrosAplicados = new List<string>();
        int paramSeq = 0;

        string NextParam(string prefix, object val, OracleDbType dbType = OracleDbType.Varchar2)
        {
            var pName = $"p_{prefix}_{++paramSeq}";
            parametros.Add(new OracleParameter(pName, dbType) { Value = val });
            return $":{pName}";
        }

        string BuildStringCondition(string sqlColumn, string rawValue, bool notCondition = false)
        {
            var v = rawValue.Trim();
            string expr;
            if (v.StartsWith('*') || v.EndsWith('*'))
            {
                if (v.Length < 2)
                {
                    expr = $"{sqlColumn} LIKE '%'";
                }
                else
                {
                    var likeVal = v.Replace('*', '%');
                    var p = NextParam("lk", likeVal);
                    expr = $"{sqlColumn} LIKE {p}";
                }
            }
            else
            {
                var p = NextParam("eq", v);
                expr = $"{sqlColumn} = {p}";
            }

            return notCondition ? $"NOT ({expr})" : expr;
        }

        // El localizador legacy de Elementos compara la fecha final con TO_DATE(fecha), es decir, a medianoche.
        var fIni = filtros.FechaInicio.Date;
        var fFin = tipoNorm == "elementos"
            ? filtros.FechaFin.Date
            : filtros.FechaFin.Date.AddDays(1).AddSeconds(-1);
        var pFIni = NextParam("fIni", fIni, OracleDbType.Date);
        var pFFin = NextParam("fFin", fFin, OracleDbType.Date);

        whereSb.Append($" AND CENTRALITV.INSPECCION.FECHAINSPECCION >= {pFIni}");
        filtrosAplicados.Add($"FECHA INSP. INICIAL: {fIni:dd/MM/yyyy}");

        whereSb.Append($" AND CENTRALITV.INSPECCION.FECHAINSPECCION <= {pFFin}");
        filtrosAplicados.Add($"FECHA INSP. FINAL: {fFin:dd/MM/yyyy}");

        // En Mediciones, el filtro de Tipo Vehículo MINER va antes de Estaciones en la lista de filtros aplicados
        if (tipoNorm == "mediciones")
        {
            var tiposMiner = filtros.TiposVehiculoMiner?
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Select(t => t.Trim())
                .Distinct()
                .ToList();

            if (tiposMiner != null && tiposMiner.Count > 0)
            {
                var pNames = tiposMiner.Select(t => NextParam("miner", t)).ToList();
                whereSb.Append($" AND CENTRALITV.CLASIFICACION_MINER(CENTRALITV.INSPECCION.CodConstruccion, CENTRALITV.INSPECCION.CodUtilizacion) IN ({string.Join(", ", pNames)})");
                filtrosAplicados.Add($"TIPO VEHÍCULO: {string.Join(", ", tiposMiner)}");
            }
            else
            {
                filtrosAplicados.Add("TIPO VEHÍCULO: Todos");
            }
        }

        // Sociedad opcional
        if (!string.IsNullOrWhiteSpace(filtros.Sociedad) &&
            !string.Equals(filtros.Sociedad, "TODAS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(filtros.Sociedad, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            var codEmp = filtros.Sociedad.Trim().ToUpperInvariant() switch
            {
                "TSA" or "01" => "01",
                "CAL" or "03" => "03",
                _ => filtros.Sociedad.Trim()
            };
            var pEmp = NextParam("emp", codEmp);
            whereSb.Append($" AND CENTRALITV.INSPECCION.CODESTACION IN (SELECT CodEstacion FROM CENTRALITV.ESTACIONES WHERE Cod_Empresa = {pEmp})");
        }

        // Estaciones
        var estacionesLimpias = filtros.CodEstaciones?
            .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Trim().PadLeft(4, '0'))
            .Distinct()
            .ToList();

        if (estacionesLimpias != null && estacionesLimpias.Count > 0)
        {
            var codsVariantes = estacionesLimpias
                .SelectMany(c => new[] { c, c.TrimStart('0') })
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct()
                .ToList();
            var pEstNames = codsVariantes.Select(c => NextParam("est", c)).ToList();
            whereSb.Append($" AND CENTRALITV.INSPECCION.CodEstacion IN ({string.Join(", ", pEstNames)})");
            filtrosAplicados.Add($"ESTACIONES: {string.Join(", ", estacionesLimpias)}");
        }
        else
        {
            filtrosAplicados.Add("ESTACIONES: Todos");
        }

        // Fechas de Caducidad / Vencimiento (específico de Inspecciones)
        if (tipoNorm == "inspecciones")
        {
            bool hayFiltroVencimiento = false;
            if (filtros.FechaVencInicio.HasValue)
            {
                var fvIni = filtros.FechaVencInicio.Value.Date;
                var pFvIni = NextParam("fvIni", fvIni, OracleDbType.Date);
                whereSb.Append($" AND CENTRALITV.PERIODICA(CENTRALITV.INSPECCION.CODSEPIVA, CENTRALITV.INSPECCION.CODESTACION) = 'S' AND CENTRALITV.INSPECCION.FECHACADUCIDAD >= {pFvIni}");
                filtrosAplicados.Add($"FECHA VENC. INICIAL: {fvIni:dd/MM/yyyy}");
                hayFiltroVencimiento = true;
            }
            if (filtros.FechaVencFin.HasValue)
            {
                var fvFin = filtros.FechaVencFin.Value.Date.AddDays(1).AddSeconds(-1);
                var pFvFin = NextParam("fvFin", fvFin, OracleDbType.Date);
                whereSb.Append($" AND CENTRALITV.PERIODICA(CENTRALITV.INSPECCION.CODSEPIVA, CENTRALITV.INSPECCION.CODESTACION) = 'S' AND CENTRALITV.INSPECCION.FECHACADUCIDAD <= {pFvFin}");
                filtrosAplicados.Add($"FECHA VENC. FINAL: {fvFin:dd/MM/yyyy}");
                hayFiltroVencimiento = true;
            }

            if (hayFiltroVencimiento && filtros.ExcluirInspeccionadosPost)
            {
                whereSb.Append(@"
                    AND NOT EXISTS (
                        SELECT 1 FROM CENTRALITV.INSPECCION ITMP
                        WHERE ITMP.MATRICULA = CENTRALITV.INSPECCION.MATRICULA
                          AND ITMP.FECHAINSPECCION > CENTRALITV.INSPECCION.FECHAINSPECCION
                          AND ITMP.ANULADA = 0
                          AND CENTRALITV.PERIODICA(ITMP.CODSEPIVA, ITMP.CODESTACION) = 'S'
                    )");
                filtrosAplicados.Add("Excluidos vehículos inspeccionados posteriormente");
            }
        }

        // Fase (1ª / 2ª Inspección)
        if (!string.IsNullOrWhiteSpace(filtros.Fase) &&
            !string.Equals(filtros.Fase, "TODAS", StringComparison.OrdinalIgnoreCase) &&
            (filtros.Fase.Trim() == "1" || filtros.Fase.Trim() == "2"))
        {
            var pFase = NextParam("fase", filtros.Fase.Trim());
            whereSb.Append($" AND CENTRALITV.INSPECCION.INDICA12 = {pFase}");
            filtrosAplicados.Add($"FASE: {filtros.Fase.Trim()}ª Inspección");
        }

        // Matrícula
        if (!string.IsNullOrWhiteSpace(filtros.Matricula))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.MATRICULA", filtros.Matricula.ToUpperInvariant())}");
            filtrosAplicados.Add($"MATRÍCULA: {filtros.Matricula.Trim().ToUpperInvariant()}");
        }

        // Marca
        if (!string.IsNullOrWhiteSpace(filtros.Marca))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.MARCA", filtros.Marca.ToUpperInvariant())}");
            filtrosAplicados.Add($"MARCA: {filtros.Marca.Trim().ToUpperInvariant()}");
        }

        // Contraseña de Homologación
        if (!string.IsNullOrWhiteSpace(filtros.Homologacion))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.CHOMOLOGACION", filtros.Homologacion, filtros.HomologacionDistinto)}");
            var prefNot = filtros.HomologacionDistinto ? " NOT " : "";
            filtrosAplicados.Add($"HOMOLOGACIÓN: {prefNot}{filtros.Homologacion.Trim()}");
        }

        // Tipo Motor
        if (!string.IsNullOrWhiteSpace(filtros.TipoMotor))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.TIPOMOTOR", filtros.TipoMotor)}");
            filtrosAplicados.Add($"TIPO MOTOR: {filtros.TipoMotor.Trim()}");
        }

        // Bastidor
        if (!string.IsNullOrWhiteSpace(filtros.Bastidor))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.NUMBASTIDOR", filtros.Bastidor.ToUpperInvariant())}");
            filtrosAplicados.Add($"BASTIDOR: {filtros.Bastidor.Trim().ToUpperInvariant()}");
        }

        // Categoría
        if (!string.IsNullOrWhiteSpace(filtros.Categoria))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.CODCATEGORIA", filtros.Categoria, filtros.CategoriaDistinto)}");
            var prefNot = filtros.CategoriaDistinto ? " NOT " : "";
            filtrosAplicados.Add($"CATEGORÍA: {prefNot}{filtros.Categoria.Trim()}");
        }

        // Construcción
        if (!string.IsNullOrWhiteSpace(filtros.Construccion))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.CODCONSTRUCCION", filtros.Construccion)}");
            filtrosAplicados.Add($"CONSTRUCCIÓN: {filtros.Construccion.Trim()}");
        }

        // Utilización
        if (!string.IsNullOrWhiteSpace(filtros.Utilizacion))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.CODUTILIZACION", filtros.Utilizacion)}");
            filtrosAplicados.Add($"UTILIZACIÓN: {filtros.Utilizacion.Trim()}");
        }

        // CIF Cliente Titular
        if (!string.IsNullOrWhiteSpace(filtros.CifTitular))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.CIFFACTURA", filtros.CifTitular.ToUpperInvariant())}");
            filtrosAplicados.Add($"CIF TITULAR: {filtros.CifTitular.Trim().ToUpperInvariant()}");
        }

        // Filtros de titular y cliente de facturación comunes a las localizaciones
        if (!string.IsNullOrWhiteSpace(filtros.CifFactura))
        {
            var c1 = BuildStringCondition("CENTRALITV.INSPECCION.CIFFACTURA", filtros.CifFactura.ToUpperInvariant());
            var c2 = BuildStringCondition("CENTRALITV.CLIENTES.CIF_Cliente", filtros.CifFactura.ToUpperInvariant());
            whereSb.Append($" AND CENTRALITV.INSPECCION.Desea_Factura_Inmediata = -1 AND ((CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NULL AND {c1}) OR (CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NOT NULL AND {c2}))");
            filtrosAplicados.Add($"CIF FACTURA: {filtros.CifFactura.Trim().ToUpperInvariant()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.ApellidosTitular))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.APELLIDOS", filtros.ApellidosTitular.ToUpperInvariant())}");
            filtrosAplicados.Add($"APELLIDOS: {filtros.ApellidosTitular.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.RazonSocialFactura))
        {
            var c1 = BuildStringCondition("CENTRALITV.INSPECCION.APELLIDOS", filtros.RazonSocialFactura.ToUpperInvariant());
            var c2 = BuildStringCondition("CENTRALITV.CLIENTES.APELLIDO1 || ' ' || CENTRALITV.CLIENTES.APELLIDO2", filtros.RazonSocialFactura.ToUpperInvariant());
            var c3 = BuildStringCondition("CENTRALITV.CLIENTES.RAZON_SOCIAL", filtros.RazonSocialFactura.ToUpperInvariant());
            whereSb.Append($" AND CENTRALITV.INSPECCION.Desea_Factura_Inmediata = -1 AND ((CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NULL AND {c1}) OR (CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NOT NULL AND ({c2} OR {c3})))");
            filtrosAplicados.Add($"RAZÓN SOCIAL FACTURA: {filtros.RazonSocialFactura.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.CpTitular))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.DP", filtros.CpTitular)}");
            filtrosAplicados.Add($"CP TITULAR: {filtros.CpTitular.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.CpFactura))
        {
            var c1 = BuildStringCondition("CENTRALITV.INSPECCION.DP", filtros.CpFactura);
            var c2 = BuildStringCondition("CENTRALITV.CLIENTES.CP", filtros.CpFactura);
            whereSb.Append($" AND CENTRALITV.INSPECCION.Desea_Factura_Inmediata = -1 AND ((CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NULL AND {c1}) OR (CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NOT NULL AND {c2}))");
            filtrosAplicados.Add($"CP FACTURA: {filtros.CpFactura.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.EmailTitular))
        {
            whereSb.Append($" AND {BuildStringCondition("UPPER(CENTRALITV.INSPECCION.EMail)", filtros.EmailTitular.ToUpperInvariant())}");
            filtrosAplicados.Add($"Email Titular: {filtros.EmailTitular.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.EmailFactura))
        {
            var c1 = BuildStringCondition("UPPER(CENTRALITV.INSPECCION.EMail)", filtros.EmailFactura.ToUpperInvariant());
            var c2 = BuildStringCondition("UPPER(CENTRALITV.CLIENTES.Email)", filtros.EmailFactura.ToUpperInvariant());
            whereSb.Append($" AND CENTRALITV.INSPECCION.Desea_Factura_Inmediata = -1 AND ((CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NULL AND {c1}) OR (CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NOT NULL AND {c2}))");
            filtrosAplicados.Add($"Email Factura: {filtros.EmailFactura.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.ProvinciaTitular))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.PROVINCIA", filtros.ProvinciaTitular)}");
            filtrosAplicados.Add($"PROVINCIA TITULAR: {filtros.ProvinciaTitular.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.ProvinciaFactura))
        {
            var c1 = BuildStringCondition("CENTRALITV.INSPECCION.PROVINCIA", filtros.ProvinciaFactura);
            var c2 = BuildStringCondition("CENTRALITV.CLIENTES.PROVINCIA", filtros.ProvinciaFactura);
            whereSb.Append($" AND CENTRALITV.INSPECCION.Desea_Factura_Inmediata = -1 AND ((CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NULL AND {c1}) OR (CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NOT NULL AND {c2}))");
            filtrosAplicados.Add($"PROVINCIA FACTURA: {filtros.ProvinciaFactura.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.TelefonoTitular))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.Telefono", filtros.TelefonoTitular)}");
            filtrosAplicados.Add($"Teléfono Titular: {filtros.TelefonoTitular.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.TelefonoTitular2))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.Telefono2", filtros.TelefonoTitular2)}");
            filtrosAplicados.Add($"Teléfono Titular 2: {filtros.TelefonoTitular2.Trim()}");
        }

        if (!string.IsNullOrWhiteSpace(filtros.TelefonoFactura))
        {
            var c1 = BuildStringCondition("CENTRALITV.INSPECCION.Telefono", filtros.TelefonoFactura);
            var c2 = BuildStringCondition("CENTRALITV.INSPECCION.Telefono2", filtros.TelefonoFactura);
            var c3 = BuildStringCondition("CENTRALITV.CLIENTES.Telefono1", filtros.TelefonoFactura);
            var c4 = BuildStringCondition("CENTRALITV.CLIENTES.Telefono2", filtros.TelefonoFactura);
            whereSb.Append($" AND CENTRALITV.INSPECCION.Desea_Factura_Inmediata = -1 AND ((CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NULL AND ({c1} OR {c2})) OR (CENTRALITV.INSPECCION.Id_Cliente_Facturacion IS NOT NULL AND ({c3} OR {c4})))");
            filtrosAplicados.Add($"Teléfono Factura: {filtros.TelefonoFactura.Trim()}");
        }

        // Filtros específicos de Defectos, Elementos y Mediciones
        if ((tipoNorm == "defectos" || tipoNorm == "mediciones") && !string.IsNullOrWhiteSpace(filtros.SeccionManual))
        {
            whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION.CODSECCION", filtros.SeccionManual)}");
            filtrosAplicados.Add($"CODIGO SECCION: {filtros.SeccionManual.Trim()}");
        }

        if (tipoNorm == "defectos")
        {
            if (!string.IsNullOrWhiteSpace(filtros.Bloque))
            {
                whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION_DEFECTOS.BLOQUE", filtros.Bloque)}");
                filtrosAplicados.Add($"BLOQUE: {filtros.Bloque.Trim()}'");
            }
            if (!string.IsNullOrWhiteSpace(filtros.Defecto))
            {
                whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION_DEFECTOS.DEFECTO", filtros.Defecto)}");
                filtrosAplicados.Add($"ELEMENTO: {filtros.Defecto.Trim()}'");
            }
            if (!string.IsNullOrWhiteSpace(filtros.Subdefecto))
            {
                whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION_DEFECTOS.SUBDEFECTO", filtros.Subdefecto)}");
                filtrosAplicados.Add($"SUBDEFECTO: {filtros.Subdefecto.Trim()}'");
            }
            if (!string.IsNullOrWhiteSpace(filtros.NumeroDefecto))
            {
                whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION_DEFECTOS.NUMERO", filtros.NumeroDefecto)}");
                filtrosAplicados.Add($"NUMERO: {filtros.NumeroDefecto.Trim()}'");
            }
        }
        else if (tipoNorm == "elementos")
        {
            if (!string.IsNullOrWhiteSpace(filtros.Bloque))
            {
                whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION_ELEMENTOS.BLOQUE", filtros.Bloque)}");
                filtrosAplicados.Add($"BLOQUE: {filtros.Bloque.Trim()}'");
            }
            if (!string.IsNullOrWhiteSpace(filtros.Defecto))
            {
                whereSb.Append($" AND {BuildStringCondition("CENTRALITV.INSPECCION_ELEMENTOS.DEFECTO", filtros.Defecto)}");
                filtrosAplicados.Add($"ELEMENTO: {filtros.Defecto.Trim()}'");
            }
        }

        // 3. Construcción del SELECT y cláusula ORDER BY segura
        var selectExpressions = string.Join(", ", columnasSeleccionadas.Select(c => c.CampoSql));
        var whereClause = whereSb.ToString();

        // Índice de estación y fecha dentro de las columnas seleccionadas (para ORDER BY por ordinal seguro en DISTINCT)
        int idxEstacion = columnasSeleccionadas.FindIndex(c =>
            c.ColumnaExcel.Equals("COD_ESTACION", StringComparison.OrdinalIgnoreCase) ||
            c.CampoSql.Contains("CodEstacion", StringComparison.OrdinalIgnoreCase));

        int idxFechaInsp = columnasSeleccionadas.FindIndex(c =>
            c.ColumnaExcel.Equals("FECHA_INSPECCION", StringComparison.OrdinalIgnoreCase) ||
            c.CampoSql.Contains("FechaInspeccion", StringComparison.OrdinalIgnoreCase));

        var ordenPartes = new List<string>();
        if (idxEstacion >= 0) ordenPartes.Add((idxEstacion + 1).ToString());
        if (idxFechaInsp >= 0 && idxFechaInsp != idxEstacion) ordenPartes.Add($"{idxFechaInsp + 1} ASC");
        string orderBySql = ordenPartes.Count > 0 ? $" ORDER BY {string.Join(", ", ordenPartes)}" : string.Empty;
        bool requiereClienteFactura =
            !string.IsNullOrWhiteSpace(filtros.CifFactura) ||
            !string.IsNullOrWhiteSpace(filtros.RazonSocialFactura) ||
            !string.IsNullOrWhiteSpace(filtros.CpFactura) ||
            !string.IsNullOrWhiteSpace(filtros.EmailFactura) ||
            !string.IsNullOrWhiteSpace(filtros.ProvinciaFactura) ||
            !string.IsNullOrWhiteSpace(filtros.TelefonoFactura);
        string joinClienteFactura = requiereClienteFactura
            ? @"
                    LEFT JOIN CENTRALITV.CLIENTES
                           ON CENTRALITV.INSPECCION.Id_Cliente_Facturacion = CENTRALITV.CLIENTES.Id_Cliente
                          AND CENTRALITV.INSPECCION.CodEstacion = CENTRALITV.CLIENTES.CodEstacion"
            : string.Empty;
        string fromMediciones = $@"
                    FROM CENTRALITV.INSPECCION
                    {joinClienteFactura}
                    INNER JOIN CENTRALITV.INSPECCION_MEDICIONES
                            ON CENTRALITV.INSPECCION.CODINSPECCION = CENTRALITV.INSPECCION_MEDICIONES.CODINSPECCION
                           AND CENTRALITV.INSPECCION.CODESTACION = CENTRALITV.INSPECCION_MEDICIONES.CODESTACION
                    WHERE CENTRALITV.INSPECCION.ANULADA = 0
                    {whereClause}";

        string sqlFinal;
        switch (tipoNorm)
        {
            case "defectos":
                sqlFinal = $@"
                    SELECT /*+ LEADING(INSPECCION INSPECCION_DEFECTOS DEFECTOSSUB_SECCION)
                               INDEX(INSPECCION P17_INSPECCION P31_INSPECCION)
                               USE_NL(INSPECCION_DEFECTOS)
                               USE_NL(DEFECTOSSUB_SECCION) */
                           {selectExpressions}
                    FROM CENTRALITV.INSPECCION
                    {joinClienteFactura}
                    INNER JOIN CENTRALITV.INSPECCION_DEFECTOS
                            ON CENTRALITV.INSPECCION.CODESTACION = CENTRALITV.INSPECCION_DEFECTOS.CODESTACION
                           AND CENTRALITV.INSPECCION.CODINSPECCION = CENTRALITV.INSPECCION_DEFECTOS.CODINSPECCION
                    INNER JOIN CENTRALITV.DEFECTOSSUB_SECCION
                            ON CENTRALITV.INSPECCION.CODSECCION = CENTRALITV.DEFECTOSSUB_SECCION.CODSECCION
                           AND CENTRALITV.INSPECCION_DEFECTOS.BLOQUE = CENTRALITV.DEFECTOSSUB_SECCION.BLOQUE
                           AND CENTRALITV.INSPECCION_DEFECTOS.DEFECTO = CENTRALITV.DEFECTOSSUB_SECCION.DEFECTO
                           AND CENTRALITV.INSPECCION_DEFECTOS.SUBDEFECTO = CENTRALITV.DEFECTOSSUB_SECCION.SUBDEFECTO
                           AND CENTRALITV.INSPECCION_DEFECTOS.NUMERO = CENTRALITV.DEFECTOSSUB_SECCION.NUMERO
                           AND CENTRALITV.INSPECCION_DEFECTOS.LEVE = CENTRALITV.DEFECTOSSUB_SECCION.LEVE
                           AND CENTRALITV.INSPECCION_DEFECTOS.GRAVE = CENTRALITV.DEFECTOSSUB_SECCION.GRAVE
                           AND CENTRALITV.INSPECCION_DEFECTOS.MUYGRAVE = CENTRALITV.DEFECTOSSUB_SECCION.MUYGRAVE
                           AND CENTRALITV.DEFECTOSSUB_SECCION.CODIDIOMA = 'ESP'
                    WHERE CENTRALITV.INSPECCION.ANULADA = 0
                    {whereClause}
                    {orderBySql}";
                break;

            case "elementos":
                sqlFinal = $@"
                    SELECT /*+ LEADING(INSPECCION INSPECCION_ELEMENTOS DEFECTOS)
                               INDEX(INSPECCION P17_INSPECCION P31_INSPECCION)
                               USE_NL(INSPECCION_ELEMENTOS)
                               USE_NL(DEFECTOS) */
                           {selectExpressions},
                           CENTRALITV.INSPECCION.CODESTACION AS COD_ESTACION_GRAFICO
                    FROM CENTRALITV.INSPECCION
                    {joinClienteFactura}
                    INNER JOIN CENTRALITV.INSPECCION_ELEMENTOS
                            ON CENTRALITV.INSPECCION.CODESTACION = CENTRALITV.INSPECCION_ELEMENTOS.CODESTACION
                           AND CENTRALITV.INSPECCION.CODINSPECCION = CENTRALITV.INSPECCION_ELEMENTOS.CODINSPECCION
                    INNER JOIN CENTRALITV.DEFECTOS
                            ON CENTRALITV.DEFECTOS.CODESTACION = CENTRALITV.INSPECCION_ELEMENTOS.CODESTACION
                           AND CENTRALITV.DEFECTOS.BLOQUE = CENTRALITV.INSPECCION_ELEMENTOS.BLOQUE
                           AND CENTRALITV.DEFECTOS.DEFECTO = CENTRALITV.INSPECCION_ELEMENTOS.DEFECTO
                           AND CENTRALITV.DEFECTOS.CODIDIOMA = 'ESP'
                    WHERE CENTRALITV.INSPECCION.ANULADA = 0
                    {whereClause}
                    {orderBySql}";
                break;

            case "mediciones":
                sqlFinal = $@"
                    SELECT DISTINCT {selectExpressions}
                    {fromMediciones}
                    {orderBySql}";
                break;

            default:
                string joinDefectos = string.Empty;
                if (columnasSeleccionadas.Any(c =>
                    c.ColumnaExcel.Equals("LISTA_DEFECTOS", StringComparison.OrdinalIgnoreCase) ||
                    c.CampoSql.Contains("LISTA_DEFECTOS", StringComparison.OrdinalIgnoreCase)))
                {
                    joinDefectos = $@"
                    LEFT JOIN (
                        SELECT INSPECCION_DEFECTOS.CodInspeccion,
                               INSPECCION_DEFECTOS.CodEstacion,
                               LISTAGG(TRIM(TO_CHAR(INSPECCION_DEFECTOS.BLOQUE - 10, '00')) || '.' || INSPECCION_DEFECTOS.DEFECTO || '.' || INSPECCION_DEFECTOS.SUBDEFECTO || '.' || INSPECCION_DEFECTOS.NUMERO || DECODE(INSPECCION_DEFECTOS.LEVE, -1, 'L ', DECODE(INSPECCION_DEFECTOS.GRAVE, -1, 'G ', 'MG ')), '')
                               WITHIN GROUP (ORDER BY TRIM(TO_CHAR(INSPECCION_DEFECTOS.BLOQUE - 10, '00')) || '.' || INSPECCION_DEFECTOS.DEFECTO || '.' || INSPECCION_DEFECTOS.SUBDEFECTO || '.' || INSPECCION_DEFECTOS.NUMERO || DECODE(INSPECCION_DEFECTOS.LEVE, -1, 'L ', DECODE(INSPECCION_DEFECTOS.GRAVE, -1, 'G ', 'MG '))) AS LISTA_DEFECTOS
                        FROM CENTRALITV.INSPECCION_DEFECTOS
                        INNER JOIN CENTRALITV.INSPECCION
                                ON INSPECCION_DEFECTOS.CodInspeccion = CENTRALITV.INSPECCION.CodInspeccion
                               AND INSPECCION_DEFECTOS.CodEstacion = CENTRALITV.INSPECCION.CodEstacion
                        WHERE CENTRALITV.INSPECCION.ANULADA = 0
                        {whereClause}
                        GROUP BY INSPECCION_DEFECTOS.CodEstacion, INSPECCION_DEFECTOS.CodInspeccion
                    ) INSPECCIONDEFECTO
                      ON CENTRALITV.INSPECCION.CODINSPECCION = INSPECCIONDEFECTO.CodInspeccion
                     AND CENTRALITV.INSPECCION.CODESTACION = INSPECCIONDEFECTO.CodEstacion";
                }

                sqlFinal = $@"
                    SELECT {selectExpressions}
                    FROM CENTRALITV.INSPECCION
                    LEFT JOIN CENTRALITV.FORMAPAGO
                           ON CENTRALITV.INSPECCION.CODFORMAPAGO = CENTRALITV.FORMAPAGO.CODFORMAPAGO
                    LEFT JOIN CENTRALITV.MEDIADOR
                           ON CENTRALITV.INSPECCION.MEDIADOR = CENTRALITV.MEDIADOR.ID_MEDIADOR
                          AND CENTRALITV.INSPECCION.CODESTACION = CENTRALITV.MEDIADOR.CODESTACION
                    LEFT JOIN CENTRALITV.CLIENTES
                           ON CENTRALITV.INSPECCION.Id_Cliente_Facturacion = CENTRALITV.CLIENTES.Id_Cliente
                          AND CENTRALITV.INSPECCION.CodEstacion = CENTRALITV.CLIENTES.CodEstacion
                    LEFT JOIN CENTRALITV.CUPONES
                           ON CENTRALITV.INSPECCION.CODCUPON = CENTRALITV.CUPONES.CODCUPON
                    {joinDefectos}
                    WHERE CENTRALITV.INSPECCION.ANULADA = 0
                    {whereClause}
                    {orderBySql}";
                break;
        }

        bool limitarDetalleGrid = (tipoNorm is "elementos" or "defectos" or "mediciones") &&
            maxFilasRetorno == 5000 &&
            onRow == null;
        if (limitarDetalleGrid)
        {
            sqlFinal = $"SELECT * FROM ({sqlFinal}) WHERE ROWNUM <= 5000";
        }

        LogSqlEjecutada($"LOCALIZACION_{tipoNorm.ToUpperInvariant()}", sqlFinal, fIni, fFin);
        var executionTimer = Stopwatch.StartNew();

        IReadOnlyList<ColumnaResultadoLocalizacionDto> colsDto = columnasSeleccionadas.Select(c => new ColumnaResultadoLocalizacionDto(
            IdCampo: c.IdCampo,
            ColumnaExcel: c.ColumnaExcel,
            DesCampo: c.DesCampo,
            TipoDato: c.TipoDato,
            CategoriaCampo: c.CategoriaCampo
        )).ToList();

        int totalEstadistico = 0;
        long? estadisticasElapsedMs = null;
        long detalleReaderElapsedMs = 0;
        long detalleFetchElapsedMs = 0;
        var conteoEstacionesEstadistico = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        bool usarEstadisticasSeparadas = limitarDetalleGrid;
        bool metadataEnviada = false;

        // 4. Ejecución con reintento ante errores transitorios de red y blindaje ORA-12570
        async Task<ResultadoEjecucionLocalizacionRaw> EjecutarInternoAsync(bool esReintento = false)
        {
            await using var connection = new OracleConnection(_options.ConnectionString);
            if (esReintento)
            {
                OracleConnection.ClearPool(connection);
            }
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync(cancellationToken);

            await using var cmd = connection.CreateCommand();
            cmd.BindByName = true;
            cmd.CommandText = sqlFinal;
            cmd.CommandType = CommandType.Text;
            cmd.CommandTimeout = 120;
            cmd.FetchSize = 1024 * 512; // 512 KB de buffer para lectura rápida de lotes

            foreach (var p in parametros)
            {
                cmd.Parameters.Add(new OracleParameter(p.ParameterName, p.OracleDbType) { Value = p.Value });
            }

            if (usarEstadisticasSeparadas)
            {
                var statsTimer = Stopwatch.StartNew();
                totalEstadistico = 0;
                conteoEstacionesEstadistico.Clear();
                var sqlEstadisticas = tipoNorm switch
                {
                    "elementos" => $@"
                        SELECT /*+ LEADING(INSPECCION INSPECCION_ELEMENTOS DEFECTOS)
                                   INDEX(INSPECCION P17_INSPECCION P31_INSPECCION)
                                   USE_NL(INSPECCION_ELEMENTOS)
                                   USE_NL(DEFECTOS) */
                               CENTRALITV.INSPECCION.CODESTACION, COUNT(*)
                        FROM CENTRALITV.INSPECCION
                        INNER JOIN CENTRALITV.INSPECCION_ELEMENTOS
                                ON CENTRALITV.INSPECCION.CODESTACION = CENTRALITV.INSPECCION_ELEMENTOS.CODESTACION
                               AND CENTRALITV.INSPECCION.CODINSPECCION = CENTRALITV.INSPECCION_ELEMENTOS.CODINSPECCION
                        INNER JOIN CENTRALITV.DEFECTOS
                                ON CENTRALITV.DEFECTOS.CODESTACION = CENTRALITV.INSPECCION_ELEMENTOS.CODESTACION
                               AND CENTRALITV.DEFECTOS.BLOQUE = CENTRALITV.INSPECCION_ELEMENTOS.BLOQUE
                               AND CENTRALITV.DEFECTOS.DEFECTO = CENTRALITV.INSPECCION_ELEMENTOS.DEFECTO
                               AND CENTRALITV.DEFECTOS.CODIDIOMA = 'ESP'
                        WHERE CENTRALITV.INSPECCION.ANULADA = 0
                        {whereClause}
                        GROUP BY CENTRALITV.INSPECCION.CODESTACION",
                    "defectos" => $@"
                        SELECT /*+ LEADING(INSPECCION INSPECCION_DEFECTOS DEFECTOSSUB_SECCION)
                                   INDEX(INSPECCION P17_INSPECCION P31_INSPECCION)
                                   USE_NL(INSPECCION_DEFECTOS)
                                   USE_NL(DEFECTOSSUB_SECCION) */
                               CENTRALITV.INSPECCION.CODESTACION, COUNT(*)
                        FROM CENTRALITV.INSPECCION
                        {joinClienteFactura}
                        INNER JOIN CENTRALITV.INSPECCION_DEFECTOS
                                ON CENTRALITV.INSPECCION.CODESTACION = CENTRALITV.INSPECCION_DEFECTOS.CODESTACION
                               AND CENTRALITV.INSPECCION.CODINSPECCION = CENTRALITV.INSPECCION_DEFECTOS.CODINSPECCION
                        INNER JOIN CENTRALITV.DEFECTOSSUB_SECCION
                                ON CENTRALITV.INSPECCION.CODSECCION = CENTRALITV.DEFECTOSSUB_SECCION.CODSECCION
                               AND CENTRALITV.INSPECCION_DEFECTOS.BLOQUE = CENTRALITV.DEFECTOSSUB_SECCION.BLOQUE
                               AND CENTRALITV.INSPECCION_DEFECTOS.DEFECTO = CENTRALITV.DEFECTOSSUB_SECCION.DEFECTO
                               AND CENTRALITV.INSPECCION_DEFECTOS.SUBDEFECTO = CENTRALITV.DEFECTOSSUB_SECCION.SUBDEFECTO
                               AND CENTRALITV.INSPECCION_DEFECTOS.NUMERO = CENTRALITV.DEFECTOSSUB_SECCION.NUMERO
                               AND CENTRALITV.INSPECCION_DEFECTOS.LEVE = CENTRALITV.DEFECTOSSUB_SECCION.LEVE
                               AND CENTRALITV.INSPECCION_DEFECTOS.GRAVE = CENTRALITV.DEFECTOSSUB_SECCION.GRAVE
                               AND CENTRALITV.INSPECCION_DEFECTOS.MUYGRAVE = CENTRALITV.DEFECTOSSUB_SECCION.MUYGRAVE
                               AND CENTRALITV.DEFECTOSSUB_SECCION.CODIDIOMA = 'ESP'
                        WHERE CENTRALITV.INSPECCION.ANULADA = 0
                        {whereClause}
                        GROUP BY CENTRALITV.INSPECCION.CODESTACION",
                    "mediciones" when idxEstacion >= 0 => $@"
                        SELECT COD_ESTACION_GRAFICO, COUNT(*)
                        FROM (
                            SELECT DISTINCT {selectExpressions},
                                   CENTRALITV.INSPECCION.CODESTACION AS COD_ESTACION_GRAFICO
                            {fromMediciones}
                        )
                        GROUP BY COD_ESTACION_GRAFICO",
                    "mediciones" => $@"
                        SELECT COUNT(*)
                        FROM (
                            SELECT DISTINCT {selectExpressions}
                            {fromMediciones}
                        )",
                    _ => throw new InvalidOperationException($"No existe una agregación por estación para {tipoNorm}.")
                };
                LogSqlEjecutada(
                    $"LOCALIZACION_{tipoNorm.ToUpperInvariant()}_ESTADISTICAS",
                    sqlEstadisticas,
                    fIni,
                    fFin);
                await using var statsCommand = connection.CreateCommand();
                statsCommand.BindByName = true;
                statsCommand.CommandText = sqlEstadisticas;
                statsCommand.CommandType = CommandType.Text;
                statsCommand.CommandTimeout = 120;
                foreach (var p in parametros)
                {
                    statsCommand.Parameters.Add(new OracleParameter(p.ParameterName, p.OracleDbType) { Value = p.Value });
                }

                await using var statsReader = await statsCommand.ExecuteReaderAsync(cancellationToken);
                if (tipoNorm == "mediciones" && idxEstacion < 0)
                {
                    if (await statsReader.ReadAsync(cancellationToken))
                    {
                        totalEstadistico = Convert.ToInt32(statsReader.GetValue(0), CultureInfo.InvariantCulture);
                    }
                }
                else while (await statsReader.ReadAsync(cancellationToken))
                {
                    var rawEstacion = Convert.ToString(statsReader.GetValue(0))?.Trim() ?? string.Empty;
                    var count = Convert.ToInt32(statsReader.GetValue(1), CultureInfo.InvariantCulture);
                    totalEstadistico += count;
                    if (!string.IsNullOrWhiteSpace(rawEstacion))
                    {
                        conteoEstacionesEstadistico[rawEstacion.PadLeft(4, '0')] = count;
                    }
                }
                estadisticasElapsedMs = statsTimer.ElapsedMilliseconds;
            }

            var filas = new List<Dictionary<string, object?>>(Math.Min(maxFilasRetorno, 5000));
            var conteoEstaciones = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            int totalRegistros = usarEstadisticasSeparadas ? totalEstadistico : 0;
            bool truncado = false;

            var readTimer = Stopwatch.StartNew();
            long? firstRowElapsedMs = null;
            if (onMetadata != null && !metadataEnviada)
            {
                await onMetadata(colsDto, filtrosAplicados, cancellationToken);
                metadataEnviada = true;
            }
            var readerOpenTimer = Stopwatch.StartNew();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            detalleReaderElapsedMs = readerOpenTimer.ElapsedMilliseconds;
            int numCols = columnasSeleccionadas.Count;
            int idxEstacionLector = idxEstacion >= 0 ? idxEstacion : tipoNorm == "elementos" ? numCols : -1;
            var detailFetchTimer = Stopwatch.StartNew();

            while (await reader.ReadAsync(cancellationToken))
            {
                firstRowElapsedMs ??= readTimer.ElapsedMilliseconds;
                if (!usarEstadisticasSeparadas)
                {
                    totalRegistros++;
                }

                // Contabilizar por estación si la columna está proyectada
                if (!usarEstadisticasSeparadas && idxEstacionLector >= 0 && !reader.IsDBNull(idxEstacionLector))
                {
                    var rawEst = Convert.ToString(reader.GetValue(idxEstacionLector))?.Trim() ?? string.Empty;
                    if (!string.IsNullOrWhiteSpace(rawEst))
                    {
                        var codEstPad = rawEst.PadLeft(4, '0');
                        conteoEstaciones[codEstPad] = conteoEstaciones.GetValueOrDefault(codEstPad, 0) + 1;
                    }
                }

                if (onRow != null)
                {
                    var valores = new object?[numCols];
                    for (int j = 0; j < numCols; j++)
                    {
                        valores[j] = NormalizarValorColumna(reader, j, columnasSeleccionadas[j]);
                    }
                    await onRow(valores, cancellationToken);
                    if (filas.Count < maxFilasRetorno)
                    {
                        var fila = new Dictionary<string, object?>(numCols, StringComparer.OrdinalIgnoreCase);
                        for (int j = 0; j < numCols; j++)
                        {
                            fila[columnasSeleccionadas[j].ColumnaExcel] = valores[j];
                        }
                        filas.Add(fila);
                    }
                }
                else if (filas.Count < maxFilasRetorno)
                {
                    var fila = new Dictionary<string, object?>(numCols, StringComparer.OrdinalIgnoreCase);
                    for (int j = 0; j < numCols; j++)
                    {
                        fila[columnasSeleccionadas[j].ColumnaExcel] =
                            NormalizarValorColumna(reader, j, columnasSeleccionadas[j]);
                    }
                    filas.Add(fila);
                }
                else if (!usarEstadisticasSeparadas)
                {
                    truncado = true;
                }
            }
            detalleFetchElapsedMs = detailFetchTimer.ElapsedMilliseconds;

            if (usarEstadisticasSeparadas)
            {
                truncado = totalRegistros > filas.Count;
            }

            _logger.LogInformation(
                "Localización {Tipo}: consulta Oracle completada en {ElapsedMs} ms; estadísticas {StatsElapsedMs} ms; apertura detalle {DetailReaderElapsedMs} ms; lectura detalle {DetailFetchElapsedMs} ms; primera fila en {FirstRowElapsedMs} ms; filas leídas {TotalRows}, retenidas {StoredRows}, columnas {ColumnCount}, límite {RowLimit}, truncado {Truncated}.",
                tipoNorm,
                executionTimer.ElapsedMilliseconds,
                estadisticasElapsedMs,
                detalleReaderElapsedMs,
                detalleFetchElapsedMs,
                firstRowElapsedMs,
                totalRegistros,
                filas.Count,
                numCols,
                maxFilasRetorno,
                truncado);

            return new ResultadoEjecucionLocalizacionRaw(
                TotalRegistros: totalRegistros,
                Columnas: colsDto,
                Filas: filas,
                FiltrosAplicados: filtrosAplicados,
                ConteoPorEstacion: usarEstadisticasSeparadas ? conteoEstacionesEstadistico : conteoEstaciones,
                TotalColumnasDisponibles: catalogoColumnas.Count,
                Truncado: truncado
            );
        }

        try
        {
            return await EjecutarInternoAsync(esReintento: false);
        }
        catch (OracleException oex) when (oex.Number == 12570 && cancellationToken.IsCancellationRequested)
        {
            throw new OperationCanceledException("Consulta de localización cancelada por el cliente.", oex, cancellationToken);
        }
        catch (IOException ioex) when (cancellationToken.IsCancellationRequested)
        {
            throw new OperationCanceledException("Consulta de localización cancelada por el cliente.", ioex, cancellationToken);
        }
        catch (OracleException oex) when (
            onRow is null &&
            (oex.Number is 12541 or 12571 or 3113 or 3114) &&
            !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(oex, "Reintentando consulta de localización ({Tipo}) tras desconexión transitoria Oracle...", tipoNorm);
            return await EjecutarInternoAsync(esReintento: true);
        }
        catch (OracleException oex)
        {
            _logger.LogError(
                oex,
                "Consulta de localización {Tipo} falló tras {ElapsedMs} ms (ORA-{OracleError}).",
                tipoNorm,
                executionTimer.ElapsedMilliseconds,
                oex.Number);
            throw;
        }
    }

    private static object? NormalizarValorColumna(
        OracleDataReader reader,
        int ordinal,
        CampoLocalizacionDto colMeta)
    {
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        var rawVal = reader.GetValue(ordinal);
        if (colMeta.ColumnaExcel.Equals("FECHA_ULTIMA_ITV", StringComparison.OrdinalIgnoreCase) &&
            rawVal is DateTime dtUltima && dtUltima.Year < 1980)
        {
            return null;
        }

        if (rawVal is DateTime dtVal)
        {
            return dtVal.TimeOfDay.TotalSeconds > 0
                ? dtVal.ToString("dd/MM/yyyy HH:mm:ss", CultureInfo.InvariantCulture)
                : dtVal.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        }

        return rawVal is decimal
            ? rawVal
            : Convert.ToString(rawVal)?.Trim();
    }
}
