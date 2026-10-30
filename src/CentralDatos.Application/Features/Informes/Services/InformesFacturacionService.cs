using System.Globalization;
using System.Text;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesFacturacionService : IInformesFacturacionService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesFacturacionService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeFacturacionResponseDto> GenerarInformeFacturacionAsync(
        FiltrosFacturacionRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        // 0. Validación de rango (Máximo 1 año para optimización de consultas masivas)
        if (filtros.FechaFin < filtros.FechaInicio)
        {
            throw new ArgumentException("La fecha final no puede ser anterior a la fecha de inicio.");
        }
        if ((filtros.FechaFin.Date - filtros.FechaInicio.Date).TotalDays > 366)
        {
            throw new ArgumentException("El rango de fechas no puede ser superior a 1 año (365 días) para optimizar el rendimiento de la consulta en Central Datos.");
        }

        // 1. Normalización de fechas (rango completo desde 00:00:00 hasta 23:59:59)
        var fInicio = filtros.FechaInicio.Date;
        var fFin = filtros.FechaFin.Date.AddDays(1).AddTicks(-1);

        // 2. Mapeo de sociedad
        string? codEmpresa = filtros.Sociedad?.ToUpperInvariant() switch
        {
            "TSA" => "01",
            "CAL" => "03",
            _ => null
        };

        // 3. Normalización de lista de estaciones
        var estaciones = (filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0 && !filtros.CodEstaciones.Contains("TODAS"))
            ? filtros.CodEstaciones
            : null;

        // 4. Consulta a Base de Datos Oracle
        var datos = await _repository.ObtenerFacturacionAsync(fInicio, fFin, codEmpresa, estaciones, cancellationToken);

        // 5. Cálculos analíticos centrales en el servidor (Thin Client)
        var totalFacturacion = datos.Sum(x => x.TotalIngresos);
        var totalInspecciones = datos.Sum(x => x.TotalInspecciones);
        var ticketMedioGlobal = totalInspecciones > 0
            ? Math.Round(totalFacturacion / totalInspecciones, 2)
            : 0.00m;

        var estacionLider = datos.OrderByDescending(x => x.TotalIngresos).FirstOrDefault();

        // 6. Generación de KPI Cards
        var kpis = new List<ReportKpiDto>
        {
            new(
                "facturacion_total",
                "Facturación Neta Total",
                $"{totalFacturacion.ToString("N2", CultureEs)} €",
                $"{datos.Count} estaciones analizadas",
                "primary",
                "💰"
            ),
            new(
                "total_inspecciones",
                "Total Inspecciones",
                totalInspecciones.ToString("N0", CultureEs),
                "Inspecciones válidas no anuladas",
                "neutral",
                "🚗"
            ),
            new(
                "ticket_medio",
                "Ticket Medio / Inspección",
                $"{ticketMedioGlobal.ToString("N2", CultureEs)} €",
                "Promedio global de la red",
                "neutral",
                "📊"
            ),
            new(
                "estacion_top",
                "Estación Mayor Facturación",
                estacionLider != null ? LimpiarNombre(estacionLider.DesEstacion) : "N/D",
                estacionLider != null ? $"{estacionLider.TotalIngresos.ToString("N2", CultureEs)} €" : null,
                "success",
                "🏆"
            )
        };

        // 7. Generación de Puntos para el Gráfico Comparativo
        var grafico = datos
            .OrderByDescending(x => x.TotalIngresos)
            .Select(x => new ReportGraficoPointDto(
                x.CodEstacion,
                $"{x.CodEstacion} {LimpiarNombre(x.DesEstacion)}",
                x.TotalIngresos,
                $"{x.TotalIngresos.ToString("N2", CultureEs)} €",
                x.ClaveSociedad,
                x.ClaveSociedad == "CAL" ? "#00875a" : "#0046ad"
            ))
            .ToList();

        // 8. Generación de Filas del Grid
        var filas = datos
            .OrderBy(x => x.CodEmpresa)
            .ThenBy(x => x.DesEstacion)
            .Select(x => new FilaFacturacionDto(
                x.CodEstacion,
                x.DesEstacion,
                x.CodEmpresa,
                x.NombreEmpresa,
                x.ClaveSociedad,
                x.TotalInspecciones,
                x.TotalIngresos,
                $"{x.TotalIngresos.ToString("N2", CultureEs)} €",
                x.TicketMedio,
                $"{x.TicketMedio.ToString("N2", CultureEs)} €",

                // Desglose Crystal Reports
                x.ContadosNumInspecciones,
                x.ContadosBase,
                x.ContadosIva,
                x.ContadosTasas,
                x.ContadosTotal,

                x.TercerosNumInspecciones,
                x.TercerosBase,
                x.TercerosIva,
                x.TercerosTasas,
                x.TercerosTotal,

                x.TarjetasNumInspecciones,
                x.TarjetasBase,
                x.TarjetasIva,
                x.TarjetasTasas,
                x.TarjetasTotal,

                x.TotalesNumInspecciones,
                x.TotalesBase,
                x.TotalesIva,
                x.TotalesTasas,
                x.TotalesTasasTrafico,
                x.TotalesTasasIndustria,
                x.TotalesTotal,
                x.Gratuitas
            ))
            .ToList();

        return new InformeFacturacionResponseDto(
            kpis,
            grafico,
            filas,
            totalFacturacion,
            totalInspecciones,
            ticketMedioGlobal,
            $"{totalFacturacion.ToString("N2", CultureEs)} €",
            $"{ticketMedioGlobal.ToString("N2", CultureEs)} €",
            datos.Count
        );
    }

    public async Task<byte[]> GenerarExportacionFacturacionCsvAsync(
        FiltrosFacturacionRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeFacturacionAsync(filtros, cancellationToken);
        var sb = new StringBuilder();

        // Cabeceras oficiales en español
        sb.AppendLine("\"Código\";\"Estación\";\"Sociedad\";\"Total Inspecciones\";\"Facturación Neta (€)\";\"Ticket Medio (€)\"");

        foreach (var fila in informe.Filas)
        {
            sb.AppendLine(string.Format(
                CultureEs,
                "\"{0}\";\"{1}\";\"{2}\";{3};{4:F2};{5:F2}",
                fila.CodEstacion,
                fila.DesEstacion.Replace("\"", "\"\""),
                fila.NombreEmpresa.Replace("\"", "\"\""),
                fila.TotalInspecciones,
                fila.TotalIngresos,
                fila.TicketMedio
            ));
        }

        // Fila de Totales Generales al pie de la tabla
        sb.AppendLine(string.Format(
            CultureEs,
            "\"TOTALES\";\"Red de {0} Estaciones\";\"-\";{1};{2:F2};{3:F2}",
            informe.TotalEstaciones,
            informe.TotalInspecciones,
            informe.TotalFacturacion,
            informe.TicketMedioGlobal
        ));

        // UTF-8 con BOM para apertura transparente en Microsoft Excel en cualquier idioma
        var bom = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var resultado = new byte[bom.Length + bytes.Length];
        Buffer.BlockCopy(bom, 0, resultado, 0, bom.Length);
        Buffer.BlockCopy(bytes, 0, resultado, bom.Length, bytes.Length);

        return resultado;
    }

    private static string LimpiarNombre(string des)
    {
        return des.Replace("I.T.V. - ", "").Replace("I.T.V. ", "").Trim();
    }
}

