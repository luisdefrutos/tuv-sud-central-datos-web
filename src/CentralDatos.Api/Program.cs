using CentralDatos.Api.Endpoints.Estaciones;
using CentralDatos.Api.Endpoints.Health;
using CentralDatos.Api.Extensions;
using CentralDatos.Application;
using CentralDatos.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Servicios del sistema y OpenAPI
builder.Services.AddOpenApi();
builder.Services.AddCorsPolicy();

// Inyección de dependencias Clean Architecture
builder.Services.AddApplication();
builder.Services.AddInfrastructure();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Genera el documento OpenAPI en /openapi/v1.json
    app.MapOpenApi();

    // Interfaz interactiva Swagger UI en /swagger
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "TÜV SÜD Central Datos API v1");
        options.RoutePrefix = "swagger";
    });

    // Interfaz interactiva moderna Scalar en /scalar/v1
    app.MapScalarApiReference();

    app.UseCors(CorsExtensions.PolicyName);
}

app.UseHttpsRedirection();

// Redirección de la raíz del API hacia Swagger UI
app.MapGet("/", () => Results.Redirect("/swagger"));

// Registro modular de Endpoints desacoplados por características
app.MapHealthEndpoints();
app.MapEstacionesEndpoints();

app.Run();
