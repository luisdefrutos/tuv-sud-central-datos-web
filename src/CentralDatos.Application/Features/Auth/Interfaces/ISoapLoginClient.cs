namespace CentralDatos.Application.Features.Auth.Interfaces;

public interface ISoapLoginClient
{
    Task<(bool Success, string Message)> ValidateLdapAsync(string username, string password, CancellationToken cancellationToken = default);
}

