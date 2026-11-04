import { API_ENDPOINTS } from '../../../constants/api.constants';
import type {
  ClientesVolumenFiltro,
  ClientesVolumenResponse,
  ProyectoComercialItem,
  TipoVehiculoMinerItem,
} from '../types/clientesVolumen.types';

export const clientesVolumenApi = {
  consultar: async (filtro: ClientesVolumenFiltro, signal?: AbortSignal): Promise<ClientesVolumenResponse> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.CLIENTES_VOLUMEN_CONSULTAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filtro),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ errorMessage: 'Error al consultar informe de clientes por volumen' }));
      throw new Error(err.errorMessage || `Error del servidor (${res.status})`);
    }

    return res.json();
  },

  exportarExcel: async (filtro: ClientesVolumenFiltro, signal?: AbortSignal): Promise<void> => {
    const res = await fetch(API_ENDPOINTS.INFORMES.CLIENTES_VOLUMEN_EXPORTAR, {
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
    a.download = `Clientes_Volumen_${filtro.fechaInicio.replace(/-/g, '')}_${filtro.fechaFin.replace(/-/g, '')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  obtenerProyectos: async (signal?: AbortSignal): Promise<ProyectoComercialItem[]> => {
    try {
      const res = await fetch(API_ENDPOINTS.INFORMES.CLIENTES_VOLUMEN_PROYECTOS, { signal });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  obtenerTiposVehiculo: async (signal?: AbortSignal): Promise<TipoVehiculoMinerItem[]> => {
    try {
      const res = await fetch(API_ENDPOINTS.INFORMES.CLIENTES_VOLUMEN_TIPOS_VEHICULO, { signal });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
};


