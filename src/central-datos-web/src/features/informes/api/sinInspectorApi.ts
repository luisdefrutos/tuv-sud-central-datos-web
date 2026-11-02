import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  FiltrosReporteBasico,
  InformeSinInspectorResponse,
} from '../types/informes.types';

export interface FiltrosSinInspector extends FiltrosReporteBasico {
  fase?: 'TODAS' | '1' | '2';
}

export const sinInspectorApi = {
  /**
   * Consulta analítica de inspecciones sin inspector
   */
  async consultarSinInspector(
    filtros: FiltrosSinInspector,
    signal?: AbortSignal
  ): Promise<InformeSinInspectorResponse> {
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

    const res = await fetch(API_ENDPOINTS.INFORMES.SIN_INSPECTOR_CONSULTAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      let mensajeError = `Error ${res.status} al consultar las inspecciones sin inspector.`;
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
    // Adaptar graficoEstaciones (backend GraficoEstacionSinInspectorDto) a ReportBarChartPoint
    const graficoAdaptado = (data.graficoEstaciones || []).map((g: any) => ({
      id: g.codEstacion,
      label: `${g.codEstacion} - ${g.desEstacion}`,
      valor: g.totalInspecciones,
      valorFormateado: `${g.totalInspecciones} insp.`,
      sociedad: g.claveSociedad,
      tooltipSubtitle: `${g.pctSobreTotal}% del total de anomalías`,
      detallesTooltip: [
        { nombre: 'Fase 1 (1ª Inspección)', valor: `${g.totalFase1} insp.` },
        { nombre: 'Fase 2 (Segundas)', valor: `${g.totalFase2} insp.` },
        { nombre: 'Sociedad', valor: g.claveSociedad },
      ],
    }));

    return {
      ...data,
      graficoEstaciones: graficoAdaptado,
    };
  },

  /**
   * Descarga el libro Excel (.xlsx multi-pestaña) de inspecciones sin inspector
   */
  async descargarExcelSinInspector(
    filtros: FiltrosSinInspector,
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

    const res = await fetch(API_ENDPOINTS.INFORMES.SIN_INSPECTOR_EXPORTAR, {
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

    // Obtener nombre del header content-disposition o generar uno estándar
    const disposition = res.headers.get('content-disposition');
    let filename = `inspecciones-sin-inspector-${filtros.fechaInicio}-a-${filtros.fechaFin}.xlsx`;
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

