/**
/// Endpoints y rutas del API para Central Datos
**/
export const API_ENDPOINTS = {
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
  DOCS: {
    SWAGGER: '/swagger',
    SCALAR: '/scalar/v1',
  },
} as const;

