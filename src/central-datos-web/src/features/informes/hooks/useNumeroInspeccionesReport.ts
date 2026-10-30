import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import type {
  FiltrosReporteBasico,
  InformeNumeroInspeccionesResponse,
  ReportKpiData,
  SortableNumeroInspeccionesColumn,
} from '../types/informes.types';
import { numeroInspeccionesApi } from '../api/numeroInspeccionesApi';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { useAuth } from '../../auth/context/AuthContext';

export type { SortableNumeroInspeccionesColumn };
export type ChartViewMode = 'bar' | 'donut';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useNumeroInspeccionesReport() {
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

  // 1. Estados de Filtros
  const [fechaInicio, setFechaInicio] = useState<string>(toDateInputValue(primerDiaMes));
  const [fechaFin, setFechaFin] = useState<string>(toDateInputValue(now));
  const [sociedad, setSociedad] = useState<FiltroSociedad>('TODAS');
  const [estacionesSeleccionadas, setEstacionesSeleccionadas] = useState<string[]>(estacionesPermitidas);

  // Sincronizar estaciones seleccionadas si se cargan o actualizan las del usuario logueado
  useEffect(() => {
    setEstacionesSeleccionadas(estacionesPermitidas);
  }, [estacionesPermitidas]);

  // 2. Estados de Carga y Datos
  const [data, setData] = useState<InformeNumeroInspeccionesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [alertaRangoFechas, setAlertaRangoFechas] = useState<string | null>(null);

  // 3. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 4. Estados de Búsqueda y Ordenación en Tabla
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortableNumeroInspeccionesColumn>('totalInspecciones');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 5. Modo de visualización del Gráfico (Barras / Donut Circular)
  const [chartMode, setChartMode] = useState<ChartViewMode>('bar');

  // Validación de Rango de Fechas (Máximo 1 año)
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
    dFin.setDate(dFin.getDate() - 1);
    setFechaFin(toDateInputValue(dFin));
    setAlertaRangoFechas(null);
  };

  // Función de consulta al backend.
  // Descarga los datos de todas las estaciones de la red para las fechas dadas,
  // permitiendo que el filtrado por sociedad o desmarcado de estaciones sea 100% interactivo en memoria.
  const cargarInforme = useCallback(async () => {
    const errorValidacion = validarRango(fechaInicio, fechaFin);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filtros: FiltrosReporteBasico = {
        fechaInicio,
        fechaFin,
        sociedad: 'TODAS',
        codEstaciones: undefined,
      };

      const respuesta = await numeroInspeccionesApi.consultarNumeroInspecciones(filtros);
      setData(respuesta);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al consultar el informe.';
      setError(mensaje);
    } finally {
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, validarRango]);

  // Carga inicial al montar el componente
  useEffect(() => {
    cargarInforme();
  }, [cargarInforme]);

  // Ordenación de columnas
  const handleSort = (column: SortableNumeroInspeccionesColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(
        column === 'codEstacion' || column === 'desEstacion' || column === 'claveSociedad'
          ? 'asc'
          : 'desc'
      );
    }
  };

  // 1. Filtrado y Ordenación de las filas en memoria
  // Si no hay estaciones seleccionadas, la tabla se limpia a [] de inmediato
  const filasFiltradasYOrdenadas = useMemo(() => {
    if (!data?.filas) return [];

    // Si se desmarcan todas las estaciones, se limpia la tabla a 0 de forma inmediata
    if (estacionesSeleccionadas.length === 0) {
      return [];
    }

    let lista = [...data.filas];

    // 1.1 Filtrado interactivo por Sociedad (TODAS / TSA / CAL) en memoria
    if (sociedad !== 'TODAS') {
      lista = lista.filter((f) => f.claveSociedad?.toUpperCase() === sociedad.toUpperCase());
    }

    // 1.2 Filtrado interactivo por Estaciones seleccionadas
    if (estacionesSeleccionadas.length < ESTACIONES_OFICIALES.length) {
      lista = lista.filter((f) => estacionesSeleccionadas.includes(f.codEstacion));
    }

    // 1.3 Filtrado por término de búsqueda rápido
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      lista = lista.filter(
        (f) =>
          f.codEstacion.toLowerCase().includes(term) ||
          f.desEstacion.toLowerCase().includes(term) ||
          f.nombreEmpresa.toLowerCase().includes(term) ||
          f.claveSociedad.toLowerCase().includes(term)
      );
    }

    // 1.4 Ordenación determinista
    lista.sort((a, b) => {
      const colKey = sortColumn as keyof typeof a;
      const valA = a[colKey];
      const valB = b[colKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return lista;
  }, [data?.filas, estacionesSeleccionadas, sociedad, searchTerm, sortColumn, sortDirection]);

  // 2. Tarjetas KPI Dinámicas
  // Si no hay estaciones seleccionadas, los KPIs se limpian a 0
  const kpisDinamicos = useMemo((): ReportKpiData[] => {
    if (filasFiltradasYOrdenadas.length === 0) {
      return [
        {
          id: 'kpi-total-inspecciones',
          titulo: 'Total Inspecciones',
          valor: '0',
          subtitulo: '0 estaciones seleccionadas',
          variant: 'neutral',
          icon: '🚗',
        },
        {
          id: 'kpi-fase-1',
          titulo: '1ª Inspección (Fase 1)',
          valor: '0',
          subtitulo: '0 favorables · 0 rechazadas',
          variant: 'neutral',
          icon: '1️⃣',
        },
        {
          id: 'kpi-fase-2',
          titulo: '2ª Inspección (Fase 2)',
          valor: '0',
          subtitulo: '0 favorables · 0 rechazadas',
          variant: 'neutral',
          icon: '2️⃣',
        },
        {
          id: 'kpi-pct-rechazo',
          titulo: '% Rechazo Global',
          valor: '0,00 %',
          subtitulo: '0 inspecciones rechazadas',
          variant: 'neutral',
          icon: '📉',
        },
      ];
    }

    const totalInsp = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalInspecciones, 0);
    const totalFav1 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.favorables1, 0);
    const totalRech1 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.rechazadas1, 0);
    const totalF1 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalFase1, 0);

    const totalFav2 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.favorables2, 0);
    const totalRech2 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.rechazadas2, 0);
    const totalF2 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalFase2, 0);

    const totalRech = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalRechazadas, 0);
    const pctRechGlobal = totalInsp > 0 ? (totalRech / totalInsp) * 100 : 0;

    const numEstaciones = filasFiltradasYOrdenadas.length;

    return [
      {
        id: 'kpi-total-inspecciones',
        titulo: 'Total Inspecciones',
        valor: totalInsp.toLocaleString('es-ES'),
        subtitulo: `${numEstaciones} estación${numEstaciones === 1 ? '' : 'es'} analizada${numEstaciones === 1 ? '' : 's'}`,
        variant: 'primary',
        icon: '🚗',
      },
      {
        id: 'kpi-fase-1',
        titulo: '1ª Inspección (Fase 1)',
        valor: totalF1.toLocaleString('es-ES'),
        subtitulo: `${totalFav1.toLocaleString('es-ES')} fav. · ${totalRech1.toLocaleString('es-ES')} rech.`,
        variant: 'neutral',
        icon: '1️⃣',
      },
      {
        id: 'kpi-fase-2',
        titulo: '2ª Inspección (Fase 2)',
        valor: totalF2.toLocaleString('es-ES'),
        subtitulo: `${totalFav2.toLocaleString('es-ES')} fav. · ${totalRech2.toLocaleString('es-ES')} rech.`,
        variant: 'neutral',
        icon: '2️⃣',
      },
      {
        id: 'kpi-pct-rechazo',
        titulo: '% Rechazo Global',
        valor: `${pctRechGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`,
        subtitulo: `${totalRech.toLocaleString('es-ES')} rechazadas en total`,
        variant: pctRechGlobal > 20 ? 'danger' : 'warning',
        icon: '📉',
      },
    ];
  }, [filasFiltradasYOrdenadas]);

  // 3. Puntos de Gráficos sincronizados con las filas visibles
  const graficoBarrasDinamico = useMemo(() => {
    if (!data?.graficoBarras || filasFiltradasYOrdenadas.length === 0) return [];
    const codigosVisibles = new Set(filasFiltradasYOrdenadas.map((f) => f.codEstacion));
    return data.graficoBarras.filter((p) => codigosVisibles.has(p.id));
  }, [data?.graficoBarras, filasFiltradasYOrdenadas]);

  // Gráfico Circular (Donut / Mix Redondo):
  // Se recalcula directamente a partir de las filas visibles para que al marcar o desmarcar
  // estaciones se actualice siempre de forma inmediata y exacta, sin perder datos.
  const graficoCuotaDinamico = useMemo(() => {
    if (filasFiltradasYOrdenadas.length === 0) return [];

    const fav1 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.favorables1, 0);
    const rech1 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.rechazadas1, 0);
    const fav2 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.favorables2, 0);
    const rech2 = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.rechazadas2, 0);

    const total = fav1 + rech1 + fav2 + rech2;
    if (total === 0) return [];

    return [
      {
        id: 'fav1',
        label: 'Fase 1 Favorables',
        valor: fav1,
        valorFormateado: `${fav1.toLocaleString('es-ES')} insp.`,
        sociedad: 'Fase 1',
        color: '#0046ad',
      },
      {
        id: 'rech1',
        label: 'Fase 1 Rechazadas',
        valor: rech1,
        valorFormateado: `${rech1.toLocaleString('es-ES')} insp.`,
        sociedad: 'Fase 1',
        color: '#dc2626',
      },
      {
        id: 'fav2',
        label: 'Fase 2 Favorables',
        valor: fav2,
        valorFormateado: `${fav2.toLocaleString('es-ES')} insp.`,
        sociedad: 'Fase 2',
        color: '#0284c7',
      },
      {
        id: 'rech2',
        label: 'Fase 2 Rechazadas',
        valor: rech2,
        valorFormateado: `${rech2.toLocaleString('es-ES')} insp.`,
        sociedad: 'Fase 2',
        color: '#d97706',
      },
    ];
  }, [filasFiltradasYOrdenadas]);

  // 4. Exportar a Excel / CSV (solo si hay filas visibles)
  const handleExportarExcel = async () => {
    if (filasFiltradasYOrdenadas.length === 0) {
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      const filtros: FiltrosReporteBasico = {
        fechaInicio,
        fechaFin,
        sociedad,
        codEstaciones:
          filasFiltradasYOrdenadas.length === ESTACIONES_OFICIALES.length
            ? []
            : filasFiltradasYOrdenadas.map((f) => f.codEstacion),
      };
      await numeroInspeccionesApi.exportarExcel(filtros);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al exportar el fichero Excel.';
      setExportError(mensaje);
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
    alertaRangoFechas,
    setSociedad,
    setEstacionesSeleccionadas,
    handleFechaInicioChange,
    handleFechaFinChange,
    ajustarAUnAno,
    cargarInforme,

    // Datos y estados
    data,
    isLoading,
    error,
    setError,

    // Exportación
    isExporting,
    exportError,
    handleExportarExcel,

    // Tabla y Métricas Dinámicas
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    filasFiltradasYOrdenadas,
    kpisDinamicos,
    graficoBarrasDinamico,
    graficoCuotaDinamico,

    // Gráfico
    chartMode,
    setChartMode,
  };
}
