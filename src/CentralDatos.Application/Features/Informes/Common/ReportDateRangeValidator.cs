namespace CentralDatos.Application.Features.Informes.Common;

/// <summary>
/// Validador centralizado de rangos de fechas para todos los informes de Central Datos.
/// Aplica el Estándar Oficial de Informes:
/// - Fecha de fin con límite horario hasta las 23:59:59.
/// - Control de orden cronológico (fin &gt;= inicio).
/// - Límite estricto de máximo 366 días (1 año natural / bisiesto) para protección de Oracle y optimización de índices.
/// </summary>
public static class ReportDateRangeValidator
{
    public static (DateTime FechaInicio, DateTime FechaFin) Validar(DateTime inicio, DateTime fin, int maxDias = 366)
    {
        var fInicio = inicio.Date;
        var fFin = fin.Date.AddHours(23).AddMinutes(59).AddSeconds(59);

        if (fFin < fInicio)
        {
            throw new ArgumentException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        if ((fFin - fInicio).TotalDays > maxDias)
        {
            throw new ArgumentException($"El rango de fechas consultado no puede superar {maxDias} días (1 año) para optimizar el rendimiento del servidor.");
        }

        return (fInicio, fFin);
    }
}

