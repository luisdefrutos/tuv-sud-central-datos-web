using System.Collections.Concurrent;
using System.Reflection;

namespace CentralDatos.Infrastructure.Persistence.Sql;

public interface ISqlLoader
{
    string GetQuery(string queryName);
}

public class SqlLoader : ISqlLoader
{
    private static readonly ConcurrentDictionary<string, string> Cache = new();
    private static readonly Assembly Assembly = typeof(SqlLoader).Assembly;

    public string GetQuery(string queryName)
    {
        return Cache.GetOrAdd(queryName, name =>
        {
            var resourceName = Assembly.GetManifestResourceNames()
                .FirstOrDefault(r => r.EndsWith($"{name}.sql", StringComparison.OrdinalIgnoreCase) ||
                                     r.EndsWith(name, StringComparison.OrdinalIgnoreCase));

            if (resourceName == null)
            {
                var disponibles = string.Join(", ", Assembly.GetManifestResourceNames());
                throw new FileNotFoundException($"No se encontró la consulta SQL embebida '{name}'. Recursos disponibles: {disponibles}");
            }

            using var stream = Assembly.GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException($"No se pudo abrir el recurso '{resourceName}'.");
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd().Trim();
        });
    }
}

