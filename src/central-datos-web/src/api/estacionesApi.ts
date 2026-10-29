import type { ResumenEstaciones } from '../features/estaciones/types/estaciones.types';
import { API_ENDPOINTS } from '../constants/api.constants';

export async function fetchUltimosDatosEstaciones(): Promise<ResumenEstaciones> {
  const res = await fetch(API_ENDPOINTS.ESTACIONES.ULTIMOS_DATOS);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
