import type {
  FiltrosEnviosRecordatorios,
  InformeEnviosRecordatoriosResponse,
  PlantillaRecordatorioCatalogo,
} from '../types/enviosRecordatorios.types';

const BASE_URL = '/api/v1/informes/envios-recordatorios';

export async function fetchPlantillasRecordatorio(
  signal?: AbortSignal
): Promise<PlantillaRecordatorioCatalogo[]> {
  const response = await fetch(`${BASE_URL}/plantillas`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error al obtener plantillas de recordatorio (${response.status})`);
  }

  return response.json();
}

export async function consultarEnviosRecordatorios(
  filtros: FiltrosEnviosRecordatorios,
  signal?: AbortSignal
): Promise<InformeEnviosRecordatoriosResponse> {
  const response = await fetch(`${BASE_URL}/consultar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(filtros),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const mensaje = errorBody?.errorMessage || `Error al consultar envíos (${response.status})`;
    throw new Error(mensaje);
  }

  return response.json();
}

export async function exportarExcelEnviosRecordatorios(
  filtros: FiltrosEnviosRecordatorios,
  signal?: AbortSignal
): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/exportar-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filtros),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const mensaje = errorBody?.errorMessage || `Error al exportar Excel (${response.status})`;
    throw new Error(mensaje);
  }

  return response.blob();
}

