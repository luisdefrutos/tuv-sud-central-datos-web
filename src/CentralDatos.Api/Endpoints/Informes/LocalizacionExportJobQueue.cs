using System.Collections.Concurrent;
using System.Security.Claims;
using System.Threading.Channels;
using CentralDatos.Application.Features.Informes.DTOs;
using CentralDatos.Application.Features.Informes.Interfaces;

namespace CentralDatos.Api.Endpoints.Informes;

internal sealed class LocalizacionExportJobQueue(
    IServiceScopeFactory scopeFactory,
    ILogger<LocalizacionExportJobQueue> logger) : BackgroundService
{
    private static readonly TimeSpan RetentionPeriod = TimeSpan.FromHours(2);
    private readonly Channel<ExportWorkItem> _queue = Channel.CreateBounded<ExportWorkItem>(
        new BoundedChannelOptions(10)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false,
        });
    private readonly ConcurrentDictionary<Guid, ExportJob> _jobs = new();

    public bool TryEnqueue(FiltrosLocalizacionRequestDto filters, string owner, out Guid jobId)
    {
        RemoveExpiredJobs();
        jobId = Guid.NewGuid();
        var job = new ExportJob(owner);
        if (!_jobs.TryAdd(jobId, job))
        {
            return false;
        }

        if (_queue.Writer.TryWrite(new ExportWorkItem(jobId, filters)))
        {
            return true;
        }

        _jobs.TryRemove(jobId, out _);
        return false;
    }

    public ExportJobSnapshot? GetStatus(Guid jobId, string owner)
    {
        RemoveExpiredJobs();
        if (!_jobs.TryGetValue(jobId, out var job) || !string.Equals(job.Owner, owner, StringComparison.Ordinal))
        {
            return null;
        }

        lock (job)
        {
            job.UpdatedAt = DateTimeOffset.UtcNow;
            return new ExportJobSnapshot(job.Status, job.ErrorMessage);
        }
    }

    public (string Path, string FileName)? GetCompletedFile(Guid jobId, string owner)
    {
        if (!_jobs.TryGetValue(jobId, out var job) || !string.Equals(job.Owner, owner, StringComparison.Ordinal))
        {
            return null;
        }

        lock (job)
        {
            if (job.Status != "completed" || job.FilePath == null || job.FileName == null)
            {
                return null;
            }

            job.UpdatedAt = DateTimeOffset.UtcNow;
            return (job.FilePath, job.FileName);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        CleanOrphanedFiles();
        await Task.WhenAll(ProcessQueueAsync(stoppingToken), CleanupLoopAsync(stoppingToken));
    }

    private async Task ProcessQueueAsync(CancellationToken cancellationToken)
    {
        await foreach (var item in _queue.Reader.ReadAllAsync(cancellationToken))
        {
            if (!_jobs.TryGetValue(item.JobId, out var job))
            {
                continue;
            }

            SetStatus(job, "processing");
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var service = scope.ServiceProvider.GetRequiredService<IInformesLocalizacionService>();
                var (content, fileName) = await service.ExportarExcelAsync(item.Filters, cancellationToken);
                await using (content)
                {
                    if (content is not FileStream fileStream)
                    {
                        throw new InvalidOperationException("La exportación de Localización debe devolver un archivo temporal.");
                    }

                    lock (job)
                    {
                        job.FilePath = fileStream.Name;
                        job.FileName = fileName;
                    }
                }

                SetStatus(job, "completed");
                logger.LogInformation("Exportación de Localización completada para el trabajo {JobId}.", item.JobId);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                SetStatus(job, "failed", "La exportación se interrumpió porque el servidor se está apagando.");
                break;
            }
            catch (ArgumentException ex)
            {
                SetStatus(job, "failed", ex.Message);
                logger.LogWarning(ex, "Exportación de Localización {JobId} rechazada por sus filtros.", item.JobId);
            }
            catch (Exception ex)
            {
                SetStatus(job, "failed", "No se pudo generar el archivo. Inténtelo de nuevo o contacte con soporte.");
                logger.LogError(ex, "Falló la exportación de Localización {JobId}.", item.JobId);
            }
        }
    }

    private async Task CleanupLoopAsync(CancellationToken cancellationToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));
        while (await timer.WaitForNextTickAsync(cancellationToken))
        {
            RemoveExpiredJobs();
        }
    }

    private void RemoveExpiredJobs()
    {
        var expiredBefore = DateTimeOffset.UtcNow - RetentionPeriod;
        foreach (var (jobId, job) in _jobs)
        {
            string? expiredFile = null;
            lock (job)
            {
                if (job.UpdatedAt < expiredBefore &&
                    job.Status is "completed" or "failed" &&
                    _jobs.TryRemove(jobId, out _))
                {
                    expiredFile = job.FilePath;
                }
                else
                {
                    continue;
                }
            }

            DeleteFile(expiredFile);
        }
    }

    private void CleanOrphanedFiles()
    {
        var tempDirectory = Path.GetTempPath();
        foreach (var path in Directory.EnumerateFiles(tempDirectory, "localizacion-*.xlsx"))
        {
            try
            {
                if (File.GetLastWriteTimeUtc(path) < DateTime.UtcNow - RetentionPeriod)
                {
                    File.Delete(path);
                }
            }
            catch (IOException ex)
            {
                logger.LogWarning(ex, "No se pudo limpiar el archivo temporal de Localización {Path}.", path);
            }
            catch (UnauthorizedAccessException ex)
            {
                logger.LogWarning(ex, "No se pudo limpiar el archivo temporal de Localización {Path}.", path);
            }
        }
    }

    private void DeleteFile(string? path)
    {
        if (path == null)
        {
            return;
        }

        try
        {
            File.Delete(path);
        }
        catch (IOException ex)
        {
            logger.LogWarning(ex, "No se pudo eliminar el archivo temporal de Localización {Path}.", path);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "No se pudo eliminar el archivo temporal de Localización {Path}.", path);
        }
    }

    private static void SetStatus(ExportJob job, string status, string? errorMessage = null)
    {
        lock (job)
        {
            job.Status = status;
            job.ErrorMessage = errorMessage;
            job.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    internal static string GetOwner(ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.Identity?.Name ?? "anonymous";

    private sealed record ExportWorkItem(Guid JobId, FiltrosLocalizacionRequestDto Filters);

    private sealed class ExportJob(string owner)
    {
        public string Owner { get; } = owner;
        public string Status { get; set; } = "queued";
        public string? ErrorMessage { get; set; }
        public string? FilePath { get; set; }
        public string? FileName { get; set; }
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}

internal sealed record ExportJobSnapshot(string Status, string? ErrorMessage);
