using System.Data;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Domain.Entities.Informes;
using Microsoft.Extensions.Logging;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<VolumenDefectosDato>> ObtenerVolumenDefectosAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? bloque = null,
        string? defecto = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeVclDefectos");

        var sqlFinal = sqlBase;
        var whereExtra = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(codEmpresa) &&
            !string.Equals(codEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(codEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            whereExtra.Append($" AND i.CODESTACION IN (SELECT CodEstacion FROM CENTRALITV.ESTACIONES WHERE Cod_Empresa = '{codEmpresa.Trim()}')");
        }

        var codsFiltrados = codEstaciones?
            .Where(c => !string.IsNullOrWhiteSpace(c) && !string.Equals(c, "TODAS", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (codsFiltrados != null && codsFiltrados.Count > 0)
        {
            var codsInts = codsFiltrados
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
                var codsIn = string.Join(", ", codsFiltrados.Select(c => $"'{c.Trim()}'"));
                whereExtra.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        // Filtro opcional por Bloque
        if (!string.IsNullOrWhiteSpace(bloque) &&
            !string.Equals(bloque, "TODOS", StringComparison.OrdinalIgnoreCase))
        {
            whereExtra.Append($" AND d.Bloque = '{bloque.Trim()}'");
        }

        // Filtro opcional por Defecto / Elemento
        if (!string.IsNullOrWhiteSpace(defecto) &&
            !string.Equals(defecto, "TODOS", StringComparison.OrdinalIgnoreCase))
        {
            whereExtra.Append($" AND d.Defecto = '{defecto.Trim()}'");
        }

        sqlFinal = sqlFinal.Replace("/*WHERE_EXTRA*/", whereExtra.ToString());

        return await ObtenerVolumenDefectosDirectoAsync(sqlFinal, fechaInicio, fechaFin, cancellationToken);
    }

    private async Task<IReadOnlyList<VolumenDefectosDato>> ObtenerVolumenDefectosDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        CancellationToken cancellationToken)
    {
        LogSqlEjecutada("INFORME_VOLUMEN_DEFECTOS", sql, fechaInicio, fechaFin);

        async Task<IReadOnlyList<VolumenDefectosDato>> EjecutarQueryAsync(bool esReintento = false)
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
            cmd.CommandText = sql;
            cmd.CommandType = CommandType.Text;
            cmd.CommandTimeout = 120;
            cmd.InitialLONGFetchSize = 0;

            cmd.Parameters.Add(new OracleParameter("FechaInicio", OracleDbType.Date) { Value = fechaInicio });
            cmd.Parameters.Add(new OracleParameter("FechaFin", OracleDbType.Date) { Value = fechaFin });

            var lista = new List<VolumenDefectosDato>();

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var item = new VolumenDefectosDato
                {
                    CodEstacion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                    DesEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                    CodEmpresa = reader.IsDBNull(2) ? "01" : reader.GetString(2).Trim(),
                    GrupoCategoria = reader.IsDBNull(3) ? "Otros" : reader.GetString(3).Trim(),
                    Bloque = reader.IsDBNull(4) ? string.Empty : reader.GetString(4).Trim(),
                    Defecto = reader.IsDBNull(5) ? string.Empty : reader.GetString(5).Trim(),
                    Subdefecto = reader.IsDBNull(6) ? string.Empty : reader.GetString(6).Trim(),
                    Gravedad = reader.IsDBNull(7) ? "L" : reader.GetString(7).Trim(),
                    Descripcion = reader.IsDBNull(8) ? string.Empty : reader.GetString(8).Trim(),
                    NumDefectos = reader.IsDBNull(9) ? 0 : Convert.ToInt32(reader.GetValue(9)),
                };
                lista.Add(item);
            }

            return lista;
        }

        try
        {
            return await EjecutarQueryAsync();
        }
        catch (OracleException ex) when (ex.Number == 12570 || ex.Message.Contains("ORA-12570"))
        {
            _logger.LogWarning(ex, "[ORA-12570] Fallo de paquete en Informe Volumen de Defectos. Reintentando tras 2s...");
            await Task.Delay(2000, cancellationToken);
            return await EjecutarQueryAsync(esReintento: true);
        }
    }

    public async Task<IReadOnlyList<CatalogoDefectoItemDto>> ObtenerBloquesDefectosAsync(CancellationToken cancellationToken = default)
    {
        var sql = _sqlLoader.GetQuery("ObtenerDefectosBloques");
        await using var connection = new OracleConnection(_options.ConnectionString);
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        cmd.CommandTimeout = 30;

        var items = new List<CatalogoDefectoItemDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var cod = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim();
            var des = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
            if (!string.IsNullOrEmpty(cod))
            {
                items.Add(new CatalogoDefectoItemDto(cod, $"{cod} - {des}"));
            }
        }
        return items;
    }

    public async Task<IReadOnlyList<CatalogoDefectoItemDto>> ObtenerElementosDefectosAsync(string bloque, CancellationToken cancellationToken = default)
    {
        var sql = _sqlLoader.GetQuery("ObtenerDefectosElementos");
        await using var connection = new OracleConnection(_options.ConnectionString);
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.BindByName = true;
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        cmd.CommandTimeout = 30;
        cmd.Parameters.Add(new OracleParameter("Bloque", OracleDbType.Varchar2) { Value = bloque.Trim() });

        var items = new List<CatalogoDefectoItemDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var cod = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim();
            var des = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
            if (!string.IsNullOrEmpty(cod))
            {
                items.Add(new CatalogoDefectoItemDto(cod, $"{cod} - {des}"));
            }
        }
        return items;
    }
}

