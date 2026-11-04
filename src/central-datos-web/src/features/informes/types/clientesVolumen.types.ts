import type { ClaveSociedad } from '../../../constants/companies.constants';

export interface ClientesVolumenFiltro {
  fechaInicio: string;
  fechaFin: string;
  sociedad?: ClaveSociedad;
  estaciones?: string[];
  fase?: string; // 'TODAS' | '1' | '2'
  limiteCuenta?: number;
  idProyecto?: number;
  tiposVehiculo?: string[];
}

export interface ClientesVolumenFila {
  codEstacion: string;
  desEstacion: string;
  claveSociedad: string;
  cifFactura: string;
  cifTitular: string;
  nombreCliente: string;
  domicilio: string;
  codigoPostal: string;
  poblacion: string;
  provincia: string;
  telefono: string;
  telefono2: string;
  resultado: 'FAV' | 'DESFAV' | string;
  cuenta: number;
  cuentaCif: number;
}

export interface ClientesVolumenKpi {
  id: string;
  titulo: string;
  valor: string;
  subtitulo: string;
  icon: string;
  variant: 'neutral' | 'danger' | 'warning' | 'info' | 'success' | 'primary';
}

export interface GraficoPuntoCliente {
  id: string;
  label: string;
  valor: number;
  valorFormateado: string;
  subtitulo: string;
  color: string;
}

export interface ClientesVolumenResponse {
  fechaInicio: string;
  fechaFin: string;
  totalClientes: number;
  totalInspecciones: number;
  totalFavorables: number;
  totalDesfavorables: number;
  kpis: ClientesVolumenKpi[];
  filas: ClientesVolumenFila[];
  graficoTopClientes: GraficoPuntoCliente[];
  graficoEstaciones: GraficoPuntoCliente[];
}

export interface ProyectoComercialItem {
  idProyecto: number;
  desProyecto: string;
}

export interface TipoVehiculoMinerItem {
  codigo: string;
  descripcion: string;
}

