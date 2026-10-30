import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import type {
  FilaFacturacion,
  FiltrosReporteBasico,
  InformeFacturacionResponse,
} from '../types/informes.types';
import { consultarFacturacion, exportarFacturacionExcel } from '../api/facturacionApi';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { useAuth } from '../../auth/context/AuthContext';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type SortableColumn =
  | 'codEstacion'
  | 'desEstacion'
  | 'claveSociedad'
  | 'nombreEmpresa'
  | 'totalInspecciones'
  | 'totalIngresos'
  | 'ticketMedio';

export type ChartViewMode = 'bar' | 'donut';

export function useFacturacionReport() {
  const { user } = useAuth();
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

  // Estaciones autorizadas para el usuario en sesión (o todas si es supervisor)
  const estacionesPermitidas = useMemo(() => {
    if (!user || user.isSupervisor || !user.allowedStations || user.allowedStations.length === 0) {
      return ESTACIONES_OFICIALES.map((e) => e.codigo);
    }
    return user.allowedStations;
  }, [user]);

  // 1. Estados de Filtros (inician con el mes en curso para reflejar los datos de Producción en vivo)
  const [fechaInicio, setFechaInicio] = useState<string>(toDateInputValue(primerDiaMes));
  const [fechaFin, setFechaFin] = useState<string>(toDateInputValue(now));
  const [sociedad, setSociedad] = useState<FiltroSociedad>('TODAS');
  const [estacionesSeleccionadas, setEstacionesSeleccionadas] = useState<string[]>(estacionesPermitidas);

  // Sincronizar estaciones seleccionadas si se cargan o actualizan las del usuario logueado
  useEffect(() => {
    setEstacionesSeleccionadas(estacionesPermitidas);
  }, [estacionesPermitidas]);

  // 2. Estados de Carga y Datos
  const [data, setData] = useState<InformeFacturacionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Alerta específica en tiempo real para TsAlert de validación de fechas (máximo 1 año)
  const [alertaRangoFechas, setAlertaRangoFechas] = useState<string | null>(null);

  // 3. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 4. Estados de Búsqueda y Ordenación en Tabla
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortableColumn>('totalIngresos');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 5. Modo de visualización del Gráfico (Barras / Donut Circular)
  const [chartMode, setChartMode] = useState<ChartViewMode>('bar');

  // Validación de Rango de Fechas (Máximo 1 año = 365 días)
  const validarRango = useCallback((inicio: string, fin: string): string | null => {
    if (!inicio || !fin) {
      return 'Debe indicar tanto la fecha de inicio como la fecha final.';
    }
    const partsIni = inicio.split('-').map(Number);
    const partsFin = fin.split('-').map(Number);
    if (partsIni.length < 3 || partsFin.length < 3) {
      return 'Formato de fecha inválido.';
    }
    const dIni = new Date(partsIni[0], partsIni[1] - 1, partsIni[2]);
    const dFin = new Date(partsFin[0], partsFin[1] - 1, partsFin[2]);
    if (dFin < dIni) {
      return 'La fecha final no puede ser anterior a la fecha de inicio.';
    }
    const diffTime = dFin.getTime() - dIni.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      return `El rango seleccionado (${diffDays} días) supera el límite máximo permitido de 1 año (365 días) para optimizar el rendimiento de la consulta.`;
    }
    return null;
  }, []);

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val);
    const err = validarRango(val, fechaFin);
    setAlertaRangoFechas(err);
  };

  const handleFechaFinChange = (val: string) => {
    setFechaFin(val);
    const err = validarRango(fechaInicio, val);
    setAlertaRangoFechas(err);
  };

  const ajustarAUnAno = () => {
    if (!fechaInicio) return;
    const dIni = new Date(fechaInicio);
    const dFin = new Date(dIni);
    dFin.setFullYear(dFin.getFullYear() + 1);
    const valFin = toDateInputValue(dFin);
    setFechaFin(valFin);
    setAlertaRangoFechas(null);
    if (error && error.includes('rango')) setError(null);
  };

  // Función de consulta al backend con doble validación.
  // RENDIMIENTO: al servidor solo se le piden las fechas (todas las estaciones de una vez).
  // Sociedad (CAL/TSA) y estaciones se filtran en memoria al instante, sin nuevas consultas.
  const consultar = useCallback(async () => {
    const errorValidacion = validarRango(fechaInicio, fechaFin);
    if (errorValidacion) {
      setAlertaRangoFechas(errorValidacion);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAlertaRangoFechas(null);

    const filtros: FiltrosReporteBasico = {
      fechaInicio,
      fechaFin,
      sociedad: 'TODAS',
      codEstaciones: undefined,
    };

    try {
      const response = await consultarFacturacion(filtros);
      setData(response);
    } catch (err: any) {
      console.error('[useFacturacionReport] Error consultando informe:', err);
      setData(null);
      setError(
        err?.message ||
          'No se pudo obtener el informe de facturación. Verifique la conexión con Central Datos.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, validarRango]);

  // Carga inicial ÚNICA al abrir la pantalla (después solo al pulsar "Consultar")
  useEffect(() => {
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manejador de ordenación de columnas
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(
        column === 'totalIngresos' || column === 'totalInspecciones' || column === 'ticketMedio'
          ? 'desc'
          : 'asc'
      );
    }
  };

  // Filas filtradas por sociedad, estaciones seleccionadas, búsqueda de texto y ordenadas
  const filasFiltradas = useMemo(() => {
    if (!data?.filas) return [];

    let result = [...data.filas];

    // 1. Filtro Interactivo por Sociedad (TODAS / TSA / CAL) en memoria
    if (sociedad !== 'TODAS') {
      result = result.filter(
        (f) => f.claveSociedad?.toUpperCase() === sociedad.toUpperCase()
      );
    }

    // 2. Filtro Interactivo por Estaciones seleccionadas
    if (estacionesSeleccionadas.length === 0) {
      return []; // Si se desmarcan todas, la tabla se limpia a 0 inmediatamente
    }
    if (estacionesSeleccionadas.length < ESTACIONES_OFICIALES.length) {
      result = result.filter((f) => estacionesSeleccionadas.includes(f.codEstacion));
    }

    // 3. Filtro por término de búsqueda (en memoria)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.codEstacion.toLowerCase().includes(term) ||
          f.desEstacion.toLowerCase().includes(term) ||
          f.nombreEmpresa.toLowerCase().includes(term) ||
          f.claveSociedad.toLowerCase().includes(term)
      );
    }

    // 4. Ordenación determinista
    result.sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? comp : -comp;
      }

      if (typeof valA === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });

    return result;
  }, [data?.filas, sociedad, estacionesSeleccionadas, searchTerm, sortColumn, sortDirection]);

  // Totales dinámicos calculados a partir de las filas visibles
  // (Si no hay resultados coincidentes, se limpian a 0)
  const totalesVisibles = useMemo(() => {
    if (filasFiltradas.length === 0) {
      return {
        totalInspecciones: 0,
        totalFacturacion: 0,
        totalFacturacionFormatted: '0,00 €',
        ticketMedioGlobalFormatted: '0,00 €',
        totalEstaciones: 0,
      };
    }

    const totalInspecciones = filasFiltradas.reduce((acc, f) => acc + f.totalInspecciones, 0);
    const totalFacturacion = filasFiltradas.reduce((acc, f) => acc + f.totalIngresos, 0);
    const ticketMedioGlobal =
      totalInspecciones > 0 ? totalFacturacion / totalInspecciones : 0;

    return {
      totalInspecciones,
      totalFacturacion,
      totalFacturacionFormatted: totalFacturacion.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }),
      ticketMedioGlobalFormatted: ticketMedioGlobal.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
      }),
      totalEstaciones: filasFiltradas.length,
    };
  }, [filasFiltradas]);

  // Puntos del gráfico ajustados a la sociedad, estaciones y búsqueda interactiva
  const graficoPuntos = useMemo(() => {
    if (!data?.grafico) return [];

    // Puntos del gráfico sincronizados exactamente con las filas visibles
    const codigosVisibles = new Set(filasFiltradas.map((f) => f.codEstacion));
    return data.grafico.filter((p) => codigosVisibles.has(p.id));
  }, [data?.grafico, filasFiltradas]);

  // Descarga de Excel
  const exportarExcel = async () => {
    // Si no hay filas visibles en el grid, no exportar y mostrar alerta informativa
    if (filasFiltradas.length === 0) {
      setExportError(
        'No hay datos disponibles para exportar con los filtros o el texto de búsqueda actual.'
      );
      return;
    }

    setIsExporting(true);
    setExportError(null);

    const filtros: FiltrosReporteBasico = {
      fechaInicio,
      fechaFin,
      sociedad,
      codEstaciones:
        searchTerm.trim() !== ''
          ? filasFiltradas.map((f) => f.codEstacion)
          : estacionesSeleccionadas.length > 0
          ? estacionesSeleccionadas
          : undefined,
    };

    try {
      await exportarFacturacionExcel(filtros);
    } catch (err: any) {
      console.error('[useFacturacionReport] Error exportando a Excel:', err);
      setExportError(
        err?.message || 'Error al exportar el fichero de facturación a Excel.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return {
    // Filtros
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    estacionesPermitidas,
    handleFechaInicioChange,
    handleFechaFinChange,
    setSociedad,
    setEstacionesSeleccionadas,
    consultar,
    alertaRangoFechas,
    ajustarAUnAno,

    // Datos y estados
    data,
    isLoading,
    error,
    setError,

    // Búsqueda y ordenación
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    filasFiltradas,
    totalesVisibles,

    // Gráficos
    chartMode,
    setChartMode,
    graficoPuntos,

    // Exportación
    exportarExcel,
    isExporting,
    exportError,
    setExportError,
  };
}
