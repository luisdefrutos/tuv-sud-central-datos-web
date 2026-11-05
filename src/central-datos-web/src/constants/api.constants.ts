/**
 * Base URL del API configurable:
 * 1. Lee de window.__API_URL__ definido en config.js (fichero externo modificable en el servidor sin recompilar)
 * 2. Si no existe o está vacío, usa '' (ideal para desarrollo local con proxy o enrutamiento raíz)
 */
declare global {
  interface Window {
    __API_URL__?: string;
  }
}

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && typeof window.__API_URL__ === 'string') {
    return window.__API_URL__.replace(/\/+$/, ''); // Quita barra final si la tiene
  }
  return '';
};

const BASE_URL = getApiBaseUrl();

/**
 * Endpoints y rutas del API para Central Datos
 */
export const API_ENDPOINTS = {
  HEALTH: `${BASE_URL}/api/v1/health`,
  AUTH: {
    WINDOWS_IDENTITY: `${BASE_URL}/api/v1/auth/windows-identity`,
    SSO_LOGIN: `${BASE_URL}/api/v1/auth/sso-login`,
    LOGIN: `${BASE_URL}/api/v1/auth/login`,
    LOGOUT: `${BASE_URL}/api/v1/auth/logout`,
    ME: `${BASE_URL}/api/v1/auth/me`,
    AUDIT: `${BASE_URL}/api/v1/auth/audit`,
    AUDIT_BATCH: `${BASE_URL}/api/v1/auth/audit/batch`,
  },
  ESTACIONES: {
    ULTIMOS_DATOS: `${BASE_URL}/api/v1/estaciones/ultimos-datos`,
  },
  INFORMES: {
    FACTURACION_CONSULTAR: `${BASE_URL}/api/v1/informes/facturacion/consultar`,
    FACTURACION_EXPORTAR: `${BASE_URL}/api/v1/informes/facturacion/exportar-excel`,
    NUMERO_INSPECCIONES_CONSULTAR: `${BASE_URL}/api/v1/informes/numero-inspecciones/consultar`,
    NUMERO_INSPECCIONES_EXPORTAR: `${BASE_URL}/api/v1/informes/numero-inspecciones/exportar-excel`,
    DURACION_PROMEDIO_CONSULTAR: `${BASE_URL}/api/v1/informes/duracion-promedio/consultar`,
    DURACION_PROMEDIO_EXPORTAR: `${BASE_URL}/api/v1/informes/duracion-promedio/exportar-excel`,
    DEFECTO_OBD_CONSULTAR: `${BASE_URL}/api/v1/informes/defecto-obd/consultar`,
    DEFECTO_OBD_EXPORTAR: `${BASE_URL}/api/v1/informes/defecto-obd/exportar-excel`,
    SIN_INSPECTOR_CONSULTAR: `${BASE_URL}/api/v1/informes/sin-inspector/consultar`,
    SIN_INSPECTOR_EXPORTAR: `${BASE_URL}/api/v1/informes/sin-inspector/exportar-excel`,
    CUPON_DESCUENTO_CONSULTAR: `${BASE_URL}/api/v1/informes/cupon-descuento/consultar`,
    CUPON_DESCUENTO_EXPORTAR: `${BASE_URL}/api/v1/informes/cupon-descuento/exportar-excel`,
    FACTURACION_COMPARATIVA_CONSULTAR: `${BASE_URL}/api/v1/informes/facturacion-comparativa/consultar`,
    FACTURACION_COMPARATIVA_EXPORTAR: `${BASE_URL}/api/v1/informes/facturacion-comparativa/exportar-excel`,
    MINER_CONSULTAR: `${BASE_URL}/api/v1/informes/miner-global/consultar`,
    MINER_EXPORTAR: `${BASE_URL}/api/v1/informes/miner-global/exportar-excel`,
    BASTIDORES_OBD_CONSULTAR: `${BASE_URL}/api/v1/informes/bastidores-obd-no-coincidentes/consultar`,
    BASTIDORES_OBD_EXPORTAR: `${BASE_URL}/api/v1/informes/bastidores-obd-no-coincidentes/exportar-excel`,
    INSP_RANGO_HORARIO_CONSULTAR: `${BASE_URL}/api/v1/informes/inspecciones-rango-horario`,
    INSP_RANGO_HORARIO_EXPORTAR: `${BASE_URL}/api/v1/informes/inspecciones-rango-horario/exportar-excel`,
    VOLUMEN_DEFECTOS_CONSULTAR: `${BASE_URL}/api/v1/informes/volumen-defectos`,
    VOLUMEN_DEFECTOS_EXPORTAR: `${BASE_URL}/api/v1/informes/volumen-defectos/exportar-excel`,
    VOLUMEN_DEFECTOS_BLOQUES: `${BASE_URL}/api/v1/informes/volumen-defectos/bloques`,
    VOLUMEN_DEFECTOS_ELEMENTOS: `${BASE_URL}/api/v1/informes/volumen-defectos/elementos`,
    CLIENTES_VOLUMEN_CONSULTAR: `${BASE_URL}/api/v1/informes/clientes-volumen/consultar`,
    CLIENTES_VOLUMEN_EXPORTAR: `${BASE_URL}/api/v1/informes/clientes-volumen/exportar-excel`,
    CLIENTES_VOLUMEN_PROYECTOS: `${BASE_URL}/api/v1/informes/clientes-volumen/proyectos-comerciales`,
    CLIENTES_VOLUMEN_TIPOS_VEHICULO: `${BASE_URL}/api/v1/informes/clientes-volumen/tipos-vehiculo`,
  },
  DOCS: {
    SWAGGER: `${BASE_URL}/swagger`,
    SCALAR: `${BASE_URL}/scalar/v1`,
  },
} as const;
