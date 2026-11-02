using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Domain.Entities.Informes;

namespace CentralDatos.Application.Features.Informes.Services;

public sealed class InformesDefectoObdService : IInformesDefectoObdService
{
    private readonly IInformesRepository _repository;
    private static readonly CultureInfo CultureEs = new("es-ES");

    public InformesDefectoObdService(IInformesRepository repository)
    {
        _repository = repository;
    }

    public async Task<InformeDefectoObdResponseDto> GenerarInformeDefectoObdAsync(
        FiltrosDefectoObdRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var (fInicio, fFin) = ParsearYValidarFechas(filtros.FechaInicio, filtros.FechaFin);

        string? codEmpresa = filtros.Sociedad?.ToUpperInvariant() switch
        {
            "TSA" => "01",
            "CAL" => "03",
            _ => null
        };

        var estaciones = (filtros.CodEstaciones != null && filtros.CodEstaciones.Count > 0 && !filtros.CodEstaciones.Contains("TODAS"))
            ? filtros.CodEstaciones
            : null;

        string? fase = filtros.Fase switch
        {
            "1" or "1ª Fase" or "Fase 1" => "1",
            "2" or "2ª Fase" or "Fase 2" => "2",
            _ => null
        };

        var datos = await _repository.ObtenerDefectosObdAsync(fInicio, fFin, codEmpresa, estaciones, fase, cancellationToken);

        // 1. Mapeo a Filas DTO
        var filas = datos.Select(d => new FilaDefectoObdDto(
            d.CodInspeccion,
            d.CodEstacion,
            d.DesEstacion,
            d.CodEmpresa,
            d.NombreEmpresa,
            d.ClaveSociedad,
            d.Matricula,
            d.FechaInspeccion,
            d.FechaInspeccion.ToString("dd/MM/yyyy HH:mm", CultureEs),
            d.Marca,
            d.Modelo,
            d.TipoMotor,
            d.TipoVehiculo,
            d.CHomologacion,
            d.Clasificacion,
            d.Mma,
            d.Kilometraje,
            d.TipoInspeccion,
            d.Resultado,
            d.TextoResultado,
            d.Fase == "1" ? "1ª Fase" : "2ª Fase",
            d.DesNivelEmisiones,
            d.Bloque,
            d.Defecto,
            d.Subdefecto,
            d.Numero,
            d.CodigoDefectoCompleto,
            d.DescripcionDefecto,
            d.TipoCombustible,
            d.GravedadDefecto
        )).ToList();

        // 2. Cálculos globales y agregaciones (Thick Server)
        var totalDefectosGlobal = filas.Count;
        var totalGasolina = filas.Count(f => f.TipoCombustible == "Gasolina");
        var totalDiesel = filas.Count(f => f.TipoCombustible == "Diésel");
        var totalFase1 = filas.Count(f => f.Fase == "1ª Fase");
        var totalFase2 = filas.Count(f => f.Fase == "2ª Fase");
        var totalGraves = filas.Count(f => f.Numero != "51");
        var totalLeves = filas.Count(f => f.Numero == "51");
        var estacionesAfectadas = filas.Select(f => f.CodEstacion).Distinct().Count();

        var pctGraves = totalDefectosGlobal > 0
            ? Math.Round((decimal)totalGraves / totalDefectosGlobal * 100m, 1)
            : 0m;
        var pctDiesel = totalDefectosGlobal > 0
            ? Math.Round((decimal)totalDiesel / totalDefectosGlobal * 100m, 1)
            : 0m;
        var pctGasolina = totalDefectosGlobal > 0
            ? Math.Round((decimal)totalGasolina / totalDefectosGlobal * 100m, 1)
            : 0m;

        // Estación con mayor volumen de defectos
        var topEstacionGroup = filas
            .GroupBy(f => new { f.CodEstacion, f.DesEstacion })
            .OrderByDescending(g => g.Count())
            .FirstOrDefault();

        var topEstacionNombre = topEstacionGroup != null
            ? $"{topEstacionGroup.Key.DesEstacion.Replace("I.T.V. - ", "").Trim()} ({topEstacionGroup.Count():N0} def.)"
            : "Sin registros";

        // 3. KPIs del informe
        var kpis = new List<ReportKpiDto>
        {
            new(
                "total-defectos",
                "Total Defectos OBD",
                totalDefectosGlobal.ToString("N0", CultureEs),
                "Inspecciones con anomalías o fallo OBD",
                "info",
                "📋"
            ),
            new(
                "diesel",
                "Motores Diésel",
                $"{totalDiesel:N0} ({pctDiesel}%)",
                "Defectos en diésel (Código 15.03)",
                "primary",
                "⛽"
            ),
            new(
                "gasolina",
                "Motores Gasolina",
                $"{totalGasolina:N0} ({pctGasolina}%)",
                "Defectos en gasolina (Código 15.02)",
                "success",
                "🚗"
            ),
            new(
                "graves",
                "Defectos Graves (DG)",
                $"{totalGraves:N0} ({pctGraves}%)",
                $"{totalGraves:N0} graves vs {totalLeves:N0} leves",
                "danger",
                "⚠️"
            ),
            new(
                "top-estacion",
                "Estación con Más Incidencias",
                topEstacionNombre,
                $"{estacionesAfectadas} estaciones con defectos registrados",
                "warning",
                "🏢"
            )
        };

        // 4. Gráfico de Barras: Ranking por Estación
        var graficoEstaciones = filas
            .GroupBy(f => new { f.CodEstacion, f.DesEstacion, f.ClaveSociedad })
            .Select(g => new
            {
                g.Key.CodEstacion,
                DesEstacion = g.Key.DesEstacion.Replace("I.T.V. - ", "").Trim(),
                g.Key.ClaveSociedad,
                Total = g.Count(),
                Diesel = g.Count(x => x.TipoCombustible == "Diésel"),
                Gasolina = g.Count(x => x.TipoCombustible == "Gasolina")
            })
            .OrderByDescending(x => x.Total)
            .Select(x => new ReportGraficoPointDto(
                x.CodEstacion,
                x.DesEstacion,
                x.Total,
                $"{x.Total:N0} def. (D: {x.Diesel:N0} | G: {x.Gasolina:N0})",
                x.ClaveSociedad,
                x.ClaveSociedad == "CAL" ? "#00875a" : "#0046ad"
            ))
            .ToList();

        // 5. Gráfico Donut: Tipología de Defectos OBD
        var graficoTipologia = filas
            .GroupBy(f => f.Numero)
            .Select(g =>
            {
                var num = g.Key;
                var total = g.Count();
                var label = num switch
                {
                    "03" => "MIL encendida tras arranque",
                    "04" => "Conector inaccesible / sin señal",
                    "31" => "Códigos DTC confirmados",
                    "05" => "Conexión manipulada / bloqueada",
                    "02" => "MIL no enciende al contacto",
                    "51" => "Fallo de protocolo / desconexión",
                    _ => $"Código defectología {num}"
                };

                var color = num switch
                {
                    "03" => "#c81e1e", // Rojo peligro
                    "04" => "#002b49", // Azul oscuro TÜV SÜD
                    "31" => "#e06d00", // Ámbar / naranja
                    "05" => "#7e22ce", // Púrpura
                    "02" => "#b45309", // Ocre
                    "51" => "#0284c7", // Azul claro
                    _ => "#64748b"
                };

                return new ReportGraficoPointDto(
                    $"obd_num_{num}",
                    label,
                    total,
                    $"{total:N0} ({CalcularPct(total, totalDefectosGlobal)}%)",
                    "OBD",
                    color
                );
            })
            .OrderByDescending(x => x.Valor)
            .ToList();

        // 6. Gráfico Donut: Combustible Diésel vs Gasolina
        var graficoCombustible = new List<ReportGraficoPointDto>
        {
            new(
                "comb_diesel",
                "Diésel",
                totalDiesel,
                $"{totalDiesel:N0} ({pctDiesel}%)",
                "DIESEL",
                "#002b49" // Azul corporativo oscuro
            ),
            new(
                "comb_gasolina",
                "Gasolina",
                totalGasolina,
                $"{totalGasolina:N0} ({pctGasolina}%)",
                "GASOLINA",
                "#0284c7" // Azul cyan corporativo
            )
        };

        return new InformeDefectoObdResponseDto(
            kpis,
            graficoEstaciones,
            graficoTipologia,
            graficoCombustible,
            filas,
            totalDefectosGlobal,
            totalDefectosGlobal.ToString("N0", CultureEs),
            totalGasolina,
            totalDiesel,
            totalFase1,
            totalFase2,
            estacionesAfectadas
        );
    }

    public async Task<byte[]> GenerarExportacionDefectoObdExcelAsync(
        FiltrosDefectoObdRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeDefectoObdAsync(filtros, cancellationToken);

        using var workbook = new XLWorkbook();

        // Agrupar filas por estación para replicar 1:1 la estructura de frmCriterios.vb (DEFECTOS_OBD_XXXX)
        var grupos = informe.Filas
            .GroupBy(f => f.CodEstacion)
            .OrderBy(g => g.Key)
            .ToList();

        if (grupos.Count == 0)
        {
            var wsVacia = workbook.Worksheets.Add("DEFECTOS_OBD");
            EscribirCabecerasHoja(wsVacia);
        }
        else
        {
            foreach (var grupo in grupos)
            {
                var nombreHoja = $"DEFECTOS_OBD_{grupo.Key}";
                if (nombreHoja.Length > 31)
                {
                    nombreHoja = nombreHoja.Substring(0, 31);
                }

                var ws = workbook.Worksheets.Add(nombreHoja);
                EscribirCabecerasHoja(ws);

                int filaIdx = 2;
                foreach (var f in grupo)
                {
                    ws.Cell(filaIdx, 1).SetValue(f.CodInspeccion);
                    ws.Cell(filaIdx, 2).SetValue(f.Matricula);
                    ws.Cell(filaIdx, 3).SetValue(f.FechaInspeccionFormatted);
                    ws.Cell(filaIdx, 4).SetValue(f.Marca);
                    ws.Cell(filaIdx, 5).SetValue(f.Modelo);
                    ws.Cell(filaIdx, 6).SetValue(f.TipoMotor);
                    ws.Cell(filaIdx, 7).SetValue(f.TipoVehiculo);
                    ws.Cell(filaIdx, 8).SetValue(f.CHomologacion ?? "");
                    ws.Cell(filaIdx, 9).SetValue(f.Clasificacion);
                    if (f.Mma.HasValue) ws.Cell(filaIdx, 10).SetValue(f.Mma.Value);
                    else ws.Cell(filaIdx, 10).SetValue("");
                    ws.Cell(filaIdx, 11).SetValue(f.Kilometraje ?? "");
                    ws.Cell(filaIdx, 12).SetValue(f.TipoInspeccion);
                    ws.Cell(filaIdx, 13).SetValue(f.Resultado);
                    ws.Cell(filaIdx, 14).SetValue(f.Fase);
                    ws.Cell(filaIdx, 15).SetValue(f.DesNivelEmisiones);
                    ws.Cell(filaIdx, 16).SetValue(f.Bloque);
                    ws.Cell(filaIdx, 17).SetValue(f.Defecto);
                    ws.Cell(filaIdx, 18).SetValue(f.Subdefecto);
                    ws.Cell(filaIdx, 19).SetValue(f.Numero);
                    ws.Cell(filaIdx, 20).SetValue(f.DesEstacion);
                    ws.Cell(filaIdx, 21).SetValue(f.CodEstacion);
                    ws.Cell(filaIdx, 22).SetValue(f.ClaveSociedad);
                    ws.Cell(filaIdx, 23).SetValue(f.DescripcionDefecto);
                    ws.Cell(filaIdx, 24).SetValue(f.GravedadDefecto);
                    filaIdx++;
                }

                ws.Columns().AdjustToContents(1, 45);
            }
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static void EscribirCabecerasHoja(IXLWorksheet ws)
    {
        string[] cabeceras =
        [
            "COD_INSPECCION", "MATRICULA", "FECHA_INSPECCION", "MARCA", "MODELO",
            "TIPO_MOTOR", "TIPO_VEHICULO", "CHOMOLOGACION", "CLASIFICACION", "MMA",
            "KILOMETRAJE", "TIPO_INSPECCION", "RESULTADO", "FASE", "DESNIVEL_EMISIONES",
            "BLOQUE", "DEFECTO", "SUBDEFECTO", "NUMERO", "ESTACION",
            "COD_ESTACION", "SOCIEDAD", "DESCRIPCION_DEFECTO", "GRAVEDAD"
        ];

        for (int c = 0; c < cabeceras.Length; c++)
        {
            var celda = ws.Cell(1, c + 1);
            celda.SetValue(cabeceras[c]);
            celda.Style.Font.Bold = true;
            celda.Style.Fill.BackgroundColor = XLColor.FromHtml("#F1F5F9");
            celda.Style.Border.BottomBorder = XLBorderStyleValues.Thin;
            celda.Style.Border.BottomBorderColor = XLColor.FromHtml("#CBD5E1");
        }
    }

    public async Task<byte[]> GenerarExportacionDefectoObdCsvAsync(
        FiltrosDefectoObdRequestDto filtros,
        CancellationToken cancellationToken = default)
    {
        var informe = await GenerarInformeDefectoObdAsync(filtros, cancellationToken);

        var sb = new StringBuilder();
        // Cabecera estructurada oficial que replica los campos del Excel original (frmCriterios.vb)
        // con la inclusión enriquecida de estación, sociedad y descripción reglamentaria de defecto.
        sb.AppendLine("COD_INSPECCION;MATRICULA;FECHA_INSPECCION;MARCA;MODELO;TIPO_MOTOR;TIPO_VEHICULO;CHOMOLOGACION;CLASIFICACION;MMA;KILOMETRAJE;TIPO_INSPECCION;RESULTADO;FASE;DESNIVEL_EMISIONES;BLOQUE;DEFECTO;SUBDEFECTO;NUMERO;ESTACION;COD_ESTACION;SOCIEDAD;DESCRIPCION_DEFECTO;GRAVEDAD");

        foreach (var f in informe.Filas)
        {
            sb.Append(EscaparCsv(f.CodInspeccion)).Append(';');
            sb.Append(EscaparCsv(f.Matricula)).Append(';');
            sb.Append(EscaparCsv(f.FechaInspeccionFormatted)).Append(';');
            sb.Append(EscaparCsv(f.Marca)).Append(';');
            sb.Append(EscaparCsv(f.Modelo)).Append(';');
            sb.Append(EscaparCsv(f.TipoMotor)).Append(';');
            sb.Append(EscaparCsv(f.TipoVehiculo)).Append(';');
            sb.Append(EscaparCsv(f.CHomologacion ?? "")).Append(';');
            sb.Append(EscaparCsv(f.Clasificacion)).Append(';');
            sb.Append(f.Mma?.ToString() ?? "").Append(';');
            sb.Append(EscaparCsv(f.Kilometraje ?? "")).Append(';');
            sb.Append(EscaparCsv(f.TipoInspeccion)).Append(';');
            sb.Append(EscaparCsv(f.Resultado)).Append(';');
            sb.Append(EscaparCsv(f.Fase)).Append(';');
            sb.Append(EscaparCsv(f.DesNivelEmisiones)).Append(';');
            sb.Append(EscaparCsv(f.Bloque)).Append(';');
            sb.Append(EscaparCsv(f.Defecto)).Append(';');
            sb.Append(EscaparCsv(f.Subdefecto)).Append(';');
            sb.Append(EscaparCsv(f.Numero)).Append(';');
            sb.Append(EscaparCsv(f.DesEstacion)).Append(';');
            sb.Append(EscaparCsv(f.CodEstacion)).Append(';');
            sb.Append(EscaparCsv(f.ClaveSociedad)).Append(';');
            sb.Append(EscaparCsv(f.DescripcionDefecto)).Append(';');
            sb.AppendLine(EscaparCsv(f.GravedadDefecto));
        }

        // BOM UTF-8 para garantizar que Excel interprete correctamente acentos y caracteres españoles
        var preamble = Encoding.UTF8.GetPreamble();
        var contentBytes = Encoding.UTF8.GetBytes(sb.ToString());
        var result = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, result, preamble.Length, contentBytes.Length);

        return result;
    }

    private static (DateTime FechaInicio, DateTime FechaFin) ParsearYValidarFechas(DateTime inicio, DateTime fin)
    {
        var fInicio = inicio.Date;
        var fFin = fin.Date.AddHours(23).AddMinutes(59).AddSeconds(59);

        if (fFin < fInicio)
        {
            throw new ArgumentException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        if ((fFin - fInicio).TotalDays > 366)
        {
            throw new ArgumentException("El rango de fechas consultado no puede superar 366 días (1 año).");
        }

        return (fInicio, fFin);
    }

    private static string CalcularPct(int parcial, int total)
    {
        if (total <= 0) return "0.0";
        return ((decimal)parcial / total * 100m).ToString("F1", CultureEs);
    }

    private static string EscaparCsv(string valor)
    {
        if (string.IsNullOrEmpty(valor)) return string.Empty;
        if (valor.Contains(';') || valor.Contains('"') || valor.Contains('\n') || valor.Contains('\r'))
        {
            return $"\"{valor.Replace("\"", "\"\"")}\"";
        }
        return valor;
    }
}
