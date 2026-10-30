import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosDuracionPromedio,
  InformeDuracionPromedioResponse,
} from '../types/informes.types';

export const duracionPromedioApi = {
  /**
   * Consulta analítica de duración promedio de inspecciones periódicas 001
   */
  async consultarDuracionPromedio(
    filtros: FiltrosDuracionPromedio,
    signal?: AbortSignal
  ): Promise<InformeDuracionPromedioResponse> {
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

    const res = await fetch(API_ENDPOINTS.INFORMES.DURACION_PROMEDIO_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar el informe de duración promedio.`;
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
  async exportarExcel(filtros: FiltrosDuracionPromedio): Promise<void> {
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

    const res = await fetch(API_ENDPOINTS.INFORMES.DURACION_PROMEDIO_EXPORTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al exportar la duración promedio a Excel.`;
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

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extraer nombre del archivo del header o usar uno por defecto
    const disposition = res.headers.get('content-disposition');
    let filename = `duracion-promedio-${new Date().toISOString().slice(0, 10)}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

