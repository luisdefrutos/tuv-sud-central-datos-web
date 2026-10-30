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
        .WithName("ExportarFacturacionExcel")
        .WithSummary("Genera y descarga el fichero estructurado de facturación con BOM UTF-8 y separador para Excel");

        return app;
    }
}

