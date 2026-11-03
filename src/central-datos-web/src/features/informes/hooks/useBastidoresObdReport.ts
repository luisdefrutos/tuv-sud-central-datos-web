import { useState, useCallback, useRef } from 'react';
import type {
  InformeBastidoresObdResponse,
  FilaBastidorObdNoCoincidente,
  SortableBastidorObdColumn,
} from '../types/bastidoresObd.types';
import { bastidoresObdApi } from '../api/bastidoresObdApi';
import { useReportFilters, type ReportFilterValues } from './useReportFilters';
import { useReportTable } from './useReportTable';

export function useBastidoresObdReport() {
  // 1. Estados de Datos y Carga
  const [data, setData] = useState<InformeBastidoresObdResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 3. Inspección seleccionada para modal de detalle técnico
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaBastidorObdNoCoincidente | null>(null);

  // 4. Función de Petición al Backend
  const ejecutarConsulta = useCallback(
    async (
      fIni: string,
      fFin: string,
      soc: string,
      ests: string[],
      signal?: AbortSignal
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await bastidoresObdApi.consultarBastidoresObd(
          {
            fechaInicio: fIni,
            fechaFin: fFin,
            sociedad: soc as any,
            codEstaciones: ests.length > 0 ? ests : undefined,
          },
          signal
        );
        setData(res);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al consultar bastidores OBD no coincidentes');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 5. Hook unificado de Filtros
  const clearData = useCallback(() => {
    setData(null);
  }, []);

  const handleFetchReport = useCallback(
    (signal?: AbortSignal, currentFilters?: ReportFilterValues) => {
      const fIni = currentFilters?.fechaInicio ?? filtersRef.current?.fechaInicio;
      const fFin = currentFilters?.fechaFin ?? filtersRef.current?.fechaFin;
      const soc = currentFilters?.sociedad ?? filtersRef.current?.sociedad;
      const ests = currentFilters?.estacionesSeleccionadas ?? filtersRef.current?.estacionesSeleccionadas;

      if (!fIni || !fFin) return;

      ejecutarConsulta(fIni, fFin, soc, ests, signal);
    },
    [ejecutarConsulta]
  );

  const filters = useReportFilters({
    onClearData: clearData,
    onFetchReport: handleFetchReport,
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // 6. Hook unificado de Tabla (Búsqueda, Ordenación global y Paginación)
  const searchPredicate = useCallback((f: FilaBastidorObdNoCoincidente, term: string) => {
    return (
      (f.matricula ?? '').toLowerCase().includes(term) ||
      (f.bastidorInspeccion ?? '').toLowerCase().includes(term) ||
      (f.bastidorObd ?? '').toLowerCase().includes(term) ||
      (f.desEstacion ?? '').toLowerCase().includes(term) ||
      (f.codEstacion ?? '').toLowerCase().includes(term) ||
      (f.nombreCompleto ?? '').toLowerCase().includes(term) ||
      (f.cifFactura ?? '').toLowerCase().includes(term) ||
      (f.equipoObd ?? '').toLowerCase().includes(term)
    );
  }, []);

  const sortComparator = useCallback(
    (a: FilaBastidorObdNoCoincidente, b: FilaBastidorObdNoCoincidente, col: SortableBastidorObdColumn, dir: 'asc' | 'desc') => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (col) {
        case 'fechaInspeccion':
          valA = a.fechaInspeccion ?? '';
          valB = b.fechaInspeccion ?? '';
          break;
        case 'matricula':
          valA = a.matricula ?? '';
          valB = b.matricula ?? '';
          break;
        case 'desEstacion':
          valA = a.desEstacion ?? '';
          valB = b.desEstacion ?? '';
          break;
        case 'bastidorInspeccion':
          valA = a.bastidorInspeccion ?? '';
          valB = b.bastidorInspeccion ?? '';
          break;
        case 'bastidorObd':
          valA = a.bastidorObd ?? '';
          valB = b.bastidorObd ?? '';
          break;
        case 'categoria':
          valA = a.categoria ?? '';
          valB = b.categoria ?? '';
          break;
        case 'clasificacion':
          valA = a.clasificacion ?? '';
          valB = b.clasificacion ?? '';
          break;
        case 'nombreCompleto':
          valA = a.nombreCompleto ?? '';
          valB = b.nombreCompleto ?? '';
          break;
        case 'cifFactura':
          valA = a.cifFactura ?? '';
          valB = b.cifFactura ?? '';
          break;
        case 'equipoObd':
          valA = a.equipoObd ?? '';
          valB = b.equipoObd ?? '';
          break;
        case 'codInspector':
          valA = a.codInspector ?? '';
          valB = b.codInspector ?? '';
          break;
        case 'inspectorResponsableValidacion':
          valA = a.inspectorResponsableValidacion ?? '';
          valB = b.inspectorResponsableValidacion ?? '';
          break;
        case 'codEmpleadoBastidor':
          valA = a.codEmpleadoBastidor ?? '';
          valB = b.codEmpleadoBastidor ?? '';
          break;
        default:
          valA = a.fechaInspeccion ?? '';
          valB = b.fechaInspeccion ?? '';
      }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    },
    []
  );

  const table = useReportTable<FilaBastidorObdNoCoincidente, SortableBastidorObdColumn>({
    items: data?.filas,
    searchPredicate,
    sortComparator,
    initialSortColumn: 'fechaInspeccion',
    initialSortDirection: 'desc',
    defaultPageSize: 50,
  });

  // 7. Exportación a Excel
  const exportarExcel = useCallback(async () => {
    if (!filters.fechaInicio || !filters.fechaFin) return;

    setIsExporting(true);
    setExportError(null);

    try {
      await bastidoresObdApi.descargarExcelBastidoresObd({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        sociedad: filters.sociedad,
        codEstaciones:
          filters.estacionesSeleccionadas.length > 0
            ? filters.estacionesSeleccionadas
            : undefined,
      });
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  }, [filters]);

  return {
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    filaSeleccionada,
    setFilaSeleccionada,
    filters,
    table,
    exportarExcel,
    recargar: () => handleFetchReport(),
  };
}
