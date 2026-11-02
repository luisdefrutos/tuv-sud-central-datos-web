import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosReporteBasico,
  InformeDefectoObdResponse,
} from '../types/informes.types';

export interface FiltrosDefectoObd extends FiltrosReporteBasico {
  fase?: 'TODAS' | '1' | '2';
}

export const defectoObdApi = {
  /**
   * Consulta analítica de inspecciones con defectos OBD (Bloque 15)
   */
  async consultarDefectosObd(
    filtros: FiltrosDefectoObd,
    signal?: AbortSignal
  ): Promise<InformeDefectoObdResponse> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
      fase: filtros.fase || 'TODAS',
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.DEFECTO_OBD_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar el informe de defectos OBD.`;
      try {
        const errorJson = await res.json();
        if (errorJson?.errorMessage) {
          mensajeError = errorJson.errorMessage;
        }
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText) mensajeError = errorText;
      }
      throw new Error(mensajeError);
    }

    return res.json();
  },

  /**
   * Descarga el fichero estructurado Excel / CSV de defectos OBD
   */
  async descargarExcelDefectosObd(
    filtros: FiltrosDefectoObd,
    signal?: AbortSignal
  ): Promise<void> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
      fase: filtros.fase || 'TODAS',
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.DEFECTO_OBD_EXPORTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al exportar el fichero de defectos OBD.`;
      try {
        const errorJson = await res.json();
        if (errorJson?.errorMessage) {
          mensajeError = errorJson.errorMessage;
        }
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText) mensajeError = errorText;
      }
      throw new Error(mensajeError);
    }

    let nombreFichero = `defectos-obd-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const disposition = res.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        nombreFichero = match[1].replace(/['"]/g, '');
      }
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreFichero;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

