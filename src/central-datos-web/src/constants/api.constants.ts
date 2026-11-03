/**
/// Endpoints y rutas del API para Central Datos
**/
export const API_ENDPOINTS = {
  HEALTH: '/api/v1/health',
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
    AUDIT: '/api/v1/auth/audit',
    AUDIT_BATCH: '/api/v1/auth/audit/batch',
  },
  ESTACIONES: {
    ULTIMOS_DATOS: '/api/v1/estaciones/ultimos-datos',
  },
  INFORMES: {
    FACTURACION_CONSULTAR: '/api/v1/informes/facturacion/consultar',
    FACTURACION_EXPORTAR: '/api/v1/informes/facturacion/exportar-excel',
    NUMERO_INSPECCIONES_CONSULTAR: '/api/v1/informes/numero-inspecciones/consultar',
    NUMERO_INSPECCIONES_EXPORTAR: '/api/v1/informes/numero-inspecciones/exportar-excel',
    DURACION_PROMEDIO_CONSULTAR: '/api/v1/informes/duracion-promedio/consultar',
    DURACION_PROMEDIO_EXPORTAR: '/api/v1/informes/duracion-promedio/exportar-excel',
    DEFECTO_OBD_CONSULTAR: '/api/v1/informes/defecto-obd/consultar',
    DEFECTO_OBD_EXPORTAR: '/api/v1/informes/defecto-obd/exportar-excel',
    SIN_INSPECTOR_CONSULTAR: '/api/v1/informes/sin-inspector/consultar',
    SIN_INSPECTOR_EXPORTAR: '/api/v1/informes/sin-inspector/exportar-excel',
    CUPON_DESCUENTO_CONSULTAR: '/api/v1/informes/cupon-descuento/consultar',
    CUPON_DESCUENTO_EXPORTAR: '/api/v1/informes/cupon-descuento/exportar-excel',
    FACTURACION_COMPARATIVA_CONSULTAR: '/api/v1/informes/facturacion-comparativa/consultar',
    FACTURACION_COMPARATIVA_EXPORTAR: '/api/v1/informes/facturacion-comparativa/exportar-excel',
    MINER_CONSULTAR: '/api/v1/informes/miner-global/consultar',
    MINER_EXPORTAR: '/api/v1/informes/miner-global/exportar-excel',
    BASTIDORES_OBD_CONSULTAR: '/api/v1/informes/bastidores-obd-no-coincidentes/consultar',
    BASTIDORES_OBD_EXPORTAR: '/api/v1/informes/bastidores-obd-no-coincidentes/exportar-excel',
    INSP_RANGO_HORARIO_CONSULTAR: '/api/v1/informes/inspecciones-rango-horario',
    INSP_RANGO_HORARIO_EXPORTAR: '/api/v1/informes/inspecciones-rango-horario/exportar-excel',
    VOLUMEN_DEFECTOS_CONSULTAR: '/api/v1/informes/volumen-defectos',
    VOLUMEN_DEFECTOS_EXPORTAR: '/api/v1/informes/volumen-defectos/exportar-excel',
    VOLUMEN_DEFECTOS_BLOQUES: '/api/v1/informes/volumen-defectos/bloques',
    VOLUMEN_DEFECTOS_ELEMENTOS: '/api/v1/informes/volumen-defectos/elementos',
  },
  DOCS: {
    SWAGGER: '/swagger',
    SCALAR: '/scalar/v1',
  },
} as const;
