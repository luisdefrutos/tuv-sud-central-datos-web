/**
 * ============================================================================
 * TIPOS Y DEFINICIONES: ESTADÍSTICA MINER GLOBAL (MINISTERIO DE INDUSTRIA)
 * ============================================================================
 * 
 * Tabla de equivalencia y categorización de los 9 grupos oficiales MINER:
 * ----------------------------------------------------------------------------
 * | Código | Grupo MINER | Tipo de Vehículo                                   |
 * |--------|-------------|----------------------------------------------------|
 * | MO     | Grupo 01    | Motocicletas, ciclomotores y quads                 |
 * | TP     | Grupo 02    | Turismos de uso particular                         |
 * | TR     | Grupo 03    | Turismos alquiler / servicio público (taxis, VTC)  |
 * | MP     | Grupo 04    | Mercancías ligeras (<= 3.500 kg, furgonetas)       |
 * | MG     | Grupo 05    | Mercancías pesadas (> 3.500 kg, camiones)          |
 * | AU     | Grupo 06    | Autobuses y autocares                              |
 * | RS     | Grupo 07    | Remolques y semirremolques                         |
 * | AG     | Grupo 08    | Tractores y maquinaria agrícola                    |
 * | OT     | Grupo 09    | Otros vehículos especiales y maquinaria de obras   |
 * ----------------------------------------------------------------------------
 */

export interface FiltrosMinerRequest {
  fechaInicio: string; // ISO yyyy-MM-dd
  fechaFin: string;    // ISO yyyy-MM-dd
  codEstaciones?: string[];
}

export interface FilaMinerDefecto {
  codigoGravedad: string; // "11L", "11G", ...
  capituloNumero: number; // 1 a 10
  capituloNombre: string; // "Capítulo 1 (Identificación)"
  gravedadTipo: 'Leve' | 'Grave' | string;
  grupo01Mo: number;
  grupo02Tp: number;
  grupo03Tr: number;
  grupo04Mp: number;
  grupo05Mg: number;
  grupo06Au: number;
  grupo07Rs: number;
  grupo08Ag: number;
  grupo09Ot: number;
  total: number;
}

export interface FilaMinerResumenFase {
  faseNombre: string; // "Primera Inspección (Fase 1)" | "Segunda Inspección (Fase 2)"
  grupo01MoFav: number;
  grupo01MoDesfav: number;
  grupo01MoTotal: number;
  grupo01MoPctRechazo: number;

  grupo02TpFav: number;
  grupo02TpDesfav: number;
  grupo02TpTotal: number;
  grupo02TpPctRechazo: number;

  grupo03TrFav: number;
  grupo03TrDesfav: number;
  grupo03TrTotal: number;
  grupo03TrPctRechazo: number;

  grupo04MpFav: number;
  grupo04MpDesfav: number;
  grupo04MpTotal: number;
  grupo04MpPctRechazo: number;

  grupo05MgFav: number;
  grupo05MgDesfav: number;
  grupo05MgTotal: number;
  grupo05MgPctRechazo: number;

  grupo06AuFav: number;
  grupo06AuDesfav: number;
  grupo06AuTotal: number;
  grupo06AuPctRechazo: number;

  grupo07RsFav: number;
  grupo07RsDesfav: number;
  grupo07RsTotal: number;
  grupo07RsPctRechazo: number;

  grupo08AgFav: number;
  grupo08AgDesfav: number;
  grupo08AgTotal: number;
  grupo08AgPctRechazo: number;

  grupo09OtFav: number;
  grupo09OtDesfav: number;
  grupo09OtTotal: number;
  grupo09OtPctRechazo: number;

  totalFav: number;
  totalDesfav: number;
  totalInspecciones: number;
  pctRechazoGlobal: number;
}

export interface KpiMiner {
  id: string;
  titulo: string;
  valor: string;
  subtitulo: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  icon: string;
}

export interface GraficoPuntoMiner {
  id: string;
  label: string;
  valor: number;
  valorFormateado: string;
  categoria?: string;
  color?: string;
}

export interface InformeMinerResponse {
  rangoFechasLabel: string;
  estacionesLabel: string;
  defectos: FilaMinerDefecto[];
  primeraInspeccion: FilaMinerResumenFase;
  segundaInspeccion: FilaMinerResumenFase;
  kpis: KpiMiner[];
  graficoCapitulos: GraficoPuntoMiner[];
  graficoCategorias: GraficoPuntoMiner[];
}

