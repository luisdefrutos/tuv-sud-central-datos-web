namespace CentralDatos.Api.Extensions;

public static class CorsExtensions
{
    public const string PolicyName = "FrontendDev";

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
    {
        return services.AddCors(options =>
        {
            options.AddPolicy(PolicyName, policy =>
                policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                      .AllowAnyHeader()
                      .AllowAnyMethod());
        });
    }
}

