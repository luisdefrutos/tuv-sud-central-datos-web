namespace CentralDatos.Domain.Entities.Audit;

/// <summary>
/// Registro de auditoría de actividad y navegación en Central Datos Web.
/// </summary>
public sealed class AuditLogEntry
{
    public long IdLog { get; set; }
    public DateTime TimestampUtc { get; set; } = DateTime.UtcNow;
    public int? IdEmpleado { get; set; }
    public required string Username { get; set; }
    public required string Role { get; set; }
    public required string Action { get; set; }
    public string? MenuRoute { get; set; }
    public string? CodEstacion { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public long? DurationMs { get; set; }
    public string? Details { get; set; }
}

