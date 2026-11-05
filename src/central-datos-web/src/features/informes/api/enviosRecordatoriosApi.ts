import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosEnviosRecordatorios,
  InformeEnviosRecordatoriosResponse,
  PlantillaRecordatorioCatalogo,
} from '../types/enviosRecordatorios.types';

export async function fetchPlantillasRecordatorio(
  signal?: AbortSignal
): Promise<PlantillaRecordatorioCatalogo[]> {
  const response = await fetch(API_ENDPOINTS.INFORMES.ENVIOS_RECORDATORIOS_PLANTILLAS, {
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
  const response = await fetch(API_ENDPOINTS.INFORMES.ENVIOS_RECORDATORIOS_CONSULTAR, {
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
  const response = await fetch(API_ENDPOINTS.INFORMES.ENVIOS_RECORDATORIOS_EXPORTAR, {
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

