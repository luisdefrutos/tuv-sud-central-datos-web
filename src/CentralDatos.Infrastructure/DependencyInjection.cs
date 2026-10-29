using CentralDatos.Application.Features.Estaciones.Interfaces;
using CentralDatos.Infrastructure.Persistence.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace CentralDatos.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Repositorios de Persistencia (Oracle / Fallback SOAP)
        services.AddScoped<IEstacionesRepository, OracleEstacionesRepository>();

        return services;
    }
}
