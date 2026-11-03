import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { InformeFacturacionComparativaResponse } from '../types/informes.types';

export interface FiltrosFacturacionComparativa {
  fechaInicioRango1: string;
  fechaFinRango1: string;
  fechaInicioRango2: string;
  fechaFinRango2: string;
  sociedad?: 'TODAS' | 'TSA' | 'CAL';
  codEstaciones?: string[];
}

export const facturacionComparativaApi = {
  /**
   * Consulta analítica de facturación e inspecciones comparativa (TSA / CAL)
   */
  async consultarFacturacionComparativa(
    filtros: FiltrosFacturacionComparativa,
    signal?: AbortSignal
  ): Promise<InformeFacturacionComparativaResponse> {
    const payload = {
      fechaInicioRango1: filtros.fechaInicioRango1,
      fechaFinRango1: filtros.fechaFinRango1,
      fechaInicioRango2: filtros.fechaInicioRango2,
      fechaFinRango2: filtros.fechaFinRango2,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(
      API_ENDPOINTS.INFORMES.FACTURACION_COMPARATIVA_CONSULTAR,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      }
    );

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar la facturación comparativa.`;
      try {
        const data = await res.json();
        if (data && data.errorMessage) {
          mensajeError = data.errorMessage;
        }
      } catch {
        // Fallback al mensaje por código HTTP
      }
      throw new Error(mensajeError);
    }

    return (await res.json()) as InformeFacturacionComparativaResponse;
  },

  /**
   * Descarga el libro Excel oficial de facturación comparativa (.xlsx)
   */
  async exportarExcel(
    filtros: FiltrosFacturacionComparativa,
    signal?: AbortSignal
  ): Promise<Blob> {
    const payload = {
      fechaInicioRango1: filtros.fechaInicioRango1,
      fechaFinRango1: filtros.fechaFinRango1,
      fechaInicioRango2: filtros.fechaInicioRango2,
      fechaFinRango2: filtros.fechaFinRango2,
      sociedad: filtros.sociedad || 'TODAS',
      codEstaciones:
        filtros.codEstaciones && filtros.codEstaciones.length > 0
          ? filtros.codEstaciones
          : null,
    };

    const res = await fetch(
      API_ENDPOINTS.INFORMES.FACTURACION_COMPARATIVA_EXPORTAR,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      }
    );

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al exportar el fichero Excel de facturación comparativa.`;
      try {
        const data = await res.json();
        if (data && data.errorMessage) {
          mensajeError = data.errorMessage;
        }
      } catch {
        // Fallback al código HTTP
      }
      throw new Error(mensajeError);
    }

    return await res.blob();
  },
};

