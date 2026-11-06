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

        // 11. Consulta de inspecciones con cupón descuento
        group.MapPost("/cupon-descuento/consultar", async (
            [FromBody] FiltrosCuponDescuentoRequestDto filtros,
            [FromServices] IInformesCuponDescuentoService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeCuponDescuentoAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarCuponDescuento")
        .WithSummary("Consulta el listado y métricas analíticas de inspecciones realizadas con cupón de descuento");

        // 12. Exportación de inspecciones con cupón descuento a Excel (.xlsx multi-hoja por estación CUPONES_DTO_ITV_XXXX)
        group.MapPost("/cupon-descuento/exportar-excel", async (
            [FromBody] FiltrosCuponDescuentoRequestDto filtros,
            [FromServices] IInformesCuponDescuentoService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionCuponDescuentoExcelAsync(filtros, ct);
                var nombreFichero = $"inspecciones-cupon-descuento-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";

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
        .WithName("ExportarCuponDescuentoExcel")
        .WithSummary("Genera y descarga el libro Excel oficial (.xlsx) de inspecciones con cupón descuento con pestañas individuales por estación CUPONES_DTO_ITV_XXXX");

        // 13. Consulta de facturación comparativa (TSA / CAL)
        group.MapPost("/facturacion-comparativa/consultar", async (
            [FromBody] FiltrosFacturacionComparativaRequestDto filtros,
            [FromServices] IInformesFacturacionComparativaService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeFacturacionComparativaAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarFacturacionComparativa")
        .WithSummary("Consulta comparativa de facturación e inspecciones entre dos periodos por estación (TSA / CAL)");

        // 14. Exportación de facturación comparativa a Excel oficial (.xlsx)
        group.MapPost("/facturacion-comparativa/exportar-excel", async (
            [FromBody] FiltrosFacturacionComparativaRequestDto filtros,
            [FromServices] IInformesFacturacionComparativaService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExportacionFacturacionComparativaExcelAsync(filtros, ct);
                var nombreFichero = $"informe-facturacion-comparativa-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarFacturacionComparativaExcel")
        .WithSummary("Genera y descarga el libro Excel comparativo oficial de facturación e inspecciones");

        // 15. Consulta de estadística MINER global
        group.MapPost("/miner-global/consultar", async (
            [FromBody] FiltrosMinerRequestDto filtros,
            [FromServices] IInformesMinerService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.ConsultarEstadisticaMinerAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarMinerGlobal")
        .WithSummary("Consulta el informe regulatorio MINER global de defectos e inspecciones por categoría de vehículo");

        // 16. Exportación de estadística MINER global a Excel oficial (.xlsx sobre plantilla Industria.xls)
        group.MapPost("/miner-global/exportar-excel", async (
            [FromBody] FiltrosMinerRequestDto filtros,
            [FromServices] IInformesMinerService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.ExportarExcelMinerAsync(filtros, ct);
                var nombreFichero = $"estadistica-miner-global-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarMinerGlobalExcel")
        .WithSummary("Genera y descarga el libro Excel oficial de MINER (plantilla Industria.xls) con las 9 categorías");

        // 17. Consulta de bastidores OBD no coincidentes
        group.MapPost("/bastidores-obd-no-coincidentes/consultar", async (
            [FromBody] FiltrosBastidoresObdRequestDto filtros,
            [FromServices] IInformesBastidoresObdService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeBastidoresObdAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarBastidoresObdNoCoincidentes")
        .WithSummary("Consulta el informe de bastidores de inspección que no coinciden con la lectura electrónica OBD");

        // 18. Exportación de bastidores OBD no coincidentes a Excel (.xlsx)
        group.MapPost("/bastidores-obd-no-coincidentes/exportar-excel", async (
            [FromBody] FiltrosBastidoresObdRequestDto filtros,
            [FromServices] IInformesBastidoresObdService service,
            CancellationToken ct) =>
        {
            try
            {
                var (archivoBytes, nombreFichero, contentType) = await service.ExportarExcelAsync(filtros, ct);

                return Results.File(
                    archivoBytes,
                    contentType: contentType,
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarBastidoresObdNoCoincidentesExcel")
        .WithSummary("Genera y descarga el libro Excel oficial de bastidores OBD no coincidentes");

        // 19. Consulta de inspecciones por rango horario (PIVOT 06 a 21 h + Heatmap)
        group.MapPost("/inspecciones-rango-horario", async (
            [FromBody] InspRangoHorarioFiltroDto filtros,
            [FromServices] IInformesInspRangoHorarioService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.ObtenerInformeAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarInspeccionesRangoHorario")
        .WithSummary("Consulta el informe de afluencia de inspecciones por franja horaria (06 a 21 h) y matriz de calor");

        // 20. Exportación de inspecciones por rango horario a Excel (.xlsx multi-pestaña)
        group.MapPost("/inspecciones-rango-horario/exportar-excel", async (
            [FromBody] InspRangoHorarioFiltroDto filtros,
            [FromServices] IInformesInspRangoHorarioService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.GenerarExcelAsync(filtros, ct);
                var nombreFichero = $"Inspecciones_Rango_Horario_{filtros.FechaInicio:yyyyMMdd}_{filtros.FechaFin:yyyyMMdd}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarInspeccionesRangoHorarioExcel")
        .WithSummary("Genera y descarga el libro Excel oficial de inspecciones por rango horario");

        // 21. Consulta de volumen de defectos detectados por categoría y gravedad
        group.MapPost("/volumen-defectos", async (
            [FromBody] VolumenDefectosFiltroDto filtros,
            [FromServices] IInformesVolumenDefectosService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.ObtenerInformeAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarVolumenDefectos")
        .WithSummary("Consulta el volumen de defectos detectados por grupo de categoría de vehículo y gravedad");

        // 22. Exportación de volumen de defectos a Excel (.xlsx multi-pestaña)
        group.MapPost("/volumen-defectos/exportar-excel", async (
            [FromBody] VolumenDefectosFiltroDto filtros,
            [FromServices] IInformesVolumenDefectosService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.ExportarExcelAsync(filtros, ct);
                var nombreFichero = $"Volumen_Defectos_{filtros.FechaInicio:yyyyMMdd}_{filtros.FechaFin:yyyyMMdd}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarVolumenDefectosExcel")
        .WithSummary("Genera y descarga el libro Excel oficial de volumen de defectos detectados");

        // 23. Catálogo de bloques de defectos
        group.MapGet("/volumen-defectos/bloques", async (
            [FromServices] IInformesVolumenDefectosService service,
            CancellationToken ct) =>
        {
            var bloques = await service.ObtenerBloquesAsync(ct);
            return Results.Ok(bloques);
        })
        .WithName("ObtenerBloquesDefectos")
        .WithSummary("Obtiene el listado de capítulos o bloques del catálogo de defectos");

        // 24. Catálogo de elementos / defectos por bloque
        group.MapGet("/volumen-defectos/elementos/{bloque}", async (
            string bloque,
            [FromServices] IInformesVolumenDefectosService service,
            CancellationToken ct) =>
        {
            var elementos = await service.ObtenerElementosAsync(bloque, ct);
            return Results.Ok(elementos);
        })
        .WithName("ObtenerElementosDefectos")
        .WithSummary("Obtiene los defectos de un bloque específico");

        // 25. Consulta analítica de clientes por volumen de inspecciones (grandes cuentas / flotas)
        group.MapPost("/clientes-volumen/consultar", async (
            [FromBody] ClientesVolumenFiltroDto filtros,
            [FromServices] IInformesClientesVolumenService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.GenerarInformeClientesVolumenAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarClientesVolumen")
        .WithSummary("Consulta el volumen de inspecciones por cliente/titular con umbral mínimo, proyectos comerciales y categorías MINER");

        // 26. Exportación oficial a Excel de clientes por volumen (.xlsx multi-pestaña)
        group.MapPost("/clientes-volumen/exportar-excel", async (
            [FromBody] ClientesVolumenFiltroDto filtros,
            [FromServices] IInformesClientesVolumenService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.ExportarExcelAsync(filtros, ct);
                var nombreFichero = $"Clientes_Volumen_{filtros.FechaInicio:yyyyMMdd}_{filtros.FechaFin:yyyyMMdd}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarClientesVolumenExcel")
        .WithSummary("Genera y descarga el libro Excel oficial de clientes por volumen de inspecciones");

        // 27. Catálogo de proyectos comerciales activos
        group.MapGet("/clientes-volumen/proyectos-comerciales", async (
            [FromServices] IInformesClientesVolumenService service,
            CancellationToken ct) =>
        {
            var proyectos = await service.ObtenerProyectosComercialesAsync(ct);
            return Results.Ok(proyectos);
        })
        .WithName("ObtenerProyectosComerciales")
        .WithSummary("Obtiene el listado de proyectos comerciales activos para filtrado de clientes");

        // 28. Catálogo de tipos de vehículo (clasificación MINER)
        group.MapGet("/clientes-volumen/tipos-vehiculo", async (
            [FromServices] IInformesClientesVolumenService service,
            CancellationToken ct) =>
        {
            var tipos = await service.ObtenerTiposVehiculoMinerAsync(ct);
            return Results.Ok(tipos);
        })
        .WithName("ObtenerTiposVehiculoMiner")
        .WithSummary("Obtiene las 9 categorías oficiales MINER de tipos de vehículo");

        // 29. Catálogo de plantillas de texto de recordatorios (SMS / Email)
        group.MapGet("/envios-recordatorios/plantillas", async (
            [FromServices] IInformesEnviosRecordatoriosService service,
            CancellationToken ct) =>
        {
            var plantillas = await service.ObtenerPlantillasAsync(ct);
            return Results.Ok(plantillas);
        })
        .WithName("ObtenerPlantillasEnviosRecordatorios")
        .WithSummary("Obtiene el catálogo oficial de plantillas de SMS y Email de recordatorio");

        // 30. Consulta analítica de envíos de recordatorios (SMS / Email)
        group.MapPost("/envios-recordatorios/consultar", async (
            [FromBody] FiltrosEnviosRecordatoriosRequestDto filtros,
            [FromServices] IInformesEnviosRecordatoriosService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.ConsultarEnviosRecordatoriosAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarEnviosRecordatorios")
        .WithSummary("Consulta resumen agrupado y detalle individual de envíos de recordatorios SMS y Email");

        // 31. Exportación oficial multi-hoja a Excel de envíos de recordatorios
        group.MapPost("/envios-recordatorios/exportar-excel", async (
            [FromBody] FiltrosEnviosRecordatoriosRequestDto filtros,
            [FromServices] IInformesEnviosRecordatoriosService service,
            CancellationToken ct) =>
        {
            try
            {
                var archivoBytes = await service.ExportarExcelAsync(filtros, ct);
                var nombreFichero = $"Envios_Recordatorios_{filtros.FechaInicio:yyyyMMdd}_{filtros.FechaFin:yyyyMMdd}.xlsx";

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarEnviosRecordatoriosExcel")
        .WithSummary("Genera y descarga el libro Excel multi-pestaña (RESUMEN_GLOBAL, ENVIOS_SMS, ENVIOS_EMAIL) de recordatorios");

        // 32. Catálogos y columnas dinámicas para los 4 módulos de Localización (Inspecciones, Defectos, Elementos, Mediciones)
        group.MapGet("/localizacion/catalogos/{tipo}", async (
            string tipo,
            [FromServices] IInformesLocalizacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var catalogos = await service.ObtenerCatalogosAsync(tipo, ct);
                return Results.Ok(catalogos);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
        })
        .WithName("ObtenerCatalogosLocalizacion")
        .WithSummary("Obtiene las columnas dinámicas (CAMPOS_*LOCALIZADOS) y combos maestros para el módulo de localización indicado");

        // 33. Combos en cascada de Localización: Bloques por sección manual
        group.MapGet("/localizacion/bloques", async (
            [FromQuery] string? seccionManual,
            [FromServices] IInformesLocalizacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var bloques = await service.ObtenerBloquesPorSeccionAsync(seccionManual, ct);
                return Results.Ok(bloques);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
        })
        .WithName("ObtenerBloquesLocalizacion")
        .WithSummary("Obtiene los bloques del manual de inspección filtrados opcionalmente por sección");

        // 34. Combos en cascada de Localización: Elementos/Defectos por bloque y sección
        group.MapGet("/localizacion/elementos/{bloque}", async (
            string bloque,
            [FromQuery] string? seccionManual,
            [FromServices] IInformesLocalizacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var elementos = await service.ObtenerElementosPorBloqueAsync(bloque, seccionManual, ct);
                return Results.Ok(elementos);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
        })
        .WithName("ObtenerElementosLocalizacion")
        .WithSummary("Obtiene los puntos/elementos de un bloque específico");

        // 35. Combos en cascada de Localización: Subdefectos y números por bloque y defecto
        group.MapGet("/localizacion/subdefectos/{bloque}/{defecto}", async (
            string bloque,
            string defecto,
            [FromQuery] string? seccionManual,
            [FromServices] IInformesLocalizacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var subdefectos = await service.ObtenerSubdefectosAsync(bloque, defecto, seccionManual, ct);
                return Results.Ok(subdefectos);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
        })
        .WithName("ObtenerSubdefectosLocalizacion")
        .WithSummary("Obtiene los subdefectos y números de un bloque y elemento específicos");

        // 36. Consulta dinámica de Localización (Inspecciones, Defectos, Elementos, Mediciones)
        group.MapPost("/localizacion/consultar", async (
            [FromBody] FiltrosLocalizacionRequestDto filtros,
            [FromServices] IInformesLocalizacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var resultado = await service.ConsultarLocalizacionAsync(filtros, ct);
                return Results.Ok(resultado);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .WithName("ConsultarLocalizacion")
        .WithSummary("Ejecuta la búsqueda dinámica de localización con selección de columnas y criterios avanzados");

        // 37. Exportación oficial a Excel de Localización (con pie de filtros aplicados fiel a escritorio)
        group.MapPost("/localizacion/exportar-excel", async (
            [FromBody] FiltrosLocalizacionRequestDto filtros,
            [FromServices] IInformesLocalizacionService service,
            CancellationToken ct) =>
        {
            try
            {
                var (archivoBytes, nombreFichero) = await service.ExportarExcelAsync(filtros, ct);

                return Results.File(
                    archivoBytes,
                    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileDownloadName: nombreFichero);
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { errorMessage = ex.Message });
            }
        })
        .RequireRateLimiting("excel-export-policy")
        .WithName("ExportarLocalizacionExcel")
        .WithSummary("Genera y descarga el libro Excel oficial de localización con las columnas activas y resumen de filtros aplicados");

        return app;
    }
}
