export interface FiltrosEnviosRecordatorios {
  fechaInicio: string;
  fechaFin: string;
  canal: 'TODOS' | 'SMS' | 'EMAIL';
  idPlantilla?: number | null;
  codEmpresa: string;
  codEstaciones?: string[];
  busqueda?: string;
  modoVista: 'resumen' | 'detalle';
  // Filtros rápidos granulares (frmSMSEnviado)
  codInspeccion?: string;
  telefono?: string;
  matricula?: string;
  fechaCaducidad?: string;
  cliente?: string;
  fechaEnvioFiltro?: string;
}

export interface FilaResumenEnviosRecordatorios {
  codigoEstacion: string;
  nombreEstacion: string;
  canal: 'SMS' | 'EMAIL';
  idPlantilla: number;
  descripcionPlantilla: string;
  fechaEnvio: string;
  totalEnviados: number;
}

export interface FilaDetalleEnviosRecordatorios {
  canal: 'SMS' | 'EMAIL';
  codigoEstacion: string;
  nombreEstacion: string;
  fechaEnvio: string;
  numeroInspeccion: number;
  anioInspeccion: number;
  matricula: string;
  idPlantilla: number;
  descripcionPlantilla: string;
  destinatario: string;
  nombre: string;
  apellidos: string;
  estadoEnvio: string;
  fechaCaducidad: string | null;
}

export interface KpiEnviosRecordatorios {
  totalGlobal: number;
  totalSms: number;
  totalEmail: number;
  plantillaLider: string;
  totalPlantillas: number;
  estacionesActivas: number;
}

export interface PlantillaRecordatorioCatalogo {
  idTipo: number;
  descripcion: string;
  canal: string;
  activo: boolean;
}

export interface PuntoGraficoEnvios {
  label: string;
  total: number;
  categoria: string;
}

export interface InformeEnviosRecordatoriosResponse {
  kpis: KpiEnviosRecordatorios;
  filasResumen: FilaResumenEnviosRecordatorios[];
  filasDetalle: FilaDetalleEnviosRecordatorios[];
  graficoPorEstacion: PuntoGraficoEnvios[];
  graficoPorPlantilla: PuntoGraficoEnvios[];
  graficoPorCanal: PuntoGraficoEnvios[];
  graficoPorFecha: PuntoGraficoEnvios[];
}

