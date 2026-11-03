namespace CentralDatos.Domain.Entities.Informes;

/// <summary>
/// Catálogo y equivalencia de las 9 Categorías Oficiales del Ministerio de Industria (MINER):
/// <code>
/// | Código | Grupo MINER | Tipo de Vehículo                                      |
/// | :---:  | :---        | :---                                                  |
/// | MO     | Grupo 01    | Motocicletas, ciclomotores y quads                   |
/// | TP     | Grupo 02    | Turismos de uso particular                            |
/// | TR     | Grupo 03    | Turismos de alquiler / servicio público (taxis, VTC)  |
/// | MP     | Grupo 04    | Transporte de mercancías ligero (&lt;= 3.500 kg, furg.) |
/// | MG     | Grupo 05    | Transporte de mercancías pesado (&gt; 3.500 kg, cam.)   |
/// | AU     | Grupo 06    | Autobuses y autocares                                 |
/// | RS     | Grupo 07    | Remolques y semirremolques                            |
/// | AG     | Grupo 08    | Tractores y maquinaria agrícola                       |
/// | OT     | Grupo 09    | Otros vehículos especiales y maquinaria de obras      |
/// </code>
/// </summary>
public static class MinerConstantes
{
    public const string MO = "MO"; // Grupo 01: Motocicletas, ciclomotores y quads
    public const string TP = "TP"; // Grupo 02: Turismos de uso particular
    public const string TR = "TR"; // Grupo 03: Turismos de alquiler / servicio público (taxis, VTC)
    public const string MP = "MP"; // Grupo 04: Transporte mercancías ligero (<= 3.500 kg, furgonetas)
    public const string MG = "MG"; // Grupo 05: Transporte mercancías pesado (> 3.500 kg, camiones)
    public const string AU = "AU"; // Grupo 06: Autobuses y autocares
    public const string RS = "RS"; // Grupo 07: Remolques y semirremolques
    public const string AG = "AG"; // Grupo 08: Tractores y maquinaria agrícola
    public const string OT = "OT"; // Grupo 09: Otros vehículos especiales y maquinaria de obras
}

/// <summary>
/// Fila agregada de defectos por bloque y gravedad cruzada por los 9 grupos MINER.
/// </summary>
public sealed class MinerDefectoDato
{
    /// <summary>Código compuesto de Bloque y Gravedad, ej: "11L" (Leve), "11G" (Grave)</summary>
    public string Gravedad { get; set; } = string.Empty;

    /// <summary>MO - Grupo 01: Motocicletas, ciclomotores y quads</summary>
    public int Grupo01Mo { get; set; }

    /// <summary>TP - Grupo 02: Turismos de uso particular</summary>
    public int Grupo02Tp { get; set; }

    /// <summary>TR - Grupo 03: Turismos de alquiler / servicio público (taxis, VTC)</summary>
    public int Grupo03Tr { get; set; }

    /// <summary>MP - Grupo 04: Transporte de mercancías ligero (&lt;= 3.500 kg, furgonetas)</summary>
    public int Grupo04Mp { get; set; }

    /// <summary>MG - Grupo 05: Transporte de mercancías pesado (&gt; 3.500 kg, camiones)</summary>
    public int Grupo05Mg { get; set; }

    /// <summary>AU - Grupo 06: Autobuses y autocares</summary>
    public int Grupo06Au { get; set; }

    /// <summary>RS - Grupo 07: Remolques y semirremolques</summary>
    public int Grupo07Rs { get; set; }

    /// <summary>AG - Grupo 08: Tractores y maquinaria agrícola</summary>
    public int Grupo08Ag { get; set; }

    /// <summary>OT - Grupo 09: Otros vehículos especiales y maquinaria de obras</summary>
    public int Grupo09Ot { get; set; }

    /// <summary>Total acumulado de las 9 categorías MINER para este bloque/gravedad</summary>
    public int Total => Grupo01Mo + Grupo02Tp + Grupo03Tr + Grupo04Mp + Grupo05Mg + Grupo06Au + Grupo07Rs + Grupo08Ag + Grupo09Ot;
}

/// <summary>
/// Fila agregada de inspecciones (FAV / DESFAV) en Fase 1 o Fase 2 por los 9 grupos MINER.
/// </summary>
public sealed class MinerInspeccionDato
{
    /// <summary>Resultado de la inspección: "FAV" (Favorable) o "DESFAV" (Desfavorable/Rechazada)</summary>
    public string Resultado { get; set; } = string.Empty;

    /// <summary>MO - Grupo 01: Motocicletas, ciclomotores y quads</summary>
    public int Grupo01Mo { get; set; }

    /// <summary>TP - Grupo 02: Turismos de uso particular</summary>
    public int Grupo02Tp { get; set; }

    /// <summary>TR - Grupo 03: Turismos de alquiler / servicio público (taxis, VTC)</summary>
    public int Grupo03Tr { get; set; }

    /// <summary>MP - Grupo 04: Transporte de mercancías ligero (&lt;= 3.500 kg, furgonetas)</summary>
    public int Grupo04Mp { get; set; }

    /// <summary>MG - Grupo 05: Transporte de mercancías pesado (&gt; 3.500 kg, camiones)</summary>
    public int Grupo05Mg { get; set; }

    /// <summary>AU - Grupo 06: Autobuses y autocares</summary>
    public int Grupo06Au { get; set; }

    /// <summary>RS - Grupo 07: Remolques y semirremolques</summary>
    public int Grupo07Rs { get; set; }

    /// <summary>AG - Grupo 08: Tractores y maquinaria agrícola</summary>
    public int Grupo08Ag { get; set; }

    /// <summary>OT - Grupo 09: Otros vehículos especiales y maquinaria de obras</summary>
    public int Grupo09Ot { get; set; }

    /// <summary>Total acumulado de inspecciones de las 9 categorías MINER</summary>
    public int Total => Grupo01Mo + Grupo02Tp + Grupo03Tr + Grupo04Mp + Grupo05Mg + Grupo06Au + Grupo07Rs + Grupo08Ag + Grupo09Ot;
}

/// <summary>
/// Agrupador completo de las 3 tablas de la Estadística Oficial MINER.
/// </summary>
public sealed class MinerEstadisticaGlobalDato
{
    public IReadOnlyList<MinerDefectoDato> Defectos { get; set; } = [];
    public IReadOnlyList<MinerInspeccionDato> PrimerasInspecciones { get; set; } = [];
    public IReadOnlyList<MinerInspeccionDato> SegundasInspecciones { get; set; } = [];
}
