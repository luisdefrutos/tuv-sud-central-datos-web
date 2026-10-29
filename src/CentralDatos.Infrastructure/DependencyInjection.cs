using CentralDatos.Application.Features.Estaciones.Interfaces;
using CentralDatos.Infrastructure.Configuration;
using CentralDatos.Infrastructure.Persistence.Repositories;
using CentralDatos.Infrastructure.Persistence.Sql;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CentralDatos.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Patrón Options de .NET para centralizar la configuración sin hardcodeos en constructores
        services.Configure<CentralItvOptions>(options =>
        {
            configuration.GetSection(CentralItvOptions.SectionName).Bind(options);
            options.ConnectionString = configuration.GetConnectionString("CentralItv") ?? string.Empty;
        });

        // Cargador de consultas SQL embebidas y cacheadas
        services.AddSingleton<ISqlLoader, SqlLoader>();

        // Repositorios de Persistencia (Dapper ODP.NET Thin / Fallback SOAP)
        services.AddScoped<IEstacionesRepository, OracleEstacionesRepository>();

        return services;
    }
}
