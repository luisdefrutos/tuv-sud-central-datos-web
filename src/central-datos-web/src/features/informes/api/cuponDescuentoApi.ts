import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosReporteBasico,
  InformeCuponDescuentoResponse,
} from '../types/informes.types';

export interface FiltrosCuponDescuento extends FiltrosReporteBasico {
  fase?: 'TODAS' | '1' | '2';
}

export const cuponDescuentoApi = {
  /**
   * Consulta analítica de inspecciones con cupón descuento
   */
  async consultarCuponDescuento(
    filtros: FiltrosCuponDescuento,
    signal?: AbortSignal
  ): Promise<InformeCuponDescuentoResponse> {
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

    const res = await fetch(API_ENDPOINTS.INFORMES.CUPON_DESCUENTO_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar las inspecciones con cupón de descuento.`;
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

    // Adaptar graficoEstaciones a ReportBarChartPoint
    const graficoEstacionesAdaptado = (data.graficoEstaciones || []).map((g: any) => ({
      id: g.codEstacion,
      label: `${g.codEstacion} - ${g.desEstacion}`,
      valor: g.totalInspecciones,
      valorFormateado: `${g.totalInspecciones} insp.`,
      sociedad: g.claveSociedad,
      tooltipSubtitle: `${g.pctSobreTotal}% del total de cupones`,
      detallesTooltip: [
        { nombre: 'Descuento total', valor: g.totalDescuentoFormatted },
        { nombre: 'Importe en caja', valor: g.totalAbonadoFormatted },
        { nombre: 'Sociedad', valor: g.claveSociedad },
      ],
    }));

    // Adaptar graficoPromociones a ReportBarChartPoint para ReportDonutChart
    const graficoPromocionesAdaptado = (data.graficoPromociones || []).map((p: any) => ({
      id: p.promocion,
      label: p.promocion,
      valor: p.totalInspecciones,
      valorFormateado: `${p.totalInspecciones} insp.`,
      tooltipSubtitle: `${p.pctSobreTotal}% del volumen promocional`,
      detallesTooltip: [
        { nombre: 'Inspecciones', valor: `${p.totalInspecciones} insp.` },
        { nombre: 'Descuento aplicado', valor: p.totalDescuentoFormatted },
      ],
    }));

    return {
      ...data,
      graficoEstaciones: graficoEstacionesAdaptado,
      graficoPromociones: graficoPromocionesAdaptado,
    };
  },

  /**
   * Descarga el libro Excel (.xlsx multi-pestaña) de inspecciones con cupón descuento
   */
  async descargarExcelCuponDescuento(
    filtros: FiltrosCuponDescuento,
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

    const res = await fetch(API_ENDPOINTS.INFORMES.CUPON_DESCUENTO_EXPORTAR, {
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
    let filename = `inspecciones-cupon-descuento-${filtros.fechaInicio}-a-${filtros.fechaFin}.xlsx`;
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

