import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useReportFilters } from './useReportFilters';
import { useReportTable } from './useReportTable';
import { inspRangoHorarioApi } from '../api/inspRangoHorarioApi';
import type { InspRangoHorarioFila, InspRangoHorarioResponse } from '../types/inspRangoHorario.types';

export type SortableInspRangoHorarioColumn =
  | 'fecha'
  | 'diaSemana'
  | 'totalFila'
  | 'h06' | 'h07' | 'h08' | 'h09' | 'h10' | 'h11' | 'h12' | 'h13'
  | 'h14' | 'h15' | 'h16' | 'h17' | 'h18' | 'h19' | 'h20' | 'h21';

export function useInspRangoHorarioReport() {
  const [data, setData] = useState<InspRangoHorarioResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Selector de fase (Todas, 1 = Primera, 2 = Segunda)
  const [fase, setFase] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersRef = useRef<any>(null);

  const ejecutarConsulta = useCallback(
    async (
      fIni: string,
      fFin: string,
      soc: string,
      ests: string[],
      faseVal: string,
      signal?: AbortSignal
    ) => {
      if (filtersRef.current?.alertaRangoFechas) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await inspRangoHorarioApi.consultar(
          {
            fechaInicio: fIni,
            fechaFin: fFin,
            sociedad: soc as any,
            estaciones: ests && ests.length > 0 ? ests : undefined,
            fase: faseVal ? faseVal : undefined,
          },
          signal
        );
        setData(response);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Error al cargar datos del informe de rango horario');
          setData(null);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleFetchReport = useCallback(
    (signal?: AbortSignal, currentFilters?: any) => {
      const fIni = currentFilters?.fechaInicio ?? filtersRef.current?.fechaInicio;
      const fFin = currentFilters?.fechaFin ?? filtersRef.current?.fechaFin;
      const soc = currentFilters?.sociedad ?? filtersRef.current?.sociedad;
      const ests = currentFilters?.estacionesSeleccionadas ?? filtersRef.current?.estacionesSeleccionadas;

      if (!fIni || !fFin) return;
      ejecutarConsulta(fIni, fFin, soc, ests, fase, signal);
    },
    [ejecutarConsulta, fase]
  );

  const filters = useReportFilters({
    onFetchReport: handleFetchReport,
    onClearData: () => setData(null),
    autoFetchOnFilterChange: true,
  });

  filtersRef.current = filters;

  const consultar = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    handleFetchReport(abortControllerRef.current.signal);
  }, [handleFetchReport]);

  const searchPredicate = useCallback((fila: InspRangoHorarioFila, term: string) => {
    const raw = term.trim().toLowerCase();
    if (!raw) return true;

    // Soporte para búsqueda multitermino (ej. "Martes 10h" o "16/06 10h")
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && !raw.includes('>') && !raw.includes('<') && !raw.includes('=')) {
      return tokens.every((tok) => {
        if ((fila.fechaFormatted ?? '').toLowerCase().includes(tok)) return true;
        if ((fila.diaSemana ?? '').toLowerCase().includes(tok)) return true;
        if ((fila.totalFila ?? 0).toString().includes(tok)) return true;

        const hTokMatch = tok.match(/^(?:hora|h)?(0?[6-9]|1[0-9]|2[0-1])(?:h|:00)?$/i);
        if (hTokMatch && (tok.includes('h') || tok.includes(':') || tok.startsWith('hora'))) {
          const hNum = parseInt(hTokMatch[1], 10);
          const prop = `h${hNum.toString().padStart(2, '0')}` as keyof InspRangoHorarioFila;
          return ((fila[prop] as number) ?? 0) > 0;
        }
        return false;
      });
    }

    // 1. Coincidencia directa por Fecha o Día de la Semana
    if ((fila.fechaFormatted ?? '').toLowerCase().includes(raw)) return true;
    if ((fila.diaSemana ?? '').toLowerCase().includes(raw)) return true;

    // 2. Coincidencia por Total de la Jornada
    if ((fila.totalFila ?? 0).toString().includes(raw)) return true;

    // 3. Detección de búsqueda por hora específica: "10h", "10:00", "h10", "hora 10", "10 h"
    // O con condición: "10h > 5", "10h >= 10", "10h = 0", "10h: 8"
    const hourRegex = /^(?:hora\s*|h)?(0?[6-9]|1[0-9]|2[0-1])(?:\s*h|:00)?(?:\s*(>|>=|<|<=|=|:)?\s*(\d+))?$/i;
    const hourMatch = raw.match(hourRegex);

    if (hourMatch && (raw.includes('h') || raw.includes(':') || raw.startsWith('hora'))) {
      const horaNum = parseInt(hourMatch[1], 10);
      const prop = `h${horaNum.toString().padStart(2, '0')}` as keyof InspRangoHorarioFila;
      const valorHora = (fila[prop] as number) ?? 0;

      const operador = hourMatch[2];
      const valorCompararStr = hourMatch[3];

      if (valorCompararStr !== undefined) {
        const valorComparar = parseInt(valorCompararStr, 10);
        switch (operador) {
          case '>': return valorHora > valorComparar;
          case '>=': return valorHora >= valorComparar;
          case '<': return valorHora < valorComparar;
          case '<=': return valorHora <= valorComparar;
          case '=':
          case ':':
          default:
            return valorHora === valorComparar;
        }
      }

      // Si solo introduce "10h", "h10", "10:00": muestra jornadas con inspecciones en esa franja (> 0)
      return valorHora > 0;
    }

    return false;
  }, []);

  const sortComparator = useCallback(
    (a: InspRangoHorarioFila, b: InspRangoHorarioFila, col: SortableInspRangoHorarioColumn, dir: 'asc' | 'desc') => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (col.startsWith('h')) {
        valA = (a[col as keyof InspRangoHorarioFila] as number) ?? 0;
        valB = (b[col as keyof InspRangoHorarioFila] as number) ?? 0;
      } else {
        switch (col) {
          case 'fecha':
            valA = a.fecha ?? '';
            valB = b.fecha ?? '';
            break;
          case 'diaSemana':
            valA = a.diaSemana ?? '';
            valB = b.diaSemana ?? '';
            break;
          case 'totalFila':
            valA = a.totalFila ?? 0;
            valB = b.totalFila ?? 0;
            break;
          default:
            valA = a.fecha ?? '';
            valB = b.fecha ?? '';
        }
      }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    },
    []
  );

  const table = useReportTable<InspRangoHorarioFila, SortableInspRangoHorarioColumn>({
    items: data?.filas,
    searchPredicate,
    sortComparator,
    initialSortColumn: 'fecha',
    initialSortDirection: 'asc',
    defaultPageSize: 50,
  });

  const exportarExcel = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      await inspRangoHorarioApi.exportarExcel({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        sociedad: filters.sociedad,
        estaciones: filters.estacionesSeleccionadas.length > 0 ? filters.estacionesSeleccionadas : undefined,
        fase: fase ? fase : undefined,
      });
    } catch (err: any) {
      setExportError(err.message || 'Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  }, [filters.fechaInicio, filters.fechaFin, filters.sociedad, filters.estacionesSeleccionadas, fase]);

  return {
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    filters,
    table,
    fase,
    setFase,
    exportarExcel,
    recargar: consultar,
  };
}
