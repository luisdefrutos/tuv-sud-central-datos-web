import type { FiltrosReporteBasico, ReportBarChartPoint, ReportKpiData } from './informes.types';

export interface FiltrosBastidoresObd extends FiltrosReporteBasico {}

export interface FilaBastidorObdNoCoincidente {
  codInspeccion: string;
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  claveSociedad: string;
  matricula: string;
  fechaInspeccion: string;
  fechaInspeccionFormatted: string;
  bastidorInspeccion: string;
  bastidorObd: string;
  categoria: string;
  clasificacion: string;
  nombre?: string;
  apellidos?: string;
  nombreCompleto?: string;
  cifFactura?: string;
  codInspector?: string;
  codInspector1?: string;
  codInspector2?: string;
  codInspector3?: string;
  inspectorResponsableValidacion?: string;
  equipoObd?: string;
  codEmpleadoBastidor?: string;
}

export interface GraficoCategoriaBastidoresObd {
  categoria: string;
  descripcion: string;
  totalDiscordancias: number;
  pctSobreTotal: string;
}

export interface InformeBastidoresObdResponse {
  filas: FilaBastidorObdNoCoincidente[];
  totalDiscordancias: number;
  totalDiscordanciasFormatted: string;
  totalEstacionesAfectadas: number;
  estacionMayorIncidencia: string;
  equipoObdMayorIncidencia: string;
  graficoPorEstacion: ReportBarChartPoint[];
  graficoPorCategoria: GraficoCategoriaBastidoresObd[];
  kpis: ReportKpiData[];
  fechaDesde: string;
  fechaHasta: string;
}

export type SortableBastidorObdColumn =
  | 'codInspeccion'
  | 'codEstacion'
  | 'desEstacion'
  | 'claveSociedad'
  | 'fechaInspeccion'
  | 'matricula'
  | 'bastidorInspeccion'
  | 'bastidorObd'
  | 'categoria'
  | 'clasificacion'
  | 'nombreCompleto'
  | 'cifFactura'
  | 'codInspector'
  | 'inspectorResponsableValidacion'
  | 'equipoObd'
  | 'codEmpleadoBastidor';

