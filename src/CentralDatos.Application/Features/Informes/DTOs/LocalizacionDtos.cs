namespace CentralDatos.Application.Features.Informes.DTOs;

public record CampoLocalizacionDto(
    int IdCampo,
    string DesCampo,
    string ColumnaExcel,
    string TipoDato,
    bool PorDefecto,
    string CategoriaCampo,
    string CampoSql
);

public record OpcionComboLocalizacionDto(
    string Codigo,
    string Descripcion
);

public record SubdefectoLocalizacionDto(
    string Bloque,
    string Defecto,
    string Subdefecto,
    string Numero,
    string Descripcion
);

public record CatalogosLocalizacionResponseDto(
    string Tipo,
    IReadOnlyList<CampoLocalizacionDto> Columnas,
    IReadOnlyList<OpcionComboLocalizacionDto> Provincias,
    IReadOnlyList<OpcionComboLocalizacionDto> Categorias,
    IReadOnlyList<OpcionComboLocalizacionDto> TiposMotor,
    IReadOnlyList<OpcionComboLocalizacionDto> Construcciones,
    IReadOnlyList<OpcionComboLocalizacionDto> Utilizaciones,
    IReadOnlyList<OpcionComboLocalizacionDto> SeccionesManual,
    IReadOnlyList<OpcionComboLocalizacionDto> Bloques,
    IReadOnlyList<OpcionComboLocalizacionDto> TiposVehiculoMiner
);

public record FiltrosLocalizacionRequestDto(
    string Tipo,
    DateTime FechaInicio,
    DateTime FechaFin,
    string? Sociedad = null,
    IReadOnlyList<string>? CodEstaciones = null,
    string? Fase = null,
    IReadOnlyList<int>? IdsCamposSeleccionados = null,
    // Filtros comunes de vehículo y titular
    string? Marca = null,
    string? TipoMotor = null,
    string? Categoria = null,
    bool CategoriaDistinto = false,
    string? Construccion = null,
    string? Utilizacion = null,
    string? CifTitular = null,
    // Filtros específicos de Localización Inspecciones
    DateTime? FechaVencInicio = null,
    DateTime? FechaVencFin = null,
    bool ExcluirInspeccionadosPost = false,
    string? Matricula = null,
    string? Homologacion = null,
    bool HomologacionDistinto = false,
    string? Bastidor = null,
    string? ApellidosTitular = null,
    string? CpTitular = null,
    string? ProvinciaTitular = null,
    string? EmailTitular = null,
    string? TelefonoTitular = null,
    string? TelefonoTitular2 = null,
    string? CifFactura = null,
    string? RazonSocialFactura = null,
    string? CpFactura = null,
    string? ProvinciaFactura = null,
    string? EmailFactura = null,
    string? TelefonoFactura = null,
    // Filtros específicos de Defectos, Elementos y Mediciones
    string? SeccionManual = null,
    string? Bloque = null,
    string? Defecto = null,
    string? Subdefecto = null,
    string? NumeroDefecto = null,
    IReadOnlyList<string>? TiposVehiculoMiner = null
);

public record ColumnaResultadoLocalizacionDto(
    int IdCampo,
    string ColumnaExcel,
    string DesCampo,
    string TipoDato,
    string CategoriaCampo
);

public record KpisLocalizacionDto(
    int TotalRegistros,
    int EstacionesConDatos,
    string EstacionLider,
    int RegistrosEstacionLider,
    int ColumnasActivas,
    int TotalColumnasDisponibles,
    int FiltrosAplicadosCount,
    int MostrandoRegistrosGrid,
    bool TruncadoEnGrid
);

public record GraficoPuntoLocalizacionDto(
    string Clave,
    string Etiqueta,
    int Valor,
    string ValorFormateado,
    string Subtitulo,
    string Color
);

public record ResultadoEjecucionLocalizacionRaw(
    int TotalRegistros,
    IReadOnlyList<ColumnaResultadoLocalizacionDto> Columnas,
    IReadOnlyList<Dictionary<string, object?>> Filas,
    IReadOnlyList<string> FiltrosAplicados,
    IReadOnlyDictionary<string, int> ConteoPorEstacion,
    int TotalColumnasDisponibles,
    bool Truncado
);

public record LocalizacionResponseDto(
    string Tipo,
    KpisLocalizacionDto Kpis,
    IReadOnlyList<ColumnaResultadoLocalizacionDto> Columnas,
    IReadOnlyList<Dictionary<string, object?>> Filas,
    IReadOnlyList<string> FiltrosAplicados,
    IReadOnlyList<GraficoPuntoLocalizacionDto> GraficoPorEstacion
);
