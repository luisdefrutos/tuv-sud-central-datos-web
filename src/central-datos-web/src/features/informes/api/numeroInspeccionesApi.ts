import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosReporteBasico,
  InformeNumeroInspeccionesResponse,
} from '../types/informes.types';

export const numeroInspeccionesApi = {
  /**
   * Consulta analítica de número de inspecciones (Favorables y Rechazadas por Fase)
   */
  async consultarNumeroInspecciones(
    filtros: FiltrosReporteBasico,
    signal?: AbortSignal
  ): Promise<InformeNumeroInspeccionesResponse> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.NUMERO_INSPECCIONES_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar el informe de número de inspecciones.`;
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
   * Exporta a fichero Excel / CSV delimitado por punto y coma con BOM UTF-8
   */
  async exportarExcel(filtros: FiltrosReporteBasico): Promise<void> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.NUMERO_INSPECCIONES_EXPORTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMsg = `Error ${res.status} al exportar archivo Excel de número de inspecciones`;
      try {
        const errJson = await res.json();
        if (errJson?.errorMessage) errorMsg = errJson.errorMessage;
      } catch {
        const errorText = await res.text().catch(() => '');
        if (errorText) errorMsg = errorText;
      }
      throw new Error(errorMsg);
    }

    let filename = `numero-inspecciones-${filtros.fechaInicio}-al-${filtros.fechaFin}.csv`;
    const disposition = res.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
