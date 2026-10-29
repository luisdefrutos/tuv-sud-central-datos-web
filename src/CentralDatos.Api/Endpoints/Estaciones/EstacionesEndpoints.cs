using CentralDatos.Application.Features.Estaciones.Services;

namespace CentralDatos.Api.Endpoints.Estaciones;

public static class EstacionesEndpoints
{
    public static IEndpointRouteBuilder MapEstacionesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/estaciones")
                       .WithTags("Estaciones ITV");

        group.MapGet("/ultimos-datos", async (EstacionesService service, CancellationToken ct) =>
        {
            var resumen = await service.ObtenerResumenUltimosDatosAsync(ct);
            return Results.Ok(resumen);
        })
        .WithName("GetUltimosDatosEstaciones")
        .WithSummary("Consulta el estado y último dato de inspección centralizado por estación");

        return app;
    }
}

