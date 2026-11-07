import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  CatalogosLocalizacionResponse,
  FiltrosLocalizacionRequest,
  LocalizacionResponse,
  OpcionComboLocalizacion,
  SubdefectoLocalizacion,
  TipoLocalizacion,
} from '../types/localizacion.types';

export async function obtenerCatalogosLocalizacion(
  tipo: TipoLocalizacion,
  signal?: AbortSignal
): Promise<CatalogosLocalizacionResponse> {
  const response = await fetch(`${API_ENDPOINTS.INFORMES.LOCALIZACION_CATALOGOS}/${encodeURIComponent(tipo)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error al cargar catálogos de localización (${response.status})`);
  }

  return response.json();
}

export async function obtenerBloquesPorSeccion(
  seccionManual?: string,
  signal?: AbortSignal
): Promise<OpcionComboLocalizacion[]> {
  const query = seccionManual ? `?seccionManual=${encodeURIComponent(seccionManual)}` : '';
  const response = await fetch(`${API_ENDPOINTS.INFORMES.LOCALIZACION_BLOQUES}${query}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Error al cargar bloques (${response.status})`);
  }

  return response.json();
}

export async function obtenerElementosPorBloque(
  bloque: string,
  seccionManual?: string,
  signal?: AbortSignal
): Promise<OpcionComboLocalizacion[]> {
  const query = seccionManual ? `?seccionManual=${encodeURIComponent(seccionManual)}` : '';
  const response = await fetch(
    `${API_ENDPOINTS.INFORMES.LOCALIZACION_ELEMENTOS}/${encodeURIComponent(bloque)}${query}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Error al cargar elementos del bloque (${response.status})`);
  }

  return response.json();
}

export async function obtenerSubdefectosPorElemento(
  bloque: string,
  defecto: string,
  seccionManual?: string,
  signal?: AbortSignal
): Promise<SubdefectoLocalizacion[]> {
  const query = seccionManual ? `?seccionManual=${encodeURIComponent(seccionManual)}` : '';
  const response = await fetch(
    `${API_ENDPOINTS.INFORMES.LOCALIZACION_SUBDEFECTOS}/${encodeURIComponent(bloque)}/${encodeURIComponent(defecto)}${query}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Error al cargar subdefectos (${response.status})`);
  }

  return response.json();
}

export async function consultarLocalizacion(
  filtros: FiltrosLocalizacionRequest,
  signal?: AbortSignal
): Promise<LocalizacionResponse> {
  const response = await fetch(API_ENDPOINTS.INFORMES.LOCALIZACION_CONSULTAR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(filtros),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `Error al consultar localización (${response.status})`;
    try {
      const errorData = await response.json();
      if (errorData?.errorMessage) {
        errorMessage = errorData.errorMessage;
      }
    } catch {
      // Ignorar si no es JSON
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function exportarLocalizacionExcel(filtros: FiltrosLocalizacionRequest): Promise<void> {
  const startResponse = await fetch(API_ENDPOINTS.INFORMES.LOCALIZACION_EXPORTAR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filtros),
  });

  if (startResponse.status === 429) {
    throw new Error('Hay varias exportaciones pendientes en el servidor. Inténtelo de nuevo en unos minutos.');
  }

  if (!startResponse.ok) {
    throw new Error(await getExportErrorMessage(startResponse, `Error al iniciar la exportación (${startResponse.status})`));
  }

  const startData: { jobId?: string } = await startResponse.json();
  if (!startData.jobId) {
    throw new Error('El servidor no devolvió el identificador de la exportación.');
  }

  const jobUrl = `${API_ENDPOINTS.INFORMES.LOCALIZACION_EXPORTAR}/${encodeURIComponent(startData.jobId)}`;
  while (true) {
    const statusResponse = await fetch(jobUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!statusResponse.ok) {
      throw new Error(await getExportErrorMessage(statusResponse, `No se pudo consultar el estado de la exportación (${statusResponse.status})`));
    }

    const job: { status?: string; errorMessage?: string } = await statusResponse.json();
    if (job.status === 'failed') {
      throw new Error(job.errorMessage || 'No se pudo generar el archivo Excel.');
    }
    if (job.status === 'completed') break;
    if (job.status !== 'queued' && job.status !== 'processing') {
      throw new Error(`El servidor devolvió un estado de exportación desconocido: ${job.status ?? 'vacío'}.`);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }

  const link = document.createElement('a');
  link.href = `${jobUrl}/descargar`;
  link.download = '';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function getExportErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const errorData: { errorMessage?: string; detail?: string; title?: string } = await response.json();
    return errorData.errorMessage || errorData.detail || errorData.title || fallback;
  } catch {
    return fallback;
  }
}
