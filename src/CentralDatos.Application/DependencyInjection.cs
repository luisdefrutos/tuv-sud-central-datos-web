using CentralDatos.Application.Features.Auth.Interfaces;
using CentralDatos.Application.Features.Auth.Services;
using CentralDatos.Application.Features.Estaciones.Services;
using CentralDatos.Application.Features.Informes.Interfaces;
using CentralDatos.Application.Features.Informes.Services;
using Microsoft.Extensions.DependencyInjection;

namespace CentralDatos.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Servicios de Características / Casos de Uso
        services.AddScoped<EstacionesService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IInformesFacturacionService, InformesFacturacionService>();
        services.AddScoped<IInformesNumeroInspeccionesService, InformesNumeroInspeccionesService>();
        services.AddScoped<IInformesDuracionPromedioService, InformesDuracionPromedioService>();

        return services;
    }
}
