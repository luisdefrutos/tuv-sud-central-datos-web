export interface InspRangoHorarioFiltro {
  fechaInicio: string;
  fechaFin: string;
  sociedad?: string;
  estaciones?: string[];
  fase?: string;
}

export interface InspRangoHorarioFila {
  fecha: string;
  fechaFormatted: string;
  diaSemana: string;
  h06: number;
  h07: number;
  h08: number;
  h09: number;
  h10: number;
  h11: number;
  h12: number;
  h13: number;
  h14: number;
  h15: number;
  h16: number;
  h17: number;
  h18: number;
  h19: number;
  h20: number;
  h21: number;
  totalFila: number;
}

export interface HeatmapCelda {
  diaSemana: string;
  diaNumero: number;
  hora: string;
  cantidad: number;
  porcentaje: number;
}

export interface InspRangoHorarioKpi {
  id: string;
  titulo: string;
  valor: string;
  subtitulo: string;
  icon: string;
  variant: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface GraficoEstacionInspRangoHorario {
  codEstacion: string;
  desEstacion: string;
  sociedad?: string;
  totalInspecciones: number;
  pctSobreTotal: string;
  porcentaje: number;
}

export interface InspRangoHorarioResponse {
  kpis: InspRangoHorarioKpi[];
  graficoEstaciones?: GraficoEstacionInspRangoHorario[];
  filas: InspRangoHorarioFila[];
  heatmap: HeatmapCelda[];
  totalInspecciones: number;
  horaPunta: string;
  diaPunta: string;
  promedioPorHora: number;
}

