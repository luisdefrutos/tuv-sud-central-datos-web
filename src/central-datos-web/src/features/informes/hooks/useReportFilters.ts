import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { useAuth } from '../../auth/context/AuthContext';

const TODAS_LAS_ESTACIONES_CODIGOS = ESTACIONES_OFICIALES.map((e) => e.codigo);

export interface ReportFilterValues {
  fechaInicio: string;
  fechaFin: string;
  sociedad: FiltroSociedad;
  estacionesSeleccionadas: string[];
  estacionesPermitidas: string[];
  fase: 'TODAS' | '1' | '2';
}

export interface UseReportFiltersOptions {
  /** Fecha inicial por defecto (formato YYYY-MM-DD). Si no se indica, se calcula según el informe */
  defaultFechaInicio?: string;
  /** Fecha final por defecto (formato YYYY-MM-DD). Si no se indica, es el día actual */
  defaultFechaFin?: string;
  /** Valor inicial opcional de fase si el informe lo soporta (ej: 'TODAS') */
  initialFase?: 'TODAS' | '1' | '2';
  /** Callback para ejecutar la consulta con AbortSignal y valores de filtros opcionales */
  onFetchReport?: (signal?: AbortSignal, currentFilters?: ReportFilterValues) => Promise<void> | void;
  /** Callback para limpiar los datos si el rango de fechas es inválido o no hay estaciones */
  onClearData?: () => void;
  /** Habilitar debounce automático de 250ms al cambiar sociedad, fase o estaciones (por defecto true) */
  autoFetchOnFilterChange?: boolean;
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hook unificado para la gestión de filtros en todos los informes de Central Datos.
 * Cumple los 17 puntos del Estándar Oficial de Informes:
 * - Fechas por defecto: día 1 del mes en curso a hoy.
 * - Validación reactiva de rango (máximo 366 días, inicio <= fin).
 * - Las fechas NO disparan búsquedas directas (esperan a Enter o Consultar).
 * - Los filtros rápidos (Sociedad, Fase, Estaciones) disparan búsqueda inmediata con debounce de 250ms y AbortController.
 * - Limpieza de datos preventiva ante fechas inválidas para evitar desalineación.
 */
export function useReportFilters(options: UseReportFiltersOptions = {}) {
  const { user } = useAuth();
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

  // Estaciones autorizadas para el usuario en sesión
  const estacionesPermitidas = useMemo(() => {
    if (!user || user.isSupervisor || !user.allowedStations || user.allowedStations.length === 0) {
      return TODAS_LAS_ESTACIONES_CODIGOS;
    }
    return user.allowedStations;
  }, [user]);

  // Estados de filtros
  const [fechaInicio, setFechaInicio] = useState<string>(
    options.defaultFechaInicio ?? toDateInputValue(primerDiaMes)
  );
  const [fechaFin, setFechaFin] = useState<string>(
    options.defaultFechaFin ?? toDateInputValue(now)
  );
  const [sociedad, setSociedad] = useState<FiltroSociedad>('TODAS');
  const [estacionesSeleccionadas, setEstacionesSeleccionadas] = useState<string[]>(estacionesPermitidas);
  const [fase, setFase] = useState<'TODAS' | '1' | '2'>(options.initialFase ?? 'TODAS');
  const [alertaRangoFechas, setAlertaRangoFechas] = useState<string | null>(null);

  // Sincronizar estaciones al cargar permisos del usuario
  useEffect(() => {
    setEstacionesSeleccionadas((prev) => {
      if (
        prev.length === estacionesPermitidas.length &&
        prev.every((val, idx) => val === estacionesPermitidas[idx])
      ) {
        return prev;
      }
      return estacionesPermitidas;
    });
  }, [estacionesPermitidas]);

  // Validación de Rango de Fechas (Máximo 1 año / 366 días)
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
    if (diffDays > 366) {
      return `El rango seleccionado (${diffDays} días) supera el límite máximo permitido de 1 año (365 días) para optimizar el rendimiento de la consulta.`;
    }
    return null;
  }, []);

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val);
    const err = validarRango(val, fechaFin);
    setAlertaRangoFechas(err);
    if (err && onClearDataRef.current) {
      onClearDataRef.current();
    }
  };

  const handleFechaFinChange = (val: string) => {
    setFechaFin(val);
    const err = validarRango(fechaInicio, val);
    setAlertaRangoFechas(err);
    if (err && onClearDataRef.current) {
      onClearDataRef.current();
    }
  };

  const ajustarAUnAno = () => {
    if (!fechaInicio) return;
    const parts = fechaInicio.split('-').map(Number);
    if (parts.length < 3) return;
    const dIni = new Date(parts[0], parts[1] - 1, parts[2]);
    const dFin = new Date(dIni);
    dFin.setFullYear(dFin.getFullYear() + 1);
    dFin.setDate(dFin.getDate() - 1);
    setFechaFin(toDateInputValue(dFin));
    setAlertaRangoFechas(null);
  };

  // Carga inicial y reactiva con debounce ante cambios en Sociedad, Fase o Estaciones seleccionadas
  const isInitialMount = useRef(true);
  const onFetchRef = useRef(options.onFetchReport);
  onFetchRef.current = options.onFetchReport;
  const onClearDataRef = useRef(options.onClearData);
  onClearDataRef.current = options.onClearData;
  const autoFetchRef = useRef(options.autoFetchOnFilterChange ?? true);
  autoFetchRef.current = options.autoFetchOnFilterChange ?? true;

  // Clave estable para detectar cambios reales en el listado de estaciones seleccionadas
  const estacionesKey = useMemo(() => {
    return estacionesSeleccionadas.slice().sort().join(',');
  }, [estacionesSeleccionadas]);

  useEffect(() => {
    if (!autoFetchRef.current) {
      return;
    }

    if (estacionesSeleccionadas.length === 0) {
      if (onClearDataRef.current) {
        onClearDataRef.current();
      }
      return;
    }

    const controller = new AbortController();

    const currentValues: ReportFilterValues = {
      fechaInicio,
      fechaFin,
      sociedad,
      estacionesSeleccionadas,
      estacionesPermitidas,
      fase,
    };

    // Si es el primer montaje, ejecutar de inmediato; si es un cambio posterior de filtro, aplicar debounce de 250ms
    const delay = isInitialMount.current ? 0 : 250;
    isInitialMount.current = false;

    const timer = setTimeout(() => {
      if (onFetchRef.current) {
        onFetchRef.current(controller.signal, currentValues);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sociedad, fase, estacionesKey]);

  return {
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    estacionesPermitidas,
    fase,
    alertaRangoFechas,
    setFechaInicio,
    setFechaFin,
    setSociedad,
    setEstacionesSeleccionadas,
    setFase,
    setAlertaRangoFechas,
    handleFechaInicioChange,
    handleFechaFinChange,
    validarRango,
    ajustarAUnAno,
  };
}

