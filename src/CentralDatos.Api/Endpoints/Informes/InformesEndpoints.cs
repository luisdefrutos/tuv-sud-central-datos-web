using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CentralDatos.Api.Endpoints.Informes;

public static class InformesEndpoints
{
    public static IEndpointRouteBuilder MapInformesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/informes")
                       .WithTags("Informes y Estadísticas");

        // 1. Consulta analítica centralizada de facturación (Dashboard + Grid)
        group.MapPost("/facturacion/consultar", async (
            [FromBody] FiltrosFacturacionRequestDto filtros,
            [FromServices] IInformesFacturacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeFacturacionAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarFacturacion")
        .WithSummary("Consulta agregada de facturación e inspecciones por estación con KPIs y gráfico pre-calculados");

        // 2. Exportación oficial a fichero Excel/CSV compatible con hojas de cálculo
        group.MapPost("/facturacion/exportar-excel", async (
            [FromBody] FiltrosFacturacionRequestDto filtros,
            [FromServices] IInformesFacturacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionFacturacionCsvAsync(filtros, ct);
                var nombreFichero = $"facturacion-inspecciones-{DateTime.Now:yyyyMMdd-HHmm}.csv";

                return Results.File(
                    archivoBytes,
                    contentType: "text/csv; charset=utf-8",
                    fileDownloadName: nombreFichero);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarFacturacionExcel")
        .WithSummary("Genera y descarga el fichero estructurado de facturación con BOM UTF-8 y separador para Excel");

        // 3. Consulta analítica de número de inspecciones (Favorables y Rechazadas por Fase)
        group.MapPost("/numero-inspecciones/consultar", async (
            [FromBody] FiltrosNumeroInspeccionesRequestDto filtros,
            [FromServices] IInformesNumeroInspeccionesService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeNumeroInspeccionesAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarNumeroInspecciones")
        .WithSummary("Consulta el número de inspecciones favorables y rechazadas desglosadas por Fase 1 y Fase 2 con KPIs");

        // 4. Exportación de número de inspecciones a Excel / CSV
        group.MapPost("/numero-inspecciones/exportar-excel", async (
            [FromBody] FiltrosNumeroInspeccionesRequestDto filtros,
            [FromServices] IInformesNumeroInspeccionesService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionNumeroInspeccionesCsvAsync(filtros, ct);
                var nombreFichero = $"numero-inspecciones-{DateTime.Now:yyyyMMdd-HHmm}.csv";

                return Results.File(
                    archivoBytes,
                    contentType: "text/csv; charset=utf-8",
                    fileDownloadName: nombreFichero);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarNumeroInspeccionesExcel")
        .WithSummary("Genera y descarga el fichero estructurado de número de inspecciones con BOM UTF-8 y separador para Excel");

        // 5. Consulta analítica de duración promedio de periódicas 001
        group.MapPost("/duracion-promedio/consultar", async (
            [FromBody] FiltrosDuracionPromedioRequestDto filtros,
            [FromServices] IInformesDuracionPromedioService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeDuracionPromedioAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarDuracionPromedio")
        .WithSummary("Consulta la duración promedio de inspecciones periódicas (001) desglosadas por tipo de vehículo y estación");

        // 6. Exportación de duración promedio a Excel / CSV
        group.MapPost("/duracion-promedio/exportar-excel", async (
            [FromBody] FiltrosDuracionPromedioRequestDto filtros,
            [FromServices] IInformesDuracionPromedioService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionDuracionPromedioCsvAsync(filtros, ct);
                var nombreFichero = $"duracion-promedio-{DateTime.Now:yyyyMMdd-HHmm}.csv";

                return Results.File(
                    archivoBytes,
                    contentType: "text/csv; charset=utf-8",
                    fileDownloadName: nombreFichero);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarDuracionPromedioExcel")
        .WithSummary("Genera y descarga el fichero estructurado de duración promedio con BOM UTF-8 y separador para Excel");

        // 7. Consulta analítica de inspecciones con defectos OBD (Bloque 15)
        group.MapPost("/defecto-obd/consultar", async (
            [FromBody] FiltrosDefectoObdRequestDto filtros,
            [FromServices] IInformesDefectoObdService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeDefectoObdAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarDefectoObd")
        .WithSummary("Consulta el listado y métricas de inspecciones con anomalías o defectos OBD (Bloque 15)");

        // 8. Exportación oficial de defectos OBD a Excel (.xlsx multi-hoja por estación DEFECTOS_OBD_XXXX)
        group.MapPost("/defecto-obd/exportar-excel", async (
            [FromBody] FiltrosDefectoObdRequestDto filtros,
            [FromServices] IInformesDefectoObdService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionDefectoObdExcelAsync(filtros, ct);
                var nombreFichero = $"defectos-obd-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarDefectoObdExcel")
        .WithSummary("Genera y descarga el libro Excel oficial (.xlsx) con pestañas individuales por cada estación DEFECTOS_OBD_XXXX");

                // 9. Consulta de inspecciones sin inspector
        group.MapPost("/sin-inspector/consultar", async (
            [FromBody] FiltrosSinInspectorRequestDto filtros,
            [FromServices] IInformesSinInspectorService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeSinInspectorAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarSinInspector")
        .WithSummary("Consulta el listado y métricas de inspecciones realizadas sin inspector asignado");

        // 10. Exportación de inspecciones sin inspector a Excel (.xlsx multi-hoja por estación SIN_INSPECTOR_XXXX)
        group.MapPost("/sin-inspector/exportar-excel", async (
            [FromBody] FiltrosSinInspectorRequestDto filtros,
            [FromServices] IInformesSinInspectorService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionSinInspectorExcelAsync(filtros, ct);
                var nombreFichero = $"inspecciones-sin-inspector-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarSinInspectorExcel")
        .WithSummary("Genera y descarga el libro Excel oficial (.xlsx) de inspecciones sin inspector con pestañas individuales por estación");

        return app;
    }
}
