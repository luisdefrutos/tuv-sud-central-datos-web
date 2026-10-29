import type { ResumenEstaciones } from '../features/estaciones/types/estaciones.types';

export async function fetchUltimosDatosEstaciones(): Promise<ResumenEstaciones> {
  const res = await fetch('/api/v1/estaciones/ultimos-datos');
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

