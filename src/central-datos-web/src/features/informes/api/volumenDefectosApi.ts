import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { CatalogoDefectoItem, VolumenDefectosFiltro, VolumenDefectosResponse } from '../types/volumenDefectos.types';

export const volumenDefectosApi = {
  consultar: async (filtro: VolumenDefectosFiltro, signal?: AbortSignal): Promise<VolumenDefectosResponse> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.VOLUMEN_DEFECTOS_CONSULTAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filtro),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ errorMessage: 'Error al consultar informe de volumen de defectos' }));
      throw new Error(err.errorMessage || `Error del servidor (${res.status})`);
    }

    return res.json();
  },

  exportarExcel: async (filtro: VolumenDefectosFiltro, signal?: AbortSignal): Promise<void> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.VOLUMEN_DEFECTOS_EXPORTAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filtro),
      signal,
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Hay demasiadas exportaciones en curso. Por favor espere unos segundos.');
      }
      const err = await res.json().catch(() => ({ errorMessage: 'Error al exportar a Excel' }));
      throw new Error(err.errorMessage || `Error del servidor (${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Volumen_Defectos_${filtro.fechaInicio.replace(/-/g, '')}_${filtro.fechaFin.replace(/-/g, '')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  obtenerBloques: async (signal?: AbortSignal): Promise<CatalogoDefectoItem[]> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.VOLUMEN_DEFECTOS_BLOQUES, { signal });
    if (!res.ok) return [];
    return res.json();
  },

  obtenerElementos: async (bloque: string, signal?: AbortSignal): Promise<CatalogoDefectoItem[]> => {
    if (!bloque || bloque === 'TODOS') return [];
    const res = await fetch(`${API_ENDPOINTS.INFORMES.VOLUMEN_DEFECTOS_ELEMENTOS}/${encodeURIComponent(bloque)}`, { signal });
    if (!res.ok) return [];
    return res.json();
  },
};

