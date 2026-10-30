namespace CentralDatos.Api.Endpoints.Health;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/health")
                       .WithTags("Salud del Sistema");

        group.MapGet("/", (IConfiguration config) =>
        {
            var connStr = config.GetConnectionString("CentralItv") ?? string.Empty;

            // Detectar si la conexión activa apunta al host de Desarrollo (10.108.206.7)
            bool esDesarrollo = connStr.Contains("10.108.206.7", StringComparison.OrdinalIgnoreCase) ||
                                connStr.Contains("ORCLDV", StringComparison.OrdinalIgnoreCase);

            string entorno = esDesarrollo ? "DESARROLLO" : "PRODUCCION";

            // En producción NO se expone información interna, IPs ni datos de infraestructura
            string? dbHost = esDesarrollo ? "10.108.206.7 (ORCLDV)" : null;
            string? infoTitle = esDesarrollo ? "Entorno de Desarrollo (10.108.206.7 / ORCLDV)" : null;

            return Results.Ok(new
            {
                Service = "TUV SUD Central Datos API",
                Version = "1.0.0-poc",
                Status = "Healthy",
                TimestampUtc = DateTimeOffset.UtcNow,
                Entorno = entorno,
                EsDesarrollo = esDesarrollo,
                DbHost = dbHost,
                InfoTitle = infoTitle
            });
        })
        .WithName("GetHealthStatus")
        .WithSummary("Verifica el estado de salud y disponibilidad del API con información de entorno");

        return app;
    }
}

