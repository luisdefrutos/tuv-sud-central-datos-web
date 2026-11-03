import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { InspRangoHorarioFiltro, InspRangoHorarioResponse } from '../types/inspRangoHorario.types';

export const inspRangoHorarioApi = {
  consultar: async (filtro: InspRangoHorarioFiltro, signal?: AbortSignal): Promise<InspRangoHorarioResponse> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.INSP_RANGO_HORARIO_CONSULTAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filtro),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ errorMessage: 'Error al consultar informe de rango horario' }));
      throw new Error(err.errorMessage || `Error del servidor (${res.status})`);
    }

    return res.json();
  },

  exportarExcel: async (filtro: InspRangoHorarioFiltro, signal?: AbortSignal): Promise<void> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.INSP_RANGO_HORARIO_EXPORTAR, {
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
    a.download = `Inspecciones_Rango_Horario_${filtro.fechaInicio.replace(/-/g, '')}_${filtro.fechaFin.replace(/-/g, '')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

