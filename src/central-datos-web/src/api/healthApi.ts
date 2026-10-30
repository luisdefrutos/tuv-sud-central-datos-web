import { API_ENDPOINTS } from '../constants/api.constants';

export interface HealthStatusResponse {
  service: string;
  version: string;
  status: string;
  timestampUtc: string;
  entorno: 'PRODUCCION' | 'DESARROLLO' | string;
  esDesarrollo: boolean;
  dbHost?: string | null;
  infoTitle?: string | null;
}

/**
 * Consulta el endpoint de salud para obtener el estado del servicio y el entorno Oracle activo.
 */
export async function fetchHealthStatus(): Promise<HealthStatusResponse> {
  const res = await fetch(API_ENDPOINTS.HEALTH);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

