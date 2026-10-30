import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import type {
  FiltrosDuracionPromedio,
  InformeDuracionPromedioResponse,
  ResumenEstacionDuracion,
  ReportKpiData,
  SortableDuracionPromedioColumn,
  ReportBarChartPoint,
} from '../types/informes.types';
import { duracionPromedioApi } from '../api/duracionPromedioApi';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { useAuth } from '../../auth/context/AuthContext';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatearMinutos(minutos: number): string {
  if (minutos <= 0) return '0 min';
  const mins = Math.floor(minutos);
  const secs = Math.round((minutos - mins) * 60);
  return secs > 0 ? `${mins} min ${String(secs).padStart(2, '0')} s` : `${mins} min`;
}

export function useDuracionPromedioReport() {
  const { user } = useAuth();
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

  // Estaciones autorizadas para el usuario en sesión
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
  const [fase, setFase] = useState<'TODAS' | '1' | '2'>('TODAS');

  useEffect(() => {
    setEstacionesSeleccionadas(estacionesPermitidas);
  }, [estacionesPermitidas]);

  // 2. Estados de Carga y Datos
  const [data, setData] = useState<InformeDuracionPromedioResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [alertaRangoFechas, setAlertaRangoFechas] = useState<string | null>(null);

  // 3. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 4. Estados de Búsqueda y Ordenación en Tabla
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortableDuracionPromedioColumn>('duracionPromedioMinutos');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // 5. Modo de visualización del Gráfico (Ranking Estaciones / Tipos de Vehículo / Donut Tipos / Donut Sociedad)
  const [chartMode, setChartMode] = useState<'estaciones' | 'tipos' | 'donut-tipos' | 'donut-sociedad'>('estaciones');

  // 6. Modal de Crystal Report
  const [modalCrystalOpen, setModalCrystalOpen] = useState<boolean>(false);

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

  const consultar = useCallback(async () => {
    const errorValidacion = validarRango(fechaInicio, fechaFin);
    if (errorValidacion) {
      setAlertaRangoFechas(errorValidacion);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAlertaRangoFechas(null);

    const filtros: FiltrosDuracionPromedio = {
      fechaInicio,
      fechaFin,
      sociedad: 'TODAS',
      codEstaciones: undefined,
      fase,
    };

    try {
      const response = await duracionPromedioApi.consultarDuracionPromedio(filtros);
      setData(response);
    } catch (err: any) {
      console.error('[useDuracionPromedioReport] Error consultando informe:', err);
      setData(null);
      setError(
        err?.message ||
          'No se pudo obtener el informe de duración promedio. Verifique la conexión con Central Datos.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, fase, validarRango]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  const handleSort = (column: SortableDuracionPromedioColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'totalInspecciones' ? 'desc' : 'asc');
    }
  };

  // 1. Resumen de Estaciones filtrado reactivamente en memoria
  const estacionesFiltradas = useMemo((): ResumenEstacionDuracion[] => {
    if (!data?.resumenEstaciones) return [];

    if (estacionesSeleccionadas.length === 0) {
      return [];
    }

    let lista = [...data.resumenEstaciones];

    if (sociedad !== 'TODAS') {
      lista = lista.filter((f) => f.claveSociedad?.toUpperCase() === sociedad.toUpperCase());
    }

    if (estacionesSeleccionadas.length < ESTACIONES_OFICIALES.length) {
      lista = lista.filter((f) => estacionesSeleccionadas.includes(f.codEstacion));
    }

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
  }, [data?.resumenEstaciones, estacionesSeleccionadas, sociedad, searchTerm, sortColumn, sortDirection]);

  // 2. Tarjetas KPI Dinámicas
  const kpisDinamicos = useMemo((): ReportKpiData[] => {
    if (estacionesFiltradas.length === 0) {
      return [
        {
          id: 'kpi-duracion-global',
          titulo: 'Duración Promedio Red',
          valor: '0 min',
          subtitulo: '0 estaciones seleccionadas',
          variant: 'neutral',
          icon: '⏱️',
        },
        {
          id: 'kpi-total-inspecciones',
          titulo: 'Inspecciones Analizadas (001)',
          valor: '0',
          subtitulo: 'Sin datos visibles',
          variant: 'neutral',
          icon: '🚗',
        },
        {
          id: 'kpi-estacion-agil',
          titulo: 'Estación Más Ágil',
          valor: 'Sin datos',
          subtitulo: '0 min',
          variant: 'neutral',
          icon: '⚡',
        },
        {
          id: 'kpi-tipo-rapido',
          titulo: 'Tipo de Vehículo Más Rápido',
          valor: 'Sin datos',
          subtitulo: '0 min',
          variant: 'neutral',
          icon: '🏎️',
        },
      ];
    }

    const totalInsp = estacionesFiltradas.reduce((acc, e) => acc + e.totalInspecciones, 0);
    const mediaPonderada = totalInsp > 0
      ? estacionesFiltradas.reduce((acc, e) => acc + e.duracionPromedioMinutos * e.totalInspecciones, 0) / totalInsp
      : 0;

    const candidatas = estacionesFiltradas.filter((e) => e.duracionPromedioMinutos > 0);
    const masAgil = candidatas.length > 0
      ? [...candidatas].sort((a, b) => a.duracionPromedioMinutos - b.duracionPromedioMinutos)[0]
      : null;

    const tipoRapido = data?.tipoVehiculoMasRapido || 'Turismos';
    const durTipoRapido = data?.duracionTipoVehiculoMasRapido || '0 min';

    return [
      {
        id: 'kpi-duracion-global',
        titulo: 'Duración Promedio Red',
        valor: formatearMinutos(mediaPonderada),
        subtitulo: `Promedio ponderado en ${estacionesFiltradas.length} estaciones`,
        variant: mediaPonderada > 30 ? 'warning' : 'primary',
        icon: '⏱️',
      },
      {
        id: 'kpi-total-inspecciones',
        titulo: 'Inspecciones Analizadas (001)',
        valor: totalInsp.toLocaleString('es-ES'),
        subtitulo: 'Inspecciones periódicas válidas',
        variant: 'neutral',
        icon: '🚗',
      },
      {
        id: 'kpi-estacion-agil',
        titulo: 'Estación Más Ágil',
        valor: masAgil ? masAgil.desEstacion.replace('I.T.V. - ', '') : 'Sin datos',
        subtitulo: masAgil ? `${masAgil.duracionFormateada} (${masAgil.totalInspecciones.toLocaleString('es-ES')} insp.)` : '0 min',
        variant: 'success',
        icon: '⚡',
      },
      {
        id: 'kpi-tipo-rapido',
        titulo: 'Tipo de Vehículo Más Rápido',
        valor: tipoRapido,
        subtitulo: durTipoRapido,
        variant: 'neutral',
        icon: '🏎️',
      },
    ];
  }, [estacionesFiltradas, data?.tipoVehiculoMasRapido, data?.duracionTipoVehiculoMasRapido]);

  // 3. Gráficos dinámicos
  const graficoRankingEstacionesDinamico = useMemo(() => {
    if (!data?.graficoRankingEstaciones || estacionesFiltradas.length === 0) return [];
    const codigosVisibles = new Set(estacionesFiltradas.map((e) => e.codEstacion));
    return data.graficoRankingEstaciones.filter((p) => codigosVisibles.has(p.id));
  }, [data?.graficoRankingEstaciones, estacionesFiltradas]);

  const graficoTiposVehiculoDinamico = useMemo(() => {
    if (!data?.graficoTiposVehiculo || estacionesFiltradas.length === 0) return [];
    return data.graficoTiposVehiculo;
  }, [data?.graficoTiposVehiculo, estacionesFiltradas.length]);

  // Gráfico Donut de Cuota de Inspecciones por Tipo de Vehículo
  const graficoCuotaTiposDinamico = useMemo(() => {
    if (!data?.resumenTiposVehiculo || estacionesFiltradas.length === 0) return [];
    return data.resumenTiposVehiculo
      .filter((t) => t.totalInspecciones > 0)
      .map((t) => ({
        id: `donut_${t.ordenTipo}`,
        label: t.tipoVehiculo,
        valor: t.totalInspecciones,
        valorFormateado: `${t.totalInspecciones.toLocaleString('es-ES')} insp.`,
        sociedad: 'TODAS' as const,
        color: '#0046ad',
      }));
  }, [data?.resumenTiposVehiculo, estacionesFiltradas.length]);

  // Gráfico Donut de Distribución de Inspecciones por Sociedad (TÜV SÜD ATISAE vs TÜV SÜD CAL)
  const graficoCuotaSociedadDinamico = useMemo(() => {
    if (estacionesFiltradas.length === 0) return [];
    const tsaInsp = estacionesFiltradas
      .filter((e) => e.claveSociedad === 'TSA')
      .reduce((acc, e) => acc + e.totalInspecciones, 0);
    const calInsp = estacionesFiltradas
      .filter((e) => e.claveSociedad === 'CAL')
      .reduce((acc, e) => acc + e.totalInspecciones, 0);

    const puntos: ReportBarChartPoint[] = [];
    if (tsaInsp > 0) {
      puntos.push({
        id: 'soc_tsa',
        label: 'TÜV SÜD ATISAE (TSA)',
        valor: tsaInsp,
        valorFormateado: `${tsaInsp.toLocaleString('es-ES')} insp.`,
        sociedad: 'TSA',
        color: '#0046ad',
      });
    }
    if (calInsp > 0) {
      puntos.push({
        id: 'soc_cal',
        label: 'TÜV SÜD CAL (CAL)',
        valor: calInsp,
        valorFormateado: `${calInsp.toLocaleString('es-ES')} insp.`,
        sociedad: 'CAL',
        color: '#00875a',
      });
    }
    return puntos;
  }, [estacionesFiltradas]);

  // 4. Descarga de Excel
  const exportarExcel = async () => {
    if (estacionesFiltradas.length === 0) {
      setExportError('No hay datos disponibles para exportar con los filtros seleccionados.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    const filtros: FiltrosDuracionPromedio = {
      fechaInicio,
      fechaFin,
      sociedad,
      codEstaciones:
        searchTerm.trim() !== ''
          ? estacionesFiltradas.map((e) => e.codEstacion)
          : estacionesSeleccionadas.length > 0
          ? estacionesSeleccionadas
          : undefined,
      fase,
    };

    try {
      await duracionPromedioApi.exportarExcel(filtros);
    } catch (err: any) {
      console.error('[useDuracionPromedioReport] Error al exportar Excel:', err);
      setExportError(err?.message || 'Error al descargar el fichero Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    estacionesPermitidas,
    fase,
    setFase,
    data,
    isLoading,
    error,
    setError,
    alertaRangoFechas,
    isExporting,
    exportError,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    chartMode,
    setChartMode,
    modalCrystalOpen,
    setModalCrystalOpen,
    estacionesFiltradas,
    kpisDinamicos,
    graficoRankingEstacionesDinamico,
    graficoTiposVehiculoDinamico,
    graficoCuotaTiposDinamico,
    graficoCuotaSociedadDinamico,
    handleFechaInicioChange,
    handleFechaFinChange,
    setSociedad,
    setEstacionesSeleccionadas,
    consultar,
    handleSort,
    exportarExcel,
  };
}

