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


