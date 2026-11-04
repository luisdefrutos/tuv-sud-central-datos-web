namespace CentralDatos.Application.Features.Informes.DTOs;

public class FiltrosEnviosRecordatoriosRequestDto
{
    public DateTime FechaInicio { get; set; } = DateTime.Today.AddDays(-30);
    public DateTime FechaFin { get; set; } = DateTime.Today;
    public string Canal { get; set; } = "TODOS"; // "TODOS", "SMS", "EMAIL"
    public int? IdPlantilla { get; set; }
    public string CodEmpresa { get; set; } = "TODAS";
    public List<string> CodEstaciones { get; set; } = new();
    public string? Busqueda { get; set; }
    public string ModoVista { get; set; } = "resumen"; // "resumen" o "detalle"
}

public class FilaResumenEnviosRecordatoriosDto
{
    public string CodigoEstacion { get; set; } = string.Empty;
    public string NombreEstacion { get; set; } = string.Empty;
    public string Canal { get; set; } = string.Empty; // "SMS" o "EMAIL"
    public int IdPlantilla { get; set; }
    public string DescripcionPlantilla { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public int TotalEnviados { get; set; }

    public FilaResumenEnviosRecordatoriosDto() { }

    public FilaResumenEnviosRecordatoriosDto(
        string codigoEstacion,
        string nombreEstacion,
        string canal,
        int idPlantilla,
        string descripcionPlantilla,
        DateTime fechaEnvio,
        int totalEnviados)
    {
        CodigoEstacion = codigoEstacion;
        NombreEstacion = nombreEstacion;
        Canal = canal;
        IdPlantilla = idPlantilla;
        DescripcionPlantilla = descripcionPlantilla;
        FechaEnvio = fechaEnvio;
        TotalEnviados = totalEnviados;
    }
}

public class FilaDetalleEnviosRecordatoriosDto
{
    public string Canal { get; set; } = string.Empty;
    public string CodigoEstacion { get; set; } = string.Empty;
    public string NombreEstacion { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public int NumeroInspeccion { get; set; }
    public int AnioInspeccion { get; set; }
    public string Matricula { get; set; } = string.Empty;
    public int IdPlantilla { get; set; }
    public string DescripcionPlantilla { get; set; } = string.Empty;
    public string Destinatario { get; set; } = string.Empty; // Teléfono o Email
    public string Nombre { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string EstadoEnvio { get; set; } = "ENVIADO";
    public DateTime? FechaCaducidad { get; set; }

    public FilaDetalleEnviosRecordatoriosDto() { }

    public FilaDetalleEnviosRecordatoriosDto(
        string canal,
        string codigoEstacion,
        string nombreEstacion,
        DateTime fechaEnvio,
        int numeroInspeccion,
        int anioInspeccion,
        string matricula,
        int idPlantilla,
        string descripcionPlantilla,
        string destinatario,
        string nombre,
        string apellidos,
        string estadoEnvio,
        DateTime? fechaCaducidad)
    {
        Canal = canal;
        CodigoEstacion = codigoEstacion;
        NombreEstacion = nombreEstacion;
        FechaEnvio = fechaEnvio;
        NumeroInspeccion = numeroInspeccion;
        AnioInspeccion = anioInspeccion;
        Matricula = matricula;
        IdPlantilla = idPlantilla;
        DescripcionPlantilla = descripcionPlantilla;
        Destinatario = destinatario;
        Nombre = nombre;
        Apellidos = apellidos;
        EstadoEnvio = estadoEnvio;
        FechaCaducidad = fechaCaducidad;
    }
}

public class KpiEnviosRecordatoriosDto
{
    public int TotalGlobal { get; set; }
    public int TotalSms { get; set; }
    public int TotalEmail { get; set; }
    public string PlantillaLider { get; set; } = "—";
    public int TotalPlantillas { get; set; }
    public int EstacionesActivas { get; set; }

    public KpiEnviosRecordatoriosDto() { }

    public KpiEnviosRecordatoriosDto(
        int totalGlobal,
        int totalSms,
        int totalEmail,
        string plantillaLider,
        int totalPlantillas,
        int estacionesActivas)
    {
        TotalGlobal = totalGlobal;
        TotalSms = totalSms;
        TotalEmail = totalEmail;
        PlantillaLider = plantillaLider;
        TotalPlantillas = totalPlantillas;
        EstacionesActivas = estacionesActivas;
    }
}

public class PlantillaRecordatorioCatalogoDto
{
    public int IdTipo { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Canal { get; set; } = "SMS"; // "SMS" o "EMAIL"
    public bool Activo { get; set; } = true;

    public PlantillaRecordatorioCatalogoDto() { }

    public PlantillaRecordatorioCatalogoDto(int idTipo, string descripcion, string canal, bool activo)
    {
        IdTipo = idTipo;
        Descripcion = descripcion;
        Canal = canal;
        Activo = activo;
    }
}

public class PuntoGraficoEnviosDto
{
    public string Label { get; set; } = string.Empty;
    public int Total { get; set; }
    public string Categoria { get; set; } = string.Empty;

    public PuntoGraficoEnviosDto() { }

    public PuntoGraficoEnviosDto(string label, int total, string categoria)
    {
        Label = label;
        Total = total;
        Categoria = categoria;
    }
}

public class InformeEnviosRecordatoriosResponseDto
{
    public KpiEnviosRecordatoriosDto Kpis { get; set; } = new();
    public IReadOnlyList<FilaResumenEnviosRecordatoriosDto> FilasResumen { get; set; } = Array.Empty<FilaResumenEnviosRecordatoriosDto>();
    public IReadOnlyList<FilaDetalleEnviosRecordatoriosDto> FilasDetalle { get; set; } = Array.Empty<FilaDetalleEnviosRecordatoriosDto>();
    public IReadOnlyList<PuntoGraficoEnviosDto> GraficoPorEstacion { get; set; } = Array.Empty<PuntoGraficoEnviosDto>();
    public IReadOnlyList<PuntoGraficoEnviosDto> GraficoPorPlantilla { get; set; } = Array.Empty<PuntoGraficoEnviosDto>();
    public IReadOnlyList<PuntoGraficoEnviosDto> GraficoPorCanal { get; set; } = Array.Empty<PuntoGraficoEnviosDto>();
    public IReadOnlyList<PuntoGraficoEnviosDto> GraficoPorFecha { get; set; } = Array.Empty<PuntoGraficoEnviosDto>();

    public InformeEnviosRecordatoriosResponseDto() { }

    public InformeEnviosRecordatoriosResponseDto(
        KpiEnviosRecordatoriosDto kpis,
        IReadOnlyList<FilaResumenEnviosRecordatoriosDto> filasResumen,
        IReadOnlyList<FilaDetalleEnviosRecordatoriosDto> filasDetalle,
        IReadOnlyList<PuntoGraficoEnviosDto> graficoPorEstacion,
        IReadOnlyList<PuntoGraficoEnviosDto> graficoPorPlantilla,
        IReadOnlyList<PuntoGraficoEnviosDto> graficoPorCanal,
        IReadOnlyList<PuntoGraficoEnviosDto> graficoPorFecha)
    {
        Kpis = kpis;
        FilasResumen = filasResumen;
        FilasDetalle = filasDetalle;
        GraficoPorEstacion = graficoPorEstacion;
        GraficoPorPlantilla = graficoPorPlantilla;
        GraficoPorCanal = graficoPorCanal;
        GraficoPorFecha = graficoPorFecha;
    }
}
