import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';

export interface ReportKpiData {
  id: string;
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: string;
}

export interface ReportBarChartPoint {
  id: string;
  label: string;
  valor: number;
  valorFormateado?: string;
  sociedad?: 'TSA' | 'CAL' | string;
  color?: string;
}

export interface FiltrosReporteBasico {
  fechaInicio: string;
  fechaFin: string;
  sociedad: FiltroSociedad;
  codEstaciones?: string[]; // Si está vacío o contiene 'TODAS', aplica a toda la red
}

export interface EstacionOpcionCombo {
  codigo: string;
  descripcion: string;
  sociedad: 'TSA' | 'CAL';
}

export interface FilaFacturacion {
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  totalInspecciones: number;
  totalIngresos: number;
  totalIngresosFormatted: string;
  ticketMedio: number;
  ticketMedioFormatted: string;

  // Desglose oficial Crystal Report (rptResumenInspecciones)
  contadosNumInspecciones?: number;
  contadosBase?: number;
  contadosIva?: number;
  contadosTasas?: number;
  contadosTotal?: number;

  tercerosNumInspecciones?: number;
  tercerosBase?: number;
  tercerosIva?: number;
  tercerosTasas?: number;
  tercerosTotal?: number;

  tarjetasNumInspecciones?: number;
  tarjetasBase?: number;
  tarjetasIva?: number;
  tarjetasTasas?: number;
  tarjetasTotal?: number;

  totalesNumInspecciones?: number;
  totalesBase?: number;
  totalesIva?: number;
  totalesTasas?: number;
  totalesTasasTrafico?: number;
  totalesTasasIndustria?: number;
  totalesTotal?: number;
  gratuitas?: number;
}

export interface InformeFacturacionResponse {
  kpis: ReportKpiData[];
  grafico: ReportBarChartPoint[];
  filas: FilaFacturacion[];
  totalFacturacion: number;
  totalInspecciones: number;
  ticketMedioGlobal: number;
  totalFacturacionFormatted: string;
  ticketMedioGlobalFormatted: string;
  totalEstaciones: number;
}

export interface FilaNumeroInspecciones {
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  favorables1: number;
  favorables1Formatted: string;
  rechazadas1: number;
  rechazadas1Formatted: string;
  totalFase1: number;
  totalFase1Formatted: string;
  porcentajeRechazoFase1: number;
  porcentajeRechazoFase1Formatted: string;
  favorables2: number;
  favorables2Formatted: string;
  rechazadas2: number;
  rechazadas2Formatted: string;
  totalFase2: number;
  totalFase2Formatted: string;
  porcentajeRechazoFase2: number;
  porcentajeRechazoFase2Formatted: string;
  totalFavorables: number;
  totalFavorablesFormatted: string;
  totalRechazadas: number;
  totalRechazadasFormatted: string;
  totalInspecciones: number;
  totalInspeccionesFormatted: string;
  porcentajeRechazoGlobal: number;
  porcentajeRechazoGlobalFormatted: string;
}

export interface InformeNumeroInspeccionesResponse {
  kpis: ReportKpiData[];
  graficoBarras: ReportBarChartPoint[];
  graficoCuota: ReportBarChartPoint[];
  filas: FilaNumeroInspecciones[];
  totalInspeccionesGlobal: number;
  totalInspeccionesGlobalFormatted: string;
  totalFavorablesGlobal: number;
  totalFavorablesGlobalFormatted: string;
  totalRechazadasGlobal: number;
  totalRechazadasGlobalFormatted: string;
  porcentajeRechazoGlobal: number;
  porcentajeRechazoGlobalFormatted: string;
  totalFase1Global: number;
  totalFase2Global: number;
  totalEstaciones: number;
}

export type SortableNumeroInspeccionesColumn =
  | 'codEstacion'
  | 'desEstacion'
  | 'claveSociedad'
  | 'favorables1'
  | 'rechazadas1'
  | 'totalFase1'
  | 'porcentajeRechazoFase1'
  | 'favorables2'
  | 'rechazadas2'
  | 'totalFase2'
  | 'porcentajeRechazoFase2'
  | 'totalFavorables'
  | 'totalRechazadas'
  | 'totalInspecciones'
  | 'porcentajeRechazoGlobal';

// ==============================================================================
// Tipos para Informe de Duración Promedio de Inspecciones (rptDuracionPromedio)
// ==============================================================================

export interface FiltrosDuracionPromedio extends FiltrosReporteBasico {
  fase?: 'TODAS' | '1' | '2';
}

export interface FilaDuracionPromedio {
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  tipoVehiculo: string;
  ordenTipo: number;
  totalInspecciones: number;
  duracionPromedioMinutos: number;
  duracionFormateada: string;
}

export interface ResumenEstacionDuracion {
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  totalInspecciones: number;
  duracionPromedioMinutos: number;
  duracionFormateada: string;
}

export interface ResumenTipoVehiculoDuracion {
  tipoVehiculo: string;
  ordenTipo: number;
  totalInspecciones: number;
  duracionPromedioMinutos: number;
  duracionFormateada: string;
}

export interface InformeDuracionPromedioResponse {
  fechaInicio: string;
  fechaFin: string;
  fase: string;
  totalInspeccionesGlobal: number;
  duracionPromedioGlobalMinutos: number;
  duracionPromedioGlobalFormateada: string;
  estacionMasRapida: string;
  duracionEstacionMasRapida: string;
  tipoVehiculoMasRapido: string;
  duracionTipoVehiculoMasRapido: string;
  filas: FilaDuracionPromedio[];
  resumenEstaciones: ResumenEstacionDuracion[];
  resumenTiposVehiculo: ResumenTipoVehiculoDuracion[];
  graficoRankingEstaciones: ReportBarChartPoint[];
  graficoTiposVehiculo: ReportBarChartPoint[];
}

export type SortableDuracionPromedioColumn =
  | 'codEstacion'
  | 'desEstacion'
  | 'claveSociedad'
  | 'totalInspecciones'
  | 'duracionPromedioMinutos';




