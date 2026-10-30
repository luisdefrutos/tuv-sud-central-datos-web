import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { FiltrosReporteBasico, InformeFacturacionResponse } from '../types/informes.types';

/**
 * Cliente API para el Módulo de Informes de Facturación
 */
export async function consultarFacturacion(
  filtros: FiltrosReporteBasico
): Promise<InformeFacturacionResponse> {
  const payload = {
    fechaInicio: filtros.fechaInicio,
    fechaFin: filtros.fechaFin,
    sociedad: filtros.sociedad || 'TODAS',
    codEstaciones:
      filtros.codEstaciones && filtros.codEstaciones.length > 0
        ? filtros.codEstaciones
        : null,
  };

  const response = await fetch(API_ENDPOINTS.INFORMES.FACTURACION_CONSULTAR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status} al consultar informe de facturación`;
    try {
      const errJson = await response.json();
      if (errJson?.errorMessage) errorMsg = errJson.errorMessage;
    } catch {
      const errorText = await response.text().catch(() => '');
      if (errorText) errorMsg = errorText;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Descarga oficial del informe de facturación en formato CSV/Excel (UTF-8 con BOM y separador ;)
 */
export async function exportarFacturacionExcel(
  filtros: FiltrosReporteBasico
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

  const response = await fetch(API_ENDPOINTS.INFORMES.FACTURACION_EXPORTAR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = `Error ${response.status} al exportar archivo Excel de facturación`;
    try {
      const errJson = await response.json();
      if (errJson?.errorMessage) errorMsg = errJson.errorMessage;
    } catch {
      const errorText = await response.text().catch(() => '');
      if (errorText) errorMsg = errorText;
    }
    throw new Error(errorMsg);
  }

  // Extraer nombre de fichero sugerido en Content-Disposition o generar uno por defecto
  let filename = `facturacion-inspecciones-${new Date().toISOString().slice(0, 10)}.csv`;
  const disposition = response.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

