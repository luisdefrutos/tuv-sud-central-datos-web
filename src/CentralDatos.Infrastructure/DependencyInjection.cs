using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Application.Features.Estaciones.Interfaces;
using CentralDatos.Infrastructure.Configuration;
using CentralDatos.Infrastructure.Persistence.Repositories;
using CentralDatos.Infrastructure.Persistence.Sql;
using CentralDatos.Infrastructure.Services.Auth;
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

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));

        // HttpClient para WebService SOAP de Login
        services.AddHttpClient<ISoapLoginClient, SoapLoginClient>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        // Cargador de consultas SQL embebidas y cacheadas
        services.AddSingleton<ISqlLoader, SqlLoader>();

        // Generador de tokens JWT
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();

        // Repositorios de Persistencia
        services.AddScoped<IEstacionesRepository, OracleEstacionesRepository>();
        services.AddScoped<IAuthRepository, OracleAuthRepository>();
        services.AddScoped<IAuditRepository, OracleAuditRepository>();

        return services;
    }
}
