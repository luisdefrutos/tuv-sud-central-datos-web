import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ResumenEstaciones,
  FiltroSociedad,
  EstacionDato,
  ColumnaOrden,
  DireccionOrden,
} from '../types/estaciones.types';
import { fetchUltimosDatosEstaciones } from '../../../api/estacionesApi';
import { SOCIEDADES } from '../../../constants/companies.constants';
import { useAuth } from '../../auth/context/AuthContext';

export interface EstadoOrden {
  columna: ColumnaOrden;
  direccion: DireccionOrden;
}

export interface ResumenMetricasEstaciones {
  totalEstaciones: number;
  totalTsa: number;
  totalCal: number;
  ultimaFechaGlobal: string;
}

export interface UseUltimosDatosReturn {
  data: ResumenEstaciones | null;
  resumenMetricas: ResumenMetricasEstaciones;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filtroSociedad: FiltroSociedad;
  setFiltroSociedad: (sociedad: FiltroSociedad) => void;
  ordenColumna: ColumnaOrden;
  ordenDireccion: DireccionOrden;
  cambiarOrden: (columna: ColumnaOrden) => void;
  estacionesFiltradas: EstacionDato[];
  recargar: () => Promise<void>;
  alertaExportacion: string | null;
  limpiarAlertaExportacion: () => void;
  exportarExcelCsv: () => void;
}

/**
 * Custom Hook: useUltimosDatos
 * 
 * Centraliza la obtención de datos, filtrado reactivo en memoria (búsqueda y sociedad),
 * ordenación multi-columna atómica e inquebrantable de 2 estados (asc <-> desc)
 * y la exportación autónoma a Excel/CSV en el navegador sin dependencias de servidor.
 * Restringe de forma estricta las estaciones visibles a las autorizadas para el usuario activo.
 */
export function useUltimosDatos(): UseUltimosDatosReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ResumenEstaciones | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroSociedad, setFiltroSociedad] = useState<FiltroSociedad>('TODAS');
  const [orden, setOrden] = useState<EstadoOrden>({
    columna: 'nombreEmpresa',
    direccion: 'asc',
  });
  const [alertaExportacion, setAlertaExportacion] = useState<string | null>(null);

  // Conjunto de códigos de estación permitidos para el usuario en sesión
  const estacionesPermitidas = useMemo(() => {
    if (!user || user.isSupervisor || !user.allowedStations || user.allowedStations.length === 0) {
      return null; // Supervisor ve toda la red
    }
    return new Set(user.allowedStations.map((s) => String(s).padStart(4, '0')));
  }, [user]);

  /**
   * Alternancia estricta y atómica de 2 estados (asc <-> desc):
   * - Si se pulsa una columna diferente: se activa en 'asc'.
   * - Si se pulsa la misma columna N veces: se invierte atómicamente ('asc' <-> 'desc').
   */
  const cambiarOrden = useCallback((columna: ColumnaOrden) => {
    setOrden((prev) => {
      if (prev.columna !== columna) {
        return { columna, direccion: 'asc' };
      }
      return {
        columna,
        direccion: prev.direccion === 'asc' ? 'desc' : 'asc',
      };
    });
  }, []);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await fetchUltimosDatosEstaciones();
      setData(json);
    } catch (err: any) {
      console.error('[Estaciones] Error técnico al obtener datos:', err);
      setError('No ha sido posible recuperar los datos centralizados de las estaciones. Si la incidencia persiste, contacte con el departamento de soporte técnico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Estaciones base filtradas según los permisos de asignación del usuario
  const estacionesBase = useMemo(() => {
    if (!data?.estaciones) return [];
    if (!estacionesPermitidas) return data.estaciones;
    return data.estaciones.filter((e) => {
      const codePadded = String(e.codEstacion).padStart(4, '0');
      return estacionesPermitidas.has(e.codEstacion) || estacionesPermitidas.has(codePadded);
    });
  }, [data?.estaciones, estacionesPermitidas]);

  // Resumen métrico adaptado dinámicamente a las estaciones autorizadas del usuario
  const resumenMetricas = useMemo((): ResumenMetricasEstaciones => {
    if (!data) {
      return {
        totalEstaciones: 0,
        totalTsa: 0,
        totalCal: 0,
        ultimaFechaGlobal: 'N/D',
      };
    }

    if (!estacionesPermitidas) {
      return {
        totalEstaciones: data.totalEstaciones,
        totalTsa: data.totalTsa,
        totalCal: data.totalCal,
        ultimaFechaGlobal: data.ultimaFechaGlobal,
      };
    }

    const totalEstaciones = estacionesBase.length;
    const totalTsa = estacionesBase.filter((e) => e.codEmpresa === SOCIEDADES.ATISAE.codigo).length;
    const totalCal = estacionesBase.filter((e) => e.codEmpresa === SOCIEDADES.CAL.codigo).length;

    let ultimaFechaStr = 'N/D';
    let maxTimestamp = 0;
    for (const est of estacionesBase) {
      if (est.ultimaInspeccion) {
        const t = new Date(est.ultimaInspeccion).getTime();
        if (t > maxTimestamp) {
          maxTimestamp = t;
          ultimaFechaStr = est.ultimaInspeccionFormatted || est.ultimaInspeccion;
        }
      }
    }

    return {
      totalEstaciones,
      totalTsa,
      totalCal,
      ultimaFechaGlobal: ultimaFechaStr,
    };
  }, [data, estacionesBase, estacionesPermitidas]);

  // Filtrado reactivo y ordenación atómica en memoria sobre las estaciones autorizadas
  const estacionesFiltradas = useMemo(() => {
    if (estacionesBase.length === 0) return [];

    const term = (searchTerm || '').trim().toLowerCase();

    const filtradas = estacionesBase.filter((item) => {
      const cod = (item.codEstacion || '').toLowerCase();
      const des = (item.desEstacion || '').toLowerCase();
      const matchText = term === '' || cod.includes(term) || des.includes(term);

      const matchSociedad =
        filtroSociedad === 'TODAS' ||
        (filtroSociedad === SOCIEDADES.ATISAE.clave && item.codEmpresa === SOCIEDADES.ATISAE.codigo) ||
        (filtroSociedad === SOCIEDADES.CAL.clave && item.codEmpresa === SOCIEDADES.CAL.codigo);

      return matchText && matchSociedad;
    });

    return [...filtradas].sort((a, b) => {
      let resultado = 0;
      switch (orden.columna) {
        case 'codEstacion': {
          const codA = a.codEstacion || '';
          const codB = b.codEstacion || '';
          resultado = codA.localeCompare(codB, undefined, { numeric: true });
          break;
        }
        case 'desEstacion': {
          const desA = a.desEstacion || '';
          const desB = b.desEstacion || '';
          resultado = desA.localeCompare(desB, 'es', { sensitivity: 'base' });
          break;
        }
        case 'nombreEmpresa': {
          const getPesoSociedad = (e: EstacionDato): number => {
            if (e.codEmpresa === SOCIEDADES.ATISAE.codigo || (e.nombreEmpresa || '').includes('ATISAE') || (e.nombreEmpresa || '').includes('TSA')) {
              return 1;
            }
            if (e.codEmpresa === SOCIEDADES.CAL.codigo || (e.nombreEmpresa || '').includes('CAL')) {
              return 2;
            }
            return 99;
          };
          resultado = getPesoSociedad(a) - getPesoSociedad(b);
          break;
        }
        case 'ultimaInspeccion': {
          const tA = a.ultimaInspeccion ? new Date(a.ultimaInspeccion).getTime() : 0;
          const tB = b.ultimaInspeccion ? new Date(b.ultimaInspeccion).getTime() : 0;
          const validA = Number.isFinite(tA) ? tA : 0;
          const validB = Number.isFinite(tB) ? tB : 0;
          resultado = validA - validB;
          break;
        }
        case 'estadoSincronizacion': {
          const dA = typeof a.diasSinTransmitir === 'number' && Number.isFinite(a.diasSinTransmitir) ? a.diasSinTransmitir : 999999;
          const dB = typeof b.diasSinTransmitir === 'number' && Number.isFinite(b.diasSinTransmitir) ? b.diasSinTransmitir : 999999;
          resultado = dA - dB;
          break;
        }
        default:
          resultado = 0;
      }

      if (resultado !== 0) {
        return orden.direccion === 'asc' ? resultado : -resultado;
      }

      const nomA = a.desEstacion || '';
      const nomB = b.desEstacion || '';
      const desempateNombre = nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
      if (desempateNombre !== 0) {
        return desempateNombre;
      }
      return (a.codEstacion || '').localeCompare(b.codEstacion || '');
    });
  }, [estacionesBase, searchTerm, filtroSociedad, orden.columna, orden.direccion]);

  const limpiarAlertaExportacion = useCallback(() => {
    setAlertaExportacion(null);
  }, []);

  /**
   * Exportación 100% autónoma en el navegador:
   * Exporta estrictamente las estaciones visibles en el grid según los filtros actuales y permisos.
   */
  const exportarExcelCsv = useCallback(() => {
    if (!estacionesFiltradas || estacionesFiltradas.length === 0) {
      setAlertaExportacion('No hay datos disponibles en la tabla para exportar con los filtros seleccionados.');
      return;
    }

    setAlertaExportacion(null);

    const cabeceras = [
      'Código',
      'Estación',
      'Sociedad',
      'Última Inspección Centralizada',
      'Estado Centralización',
      'Días sin Transmitir',
    ];

    const filas = estacionesFiltradas.map((e) => [
      `"${e.codEstacion}"`,
      `"${e.desEstacion.replace(/"/g, '""')}"`,
      `"${e.nombreEmpresa.replace(/"/g, '""')}"`,
      `"${e.ultimaInspeccionFormatted}"`,
      `"${e.estadoSincronizacionLabel}"`,
      `"${e.diasSinTransmitir ?? ''}"`,
    ]);

    const contenidoCsv = '\uFEFF' + [cabeceras.join(';'), ...filas.map((f) => f.join(';'))].join('\r\n');
    const blob = new Blob([contenidoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const ahora = new Date();
    const fechaFmt = ahora.toISOString().slice(0, 10).replace(/-/g, '');
    const horaFmt = ahora.toTimeString().slice(0, 5).replace(':', '');

    link.href = url;
    link.setAttribute('download', `CentralDatos_Estaciones_${fechaFmt}_${horaFmt}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [estacionesFiltradas]);

  return {
    data,
    resumenMetricas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtroSociedad,
    setFiltroSociedad,
    ordenColumna: orden.columna,
    ordenDireccion: orden.direccion,
    cambiarOrden,
    estacionesFiltradas,
    recargar: cargarDatos,
    alertaExportacion,
    limpiarAlertaExportacion,
    exportarExcelCsv,
  };
}
