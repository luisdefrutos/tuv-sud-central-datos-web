using System.Data;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Domain.Entities.Informes;
using Microsoft.Extensions.Logging;
using Oracle.ManagedDataAccess.Client;

namespace CentralDatos.Infrastructure.Persistence.Repositories;

public sealed partial class OracleInformesRepository
{
    public async Task<IReadOnlyList<ClienteVolumenDato>> ObtenerClientesVolumenAsync(
        DateTime fechaInicio,
        DateTime fechaFin,
        int limiteCuenta,
        string? codEmpresa = null,
        IReadOnlyList<string>? codEstaciones = null,
        string? fase = null,
        int? idProyecto = null,
        IReadOnlyList<string>? tiposVehiculo = null,
        CancellationToken cancellationToken = default)
    {
        var sqlBase = _sqlLoader.GetQuery("ObtenerInformeClientesVolumen");

        var sqlFinal = sqlBase;
        var filtrosBase = new StringBuilder();
        var filtrosExtra = new StringBuilder();

        // 1. Filtrado por Sociedad (Cod_Empresa)
        if (!string.IsNullOrWhiteSpace(codEmpresa) &&
            !string.Equals(codEmpresa, "TODAS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(codEmpresa, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            filtrosBase.Append($" AND i.CODESTACION IN (SELECT CodEstacion FROM CENTRALITV.ESTACIONES WHERE Cod_Empresa = '{codEmpresa.Trim()}')");
        }

        // 2. Filtrado por Estaciones
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
                filtrosBase.Append($" AND i.CODESTACION IN ({codsIn})");
            }
            else
            {
                var codsIn = string.Join(", ", codsFiltrados.Select(c => $"'{c.Trim()}'"));
                filtrosBase.Append($" AND LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') IN ({codsIn})");
            }
        }

        // 3. Filtrado por Fase (Indica12)
        if (!string.IsNullOrWhiteSpace(fase) &&
            !string.Equals(fase, "TODAS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(fase, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            filtrosBase.Append($" AND i.Indica12 = '{fase.Trim()}'");
        }

        // 4. Filtrado por Tipos de Vehículo (Categorías MINER)
        var tiposFiltrados = tiposVehiculo?
            .Where(t => !string.IsNullOrWhiteSpace(t) && !string.Equals(t, "TODOS", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (tiposFiltrados != null && tiposFiltrados.Count > 0)
        {
            var tiposIn = string.Join(", ", tiposFiltrados.Select(t => $"'{t.Trim()}'"));
            filtrosBase.Append($" AND CENTRALITV.CLASIFICACION_MINER(i.CodConstruccion, i.CodUtilizacion) IN ({tiposIn})");
        }

        // 5. Filtrado por Proyecto Comercial
        if (idProyecto.HasValue && idProyecto.Value > 0)
        {
            filtrosExtra.Append(" INNER JOIN CENTRALITV.PROYECTOS_CLIENTES pc ON pc.NIF_Cliente = d.CifTitular AND pc.Id_proyecto = :IdProyecto");
        }

        sqlFinal = sqlFinal.Replace("/*FILTROS_BASE*/", filtrosBase.ToString());
        sqlFinal = sqlFinal.Replace("/*FILTROS_EXTRA*/", filtrosExtra.ToString());

        return await ObtenerClientesVolumenDirectoAsync(sqlFinal, fechaInicio, fechaFin, Math.Max(1, limiteCuenta), idProyecto, cancellationToken);
    }

    private async Task<IReadOnlyList<ClienteVolumenDato>> ObtenerClientesVolumenDirectoAsync(
        string sql,
        DateTime fechaInicio,
        DateTime fechaFin,
        int limiteCuenta,
        int? idProyecto,
        CancellationToken cancellationToken)
    {
        LogSqlEjecutada("INFORME_CLIENTES_VOLUMEN", sql, fechaInicio, fechaFin);

        async Task<IReadOnlyList<ClienteVolumenDato>> EjecutarQueryAsync(bool esReintento = false)
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
            cmd.Parameters.Add(new OracleParameter("LimiteCuenta", OracleDbType.Int32) { Value = limiteCuenta });

            if (idProyecto.HasValue && idProyecto.Value > 0)
            {
                cmd.Parameters.Add(new OracleParameter("IdProyecto", OracleDbType.Int32) { Value = idProyecto.Value });
            }

            var lista = new List<ClienteVolumenDato>();

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var item = new ClienteVolumenDato
                {
                    CodEstacion = reader.IsDBNull(0) ? string.Empty : reader.GetString(0).Trim(),
                    DesEstacion = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim(),
                    CodEmpresa = reader.IsDBNull(2) ? "01" : reader.GetString(2).Trim(),
                    CifFactura = reader.IsDBNull(3) ? string.Empty : reader.GetString(3).Trim(),
                    CifTitular = reader.IsDBNull(4) ? string.Empty : reader.GetString(4).Trim(),
                    NombreCliente = reader.IsDBNull(5) ? string.Empty : reader.GetString(5).Trim(),
                    Domicilio = reader.IsDBNull(6) ? string.Empty : reader.GetString(6).Trim(),
                    CodigoPostal = reader.IsDBNull(7) ? string.Empty : reader.GetString(7).Trim(),
                    Poblacion = reader.IsDBNull(8) ? string.Empty : reader.GetString(8).Trim(),
                    Provincia = reader.IsDBNull(9) ? string.Empty : reader.GetString(9).Trim(),
                    Telefono = reader.IsDBNull(10) ? string.Empty : reader.GetString(10).Trim(),
                    Telefono2 = reader.IsDBNull(11) ? string.Empty : reader.GetString(11).Trim(),
                    Resultado = reader.IsDBNull(12) ? "FAV" : reader.GetString(12).Trim(),
                    Cuenta = reader.IsDBNull(13) ? 0 : Convert.ToInt32(reader.GetValue(13)),
                    CuentaCif = reader.IsDBNull(14) ? 0 : Convert.ToInt32(reader.GetValue(14))
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
            _logger.LogWarning(ex, "[ORA-12570] Fallo de paquete en Informe Clientes por Volumen. Reintentando tras 2s...");
            await Task.Delay(2000, cancellationToken);
            return await EjecutarQueryAsync(esReintento: true);
        }
    }

    public async Task<IReadOnlyList<ProyectoComercialDto>> ObtenerProyectosComercialesAsync(CancellationToken cancellationToken = default)
    {
        var sql = _sqlLoader.GetQuery("ObtenerProyectosComerciales");
        await using var connection = new OracleConnection(_options.ConnectionString);
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(cancellationToken);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        cmd.CommandTimeout = 30;

        var lista = new List<ProyectoComercialDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var id = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader.GetValue(0));
            var desc = reader.IsDBNull(1) ? string.Empty : reader.GetString(1).Trim();
            lista.Add(new ProyectoComercialDto(id, desc));
        }

        return lista;
    }
}

