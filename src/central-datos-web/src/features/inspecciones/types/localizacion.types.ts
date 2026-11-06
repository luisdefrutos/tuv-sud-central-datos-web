export type TipoLocalizacion = 'inspecciones' | 'defectos' | 'elementos' | 'mediciones';

export interface CampoLocalizacion {
  idCampo: number;
  desCampo: string;
  columnaExcel: string;
  tipoDato: string;
  porDefecto: boolean;
  categoriaCampo: string;
  campoSql?: string;
}

export interface OpcionComboLocalizacion {
  codigo: string;
  descripcion: string;
}

export interface SubdefectoLocalizacion {
  bloque: string;
  defecto: string;
  subdefecto: string;
  numero: string;
  descripcion: string;
}

export interface CatalogosLocalizacionResponse {
  tipo: string;
  columnas: CampoLocalizacion[];
  provincias: OpcionComboLocalizacion[];
  categorias: OpcionComboLocalizacion[];
  tiposMotor: OpcionComboLocalizacion[];
  construcciones: OpcionComboLocalizacion[];
  utilizaciones: OpcionComboLocalizacion[];
  seccionesManual: OpcionComboLocalizacion[];
  bloques: OpcionComboLocalizacion[];
  tiposVehiculoMiner: OpcionComboLocalizacion[];
}

export interface FiltrosLocalizacionRequest {
  tipo: TipoLocalizacion;
  fechaInicio: string;
  fechaFin: string;
  sociedad?: string;
  codEstaciones?: string[];
  fase?: string;
  idsCamposSeleccionados?: number[];
  // Comunes de vehículo y titular
  marca?: string;
  tipoMotor?: string;
  categoria?: string;
  categoriaDistinto?: boolean;
  construccion?: string;
  utilizacion?: string;
  cifTitular?: string;
  // Específicos de Localización Inspecciones
  fechaVencInicio?: string | null;
  fechaVencFin?: string | null;
  excluirInspeccionadosPost?: boolean;
  matricula?: string;
  homologacion?: string;
  homologacionDistinto?: boolean;
  bastidor?: string;
  apellidosTitular?: string;
  cpTitular?: string;
  provinciaTitular?: string;
  emailTitular?: string;
  telefonoTitular?: string;
  telefonoTitular2?: string;
  cifFactura?: string;
  razonSocialFactura?: string;
  cpFactura?: string;
  provinciaFactura?: string;
  emailFactura?: string;
  telefonoFactura?: string;
  // Específicos de Defectos, Elementos y Mediciones
  seccionManual?: string;
  bloque?: string;
  defecto?: string;
  subdefecto?: string;
  numeroDefecto?: string;
  tiposVehiculoMiner?: string[];
}

export interface ColumnaResultadoLocalizacion {
  idCampo: number;
  columnaExcel: string;
  desCampo: string;
  tipoDato: string;
  categoriaCampo: string;
}

export interface KpisLocalizacion {
  totalRegistros: number;
  estacionesConDatos: number;
  estacionLider: string;
  registrosEstacionLider: number;
  columnasActivas: number;
  totalColumnasDisponibles: number;
  filtrosAplicadosCount: number;
  mostrandoRegistrosGrid: number;
  truncadoEnGrid: boolean;
}

export interface GraficoPuntoLocalizacion {
  clave: string;
  etiqueta: string;
  valor: number;
  valorFormateado: string;
  subtitulo: string;
  color: string;
}

export type FilaLocalizacion = Record<string, string | number | null | undefined>;

export interface LocalizacionResponse {
  tipo: string;
  kpis: KpisLocalizacion;
  columnas: ColumnaResultadoLocalizacion[];
  filas: FilaLocalizacion[];
  filtrosAplicados: string[];
  graficoPorEstacion: GraficoPuntoLocalizacion[];
}
