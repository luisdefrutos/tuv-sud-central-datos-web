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
  const response = await fetch(API_ENDPOINTS.INFORMES.LOCALIZACION_EXPORTAR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filtros),
  });

  if (response.status === 429) {
    throw new Error('Hay otras exportaciones pesadas en curso en el servidor. Inténtelo de nuevo en unos segundos.');
  }

  if (!response.ok) {
    let errorMessage = `Error al generar el archivo Excel (${response.status})`;
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

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = `LOCALIZACION_${filtros.tipo.toUpperCase()}_${filtros.fechaInicio.replace(/-/g, '')}.xlsx`;

  if (contentDisposition) {
    const matchUtf8 = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    const matchAscii = contentDisposition.match(/filename="?([^";\n]+)"?/i);
    if (matchUtf8?.[1]) {
      filename = decodeURIComponent(matchUtf8[1]);
    } else if (matchAscii?.[1]) {
      filename = matchAscii[1];
    }
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
