import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosBastidoresObd,
  InformeBastidoresObdResponse,
} from '../types/bastidoresObd.types';

export const bastidoresObdApi = {
  /**
   * Consulta analítica de bastidores OBD no coincidentes
   */
  async consultarBastidoresObd(
    filtros: FiltrosBastidoresObd,
    signal?: AbortSignal
  ): Promise<InformeBastidoresObdResponse> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.BASTIDORES_OBD_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar los bastidores OBD no coincidentes.`;
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

    const data = await res.json();

    // Adaptar graficoPorEstacion al formato esperado por ReportBarChartPoint
    const graficoAdaptado = (data.graficoPorEstacion || []).map((g: any) => ({
      id: g.codEstacion,
      label: `${g.codEstacion} - ${g.desEstacion}`,
      valor: g.totalDiscordancias,
      valorFormateado: `${g.totalDiscordancias} discordancias`,
      sociedad: g.claveSociedad,
      tooltipSubtitle: `${g.pctSobreTotal}% de las discordancias registradas`,
      detallesTooltip: [
        { nombre: 'Discordancias', valor: `${g.totalDiscordancias}` },
        { nombre: 'Sociedad', valor: g.claveSociedad },
      ],
    }));

    return {
      ...data,
      graficoPorEstacion: graficoAdaptado,
    };
  },

  /**
   * Descarga el archivo Excel oficial de bastidores OBD no coincidentes
   */
  async descargarExcelBastidoresObd(
    filtros: FiltrosBastidoresObd,
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
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.BASTIDORES_OBD_EXPORTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (res.status === 429) {
      throw new Error(
        'El servidor está procesando el número máximo de exportaciones simultáneas. Por favor, espere unos segundos e inténtelo de nuevo.'
      );
    }

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al descargar el archivo Excel.`;
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
    const a = document.createElement('a');
    a.href = url;

    const disposition = res.headers.get('content-disposition');
    let filename = `Informe_Bastidores_OBD_No_Coincidentes_${filtros.fechaInicio}_a_${filtros.fechaFin}.xlsx`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

