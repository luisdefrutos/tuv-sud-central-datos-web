namespace CentralDatos.Api.Endpoints.Health;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/health")
                       .WithTags("Salud del Sistema");

        group.MapGet("/", () => Results.Ok(new
        {
            Service = "TUV SUD Central Datos API",
            Version = "1.0.0-poc",
            Status = "Healthy",
            TimestampUtc = DateTimeOffset.UtcNow
        }))
        .WithName("GetHealthStatus")
        .WithSummary("Verifica el estado de salud y disponibilidad del API");

        return app;
    }
}

