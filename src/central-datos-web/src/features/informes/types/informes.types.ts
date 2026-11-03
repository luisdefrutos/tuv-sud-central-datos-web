import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';

export interface ReportKpiData {
  id: string;
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: string;
}

export interface DetalleElementoTooltip {
  codigo?: string;
  nombre: string;
  valor?: string | number;
  subtexto?: string;
  badge?: string;
  badgeColor?: string;
  sociedad?: 'TSA' | 'CAL' | string;
}

export interface ReportBarChartPoint {
  id: string;
  label: string;
  valor: number;
  valorFormateado?: string;
  sociedad?: 'TSA' | 'CAL' | string;
  color?: string;
  tooltipSubtitle?: string;
  detallesTooltip?: DetalleElementoTooltip[];
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





export interface FilaDefectoObd {
  codInspeccion: string;
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  matricula: string;
  fechaInspeccion: string;
  fechaInspeccionFormatted: string;
  marca: string;
  modelo: string;
  tipoMotor: string;
  tipoVehiculo: string;
  cHomologacion?: string;
  clasificacion: string;
  mma?: number;
  kilometraje?: string;
  tipoInspeccion: string;
  resultado: string;
  textoResultado: string;
  fase: string;
  desNivelEmisiones: string;
  bloque: string;
  defecto: string;
  subdefecto: string;
  numero: string;
  codigoDefectoCompleto: string;
  descripcionDefecto: string;
  tipoCombustible: string;
  gravedadDefecto: string;
}

export interface InformeDefectoObdResponse {
  kpis: ReportKpiData[];
  graficoEstaciones: ReportBarChartPoint[];
  graficoTipologia: ReportBarChartPoint[];
  graficoCombustible: ReportBarChartPoint[];
  filas: FilaDefectoObd[];
  totalDefectosGlobal: number;
  totalDefectosGlobalFormatted: string;
  totalGasolinaGlobal: number;
  totalDieselGlobal: number;
  totalFase1Global: number;
  totalFase2Global: number;
  totalEstacionesAfectadas: number;
}

export type SortableDefectoObdColumn =
  | 'fechaInspeccion'
  | 'matricula'
  | 'desEstacion'
  | 'marca'
  | 'tipoCombustible'
  | 'codigoDefectoCompleto'
  | 'gravedadDefecto'
  | 'fase'
  | 'textoResultado';

// ==========================================
// TIPOS PARA INFORME DE INSPECCIONES SIN INSPECTOR
// ==========================================

export interface FilaSinInspector {
  codInspeccion: string;
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  matricula: string;
  fechaInspeccion: string;
  fechaInspeccionFormatted: string;
  marca: string;
  modelo: string;
  tipoMotor: string;
  tipoVehiculo: string;
  tipoInspeccion: string;
  textoResultado: string;
  resultado: string;
  fase: string;
  indica12: string;
  cHomologacion: string | null;
  clasificacion: string;
  mma: number | null;
  kilometraje: string | null;
}

export interface GraficoEstacionSinInspector {
  codEstacion: string;
  desEstacion: string;
  claveSociedad: string;
  totalInspecciones: number;
  totalFase1: number;
  totalFase2: number;
  pctSobreTotal: string;
}

export interface InformeSinInspectorResponse {
  filas: FilaSinInspector[];
  totalInspecciones: number;
  totalInspeccionesFormatted: string;
  totalFase1: number;
  totalFase2: number;
  totalEstacionesAfectadas: number;
  kpis: ReportKpiData[];
  graficoEstaciones: ReportBarChartPoint[];
}

export type SortableSinInspectorColumn =
  | 'fechaInspeccion'
  | 'matricula'
  | 'desEstacion'
  | 'marca'
  | 'tipoMotor'
  | 'tipoVehiculo'
  | 'tipoInspeccion'
  | 'fase'
  | 'textoResultado';

// ==========================================
// Tipos para Inspecciones con Cupón Descuento
// ==========================================

export interface FilaCuponDescuento {
  codInspeccion: string;
  codEstacion: string;
  desEstacion: string;
  codEmpresa: string;
  nombreEmpresa: string;
  claveSociedad: string;
  matricula: string;
  fechaInspeccion: string;
  fechaInspeccionFormatted: string;
  codCupon: string;
  promocion: string;
  descuento: number;
  descuentoFormatted: string;
  importeAbonado: number;
  importeAbonadoFormatted: string;
  marca: string;
  modelo: string;
  tipoMotor: string;
  tipoVehiculo: string;
  tipoInspeccion: string;
  textoResultado: string;
  resultado: string;
  fase: string;
  indica12: string;
  cHomologacion: string | null;
  clasificacion: string;
  mma: number | null;
  kilometraje: string | null;
}

export interface GraficoEstacionCuponDescuento {
  codEstacion: string;
  desEstacion: string;
  claveSociedad: string;
  totalInspecciones: number;
  totalDescuento: number;
  totalDescuentoFormatted: string;
  totalAbonado: number;
  totalAbonadoFormatted: string;
  pctSobreTotal: string;
}

export interface GraficoPromocionCupon {
  promocion: string;
  totalInspecciones: number;
  totalDescuento: number;
  totalDescuentoFormatted: string;
  pctSobreTotal: string;
}

export interface InformeCuponDescuentoResponse {
  filas: FilaCuponDescuento[];
  totalInspecciones: number;
  totalInspeccionesFormatted: string;
  totalDescuento: number;
  totalDescuentoFormatted: string;
  totalImporteAbonado: number;
  totalImporteAbonadoFormatted: string;
  totalEstacionesAfectadas: number;
  kpis: ReportKpiData[];
  graficoEstaciones: ReportBarChartPoint[];
  graficoPromociones: ReportBarChartPoint[];
}

export type SortableCuponDescuentoColumn =
  | 'fechaInspeccion'
  | 'matricula'
  | 'desEstacion'
  | 'codCupon'
  | 'promocion'
  | 'descuento'
  | 'importeAbonado'
  | 'marca'
  | 'fase';

// ==========================================
// TIPOS PARA INFORME DE FACTURACIÓN COMPARATIVA (TSA / CAL)
// ==========================================

export interface FilaFacturacionComparativa {
  codEstacion: string;
  desEstacion: string;
  sociedad: string;
  totalInspecciones1: number;
  totalIngresos1: number;
  totalIngresos1Formatted: string;
  mediaIngreso1: number;
  mediaIngreso1Formatted: string;
  totalInspecciones2: number;
  totalIngresos2: number;
  totalIngresos2Formatted: string;
  mediaIngreso2: number;
  mediaIngreso2Formatted: string;
  difInspecciones: number;
  difInspeccionesFormatted: string;
  porcentajeDifInspecciones: number;
  porcentajeDifInspeccionesFormatted: string;
  difIngresos: number;
  difIngresosFormatted: string;
  porcentajeDifIngresos: number;
  porcentajeDifIngresosFormatted: string;
}

export interface TotalesSociedadFacturacion {
  sociedad: string;
  totalInspecciones1: number;
  totalIngresos1: number;
  totalIngresos1Formatted: string;
  totalInspecciones2: number;
  totalIngresos2: number;
  totalIngresos2Formatted: string;
  difIngresos: number;
  difIngresosFormatted: string;
  porcentajeDifIngresos: number;
  porcentajeDifIngresosFormatted: string;
  difInspecciones: number;
  difInspeccionesFormatted: string;
  porcentajeDifInspecciones: number;
  porcentajeDifInspeccionesFormatted: string;
}

export interface GraficoFacturacionComparativa {
  codEstacion: string;
  estacionNombre: string;
  sociedad: string;
  inspecciones1: number;
  inspecciones2: number;
  ingresos1: number;
  ingresos2: number;
  ingresos1Formatted: string;
  ingresos2Formatted: string;
  porcentajeVariacionIngresos: number;
}

export interface InformeFacturacionComparativaResponse {
  rango1Label: string;
  rango2Label: string;
  filas: FilaFacturacionComparativa[];
  totalRegistros: number;
  totalesPorSociedad: TotalesSociedadFacturacion[];
  totalGlobal: TotalesSociedadFacturacion;
  kpis: ReportKpiData[];
  graficoEstaciones: GraficoFacturacionComparativa[];
}

export type SortableFacturacionComparativaColumn =
  | 'desEstacion'
  | 'sociedad'
  | 'totalIngresos1'
  | 'totalInspecciones1'
  | 'totalIngresos2'
  | 'totalInspecciones2'
  | 'difIngresos'
  | 'porcentajeDifIngresos'
  | 'difInspecciones'
  | 'porcentajeDifInspecciones';
