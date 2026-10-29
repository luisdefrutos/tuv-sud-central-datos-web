using CentralDatos.Application.Features.Estaciones.Services;
using Microsoft.Extensions.DependencyInjection;

namespace CentralDatos.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Servicios de Características / Casos de Uso
        services.AddScoped<EstacionesService>();

        return services;
    }
}
