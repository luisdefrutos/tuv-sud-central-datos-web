import type { ClaveSociedad } from '../../../constants/companies.constants';

export interface EstacionDato {
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string | null;
  nombreEmpresa: string;
  tipoEstacion: string;
  ultimaInspeccion: string | null;
  ultimaInspeccionFormatted: string;
  tieneInspecciones: boolean;
  diasSinTransmitir?: number | null;
  estadoSincronizacion: 'AlDia' | 'Alerta' | 'Critico' | 'SinDatos';
  estadoSincronizacionLabel: string;
  nivelSincronizacion: 'success' | 'warning' | 'danger' | 'neutral';
  tooltipSincronizacion: string;
}

export interface ResumenEstaciones {
  totalEstaciones: number;
  totalTsa: number;
  totalCal: number;
  conInspecciones: number;
  ultimaFechaGlobal: string;
  estaciones: EstacionDato[];
}

export type FiltroSociedad = ClaveSociedad;
