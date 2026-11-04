using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CentralDatos.Application.Features.Informes.DTOs;

namespace CentralDatos.Application.Features.Informes.Interfaces;

public interface IInformesClientesVolumenService
{
    Task<ClientesVolumenResponseDto> GenerarInformeClientesVolumenAsync(
        ClientesVolumenFiltroDto filtros,
        CancellationToken ct = default);

    Task<byte[]> ExportarExcelAsync(
        ClientesVolumenFiltroDto filtros,
        CancellationToken ct = default);

    Task<IReadOnlyList<ProyectoComercialDto>> ObtenerProyectosComercialesAsync(
        CancellationToken ct = default);

    Task<IReadOnlyList<TipoVehiculoMinerDto>> ObtenerTiposVehiculoMinerAsync(
        CancellationToken ct = default);
}

