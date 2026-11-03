import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { FiltrosMinerRequest, InformeMinerResponse } from '../types/miner.types';

export const minerApi = {
  /**
   * Consulta analítica de estadística MINER global
   */
  async consultarMinerGlobal(
    filtros: FiltrosMinerRequest,
    signal?: AbortSignal
  ): Promise<InformeMinerResponse> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.MINER_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar la estadística MINER.`;
      try {
        const data = await res.json();
        if (data && data.errorMessage) {
          mensajeError = data.errorMessage;
        }
      } catch {
        // Ignorar error al parsear JSON de error
      }
      throw new Error(mensajeError);
    }

    return await res.json();
  },

  /**
   * Exporta a Excel oficial (.xlsx sobre plantilla Industria.xls)
   */
  async exportarExcel(
    filtros: FiltrosMinerRequest,
    signal?: AbortSignal
  ): Promise<Blob> {
    const payload = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(API_ENDPOINTS.INFORMES.MINER_EXPORTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al exportar a Excel.`;
      try {
        const data = await res.json();
        if (data && data.errorMessage) {
          mensajeError = data.errorMessage;
        }
      } catch {
        // Ignorar error de deserialización
      }
      throw new Error(mensajeError);
    }

    return await res.blob();
  },
};

