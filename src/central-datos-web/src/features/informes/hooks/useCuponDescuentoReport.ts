import { useState, useCallback, useRef } from 'react';
import type {
  InformeCuponDescuentoResponse,
  FilaCuponDescuento,
  SortableCuponDescuentoColumn,
} from '../types/informes.types';
import { cuponDescuentoApi } from '../api/cuponDescuentoApi';
import { useReportFilters, type ReportFilterValues, toDateInputValue } from './useReportFilters';
import { useReportTable } from './useReportTable';

export function useCuponDescuentoReport() {
  // 1. Estados de Datos y Carga
  const [data, setData] = useState<InformeCuponDescuentoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 3. Inspección seleccionada para modal de detalle técnico
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaCuponDescuento | null>(null);

  // 4. Función de Petición al Backend
  const ejecutarConsulta = useCallback(
    async (
      fIni: string,
      fFin: string,
      soc: string,
      ests: string[],
      faseVal: 'TODAS' | '1' | '2',
      signal?: AbortSignal
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await cuponDescuentoApi.consultarCuponDescuento(
          {
            fechaInicio: fIni,
            fechaFin: fFin,
            sociedad: soc as any,
            codEstaciones: ests.length > 0 ? ests : undefined,
            fase: faseVal,
          },
          signal
        );
        setData(res);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al consultar inspecciones con cupón de descuento');
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
      const faseVal = currentFilters?.fase ?? filtersRef.current?.fase;

      if (!fIni || !fFin) return;

      ejecutarConsulta(fIni, fFin, soc, ests, faseVal, signal);
    },
    [ejecutarConsulta]
  );

  // Fecha por defecto: primer día de mes a hoy (óptimo para volumen de promociones mensual)
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const filters = useReportFilters({
    defaultFechaInicio: toDateInputValue(primerDiaMes),
    defaultFechaFin: toDateInputValue(now),
    initialFase: 'TODAS',
    onClearData: clearData,
    onFetchReport: handleFetchReport,
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // 6. Hook unificado de Tabla (Búsqueda, Ordenación global y Paginación)
  const searchPredicate = useCallback((f: FilaCuponDescuento, term: string) => {
    return (
      (f.matricula ?? '').toLowerCase().includes(term) ||
      (f.desEstacion ?? '').toLowerCase().includes(term) ||
      (f.codEstacion ?? '').toLowerCase().includes(term) ||
      (f.codCupon ?? '').toLowerCase().includes(term) ||
      (f.promocion ?? '').toLowerCase().includes(term) ||
      (f.marca ?? '').toLowerCase().includes(term) ||
      (f.modelo ?? '').toLowerCase().includes(term)
    );
  }, []);

  const sortComparator = useCallback(
    (a: FilaCuponDescuento, b: FilaCuponDescuento, col: SortableCuponDescuentoColumn, dir: 'asc' | 'desc') => {
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
        case 'codCupon':
          valA = a.codCupon ?? '';
          valB = b.codCupon ?? '';
          break;
        case 'promocion':
          valA = a.promocion ?? '';
          valB = b.promocion ?? '';
          break;
        case 'descuento':
          valA = a.descuento;
          valB = b.descuento;
          break;
        case 'importeAbonado':
          valA = a.importeAbonado;
          valB = b.importeAbonado;
          break;
        case 'marca':
          valA = `${a.marca ?? ''} ${a.modelo ?? ''}`.trim();
          valB = `${b.marca ?? ''} ${b.modelo ?? ''}`.trim();
          break;
        case 'fase':
          valA = a.fase ?? '';
          valB = b.fase ?? '';
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

  const table = useReportTable<FilaCuponDescuento, SortableCuponDescuentoColumn>({
    items: data?.filas,
    searchPredicate,
    sortComparator,
    initialSortColumn: 'fechaInspeccion',
    initialSortDirection: 'desc',
    defaultPageSize: 50,
  });

  // 7. Disparar consulta manual (botón Consultar o tecla Enter)
  const fetchReport = useCallback(
    async (signal?: AbortSignal) => {
      const err = filters.validarRango(filters.fechaInicio, filters.fechaFin);
      if (err) {
        filters.setAlertaRangoFechas(err);
        setData(null);
        return;
      }
      filters.setAlertaRangoFechas(null);

      await ejecutarConsulta(
        filters.fechaInicio,
        filters.fechaFin,
        filters.sociedad,
        filters.estacionesSeleccionadas,
        filters.fase,
        signal
      );
    },
    [filters, ejecutarConsulta]
  );

  // 8. Exportar a Excel oficial
  const exportarExcel = useCallback(async () => {
    if (!data || !data.filas || data.filas.length === 0) return;

    setIsExporting(true);
    setExportError(null);

    try {
      await cuponDescuentoApi.descargarExcelCuponDescuento({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        sociedad: filters.sociedad,
        codEstaciones:
          filters.estacionesSeleccionadas.length > 0
            ? filters.estacionesSeleccionadas
            : undefined,
        fase: filters.fase,
      });
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  }, [data, filters]);

  return {
    filters,
    fetchReport,
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    exportarExcel,
    table,
    filaSeleccionada,
    setFilaSeleccionada,
  };
}

