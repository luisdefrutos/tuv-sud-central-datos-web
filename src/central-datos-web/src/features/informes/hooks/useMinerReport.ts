import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import type {
  FiltrosMinerRequest,
  InformeMinerResponse,
} from '../types/miner.types';
import { minerApi } from '../api/minerApi';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { useAuth } from '../../auth/context/AuthContext';

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type MinerActiveTab = 'defectos' | 'inspecciones';
export type MinerChartMetric = 'capitulos' | 'categorias';

export function useMinerReport() {
  const { user } = useAuth();
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

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

  useEffect(() => {
    setEstacionesSeleccionadas(estacionesPermitidas);
  }, [estacionesPermitidas]);

  // 2. Estados de datos y carga
  const [data, setData] = useState<InformeMinerResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [alertaRangoFechas, setAlertaRangoFechas] = useState<string | null>(null);

  // 3. UI states
  const [activeTab, setActiveTab] = useState<MinerActiveTab>('defectos');
  const [chartMetric, setChartMetric] = useState<MinerChartMetric>('capitulos');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Validación de rango
  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setAlertaRangoFechas(null);
      return;
    }
    const dIni = new Date(fechaInicio);
    const dFin = new Date(fechaFin);

    if (dIni > dFin) {
      setAlertaRangoFechas('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    const diffDays = Math.ceil(Math.abs(dFin.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      setAlertaRangoFechas('El rango seleccionado supera 1 año. Por favor acota las fechas para un mejor rendimiento.');
      return;
    }

    setAlertaRangoFechas(null);
  }, [fechaInicio, fechaFin]);

  const ajustarAUnAno = () => {
    if (!fechaInicio) return;
    const dIni = new Date(fechaInicio);
    const dFin = new Date(dIni);
    dFin.setFullYear(dFin.getFullYear() + 1);
    dFin.setDate(dFin.getDate() - 1);
    setFechaFin(toDateInputValue(dFin));
    setAlertaRangoFechas(null);
  };

  const isQueryingRef = useRef(false);

  // Consulta al API: se ejecuta únicamente de forma explícita (botón Consultar / Enter)
  // o en la carga inicial al entrar en la pantalla.
  const fetchReport = useCallback(async () => {
    if (alertaRangoFechas) return;
    if (isQueryingRef.current) return;
    isQueryingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const payload: FiltrosMinerRequest = {
        fechaInicio,
        fechaFin,
        codEstaciones:
          estacionesSeleccionadas.length === estacionesPermitidas.length
            ? undefined
            : estacionesSeleccionadas,
      };

      const result = await minerApi.consultarMinerGlobal(payload, controller.signal);
      setData(result);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Error desconocido al consultar el informe MINER.');
    } finally {
      isQueryingRef.current = false;
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, estacionesSeleccionadas, estacionesPermitidas.length, alertaRangoFechas]);

  // Carga automática al entrar en la pantalla (según entras hace la búsqueda inicial)
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exportar Excel oficial
  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setError(null);

    try {
      const payload: FiltrosMinerRequest = {
        fechaInicio,
        fechaFin,
        codEstaciones:
          estacionesSeleccionadas.length === estacionesPermitidas.length
            ? undefined
            : estacionesSeleccionadas,
      };

      const blob = await minerApi.exportarExcel(payload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `estadistica-miner-global-${fechaInicio}_a_${fechaFin}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al exportar el archivo Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    // Filtros
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    sociedad,
    setSociedad,
    estacionesSeleccionadas,
    setEstacionesSeleccionadas,
    estacionesPermitidas,
    alertaRangoFechas,
    ajustarAUnAno,

    // Datos y estados
    data,
    isLoading,
    isExporting,
    error,
    activeTab,
    setActiveTab,
    chartMetric,
    setChartMetric,

    // Acciones
    fetchReport,
    handleExportExcel,
  };
}

