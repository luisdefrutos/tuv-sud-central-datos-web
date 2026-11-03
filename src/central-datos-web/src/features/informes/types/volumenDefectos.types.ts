import type { ClaveSociedad } from '../../../constants/companies.constants';

export interface VolumenDefectosFiltro {
  fechaInicio: string;
  fechaFin: string;
  sociedad?: ClaveSociedad;
  estaciones?: string[];
  bloque?: string;
  defecto?: string;
}

export interface VolumenDefectosFila {
  codEstacion: string;
  desEstacion: string;
  claveSociedad: string;
  grupoCategoria: string;
  bloque: string;
  defecto: string;
  subdefecto: string;
  codigoCompleto: string;
  gravedad: 'L' | 'G' | 'MG';
  descripcion: string;
  numDefectos: number;
  pctSobreTotal: number;
}

export interface VolumenDefectosKpi {
  id: string;
  titulo: string;
  valor: string;
  subtitulo: string;
  icon: string;
  variant: 'neutral' | 'danger' | 'warning' | 'info' | 'success';
}

export interface GraficoPuntoDefectos {
  id: string;
  label: string;
  valor: number;
  valorFormateado: string;
  subtitulo: string;
  color: string;
}

export interface VolumenDefectosResponse {
  fechaInicio: string;
  fechaFin: string;
  totalDefectos: number;
  totalLeves: number;
  totalGraves: number;
  totalMuyGraves: number;
  kpis: VolumenDefectosKpi[];
  filas: VolumenDefectosFila[];
  graficoEstaciones?: GraficoPuntoDefectos[];
  graficoTopDefectos: GraficoPuntoDefectos[];
  graficoCategorias: GraficoPuntoDefectos[];
}

export interface CatalogoDefectoItem {
  codigo: string;
  descripcion: string;
}

