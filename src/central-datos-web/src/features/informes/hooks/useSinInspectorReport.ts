import { useState, useCallback, useRef } from 'react';
import type {
  InformeSinInspectorResponse,
  FilaSinInspector,
  SortableSinInspectorColumn,
} from '../types/informes.types';
import { sinInspectorApi } from '../api/sinInspectorApi';
import { useReportFilters, type ReportFilterValues } from './useReportFilters';
import { useReportTable } from './useReportTable';

export function useSinInspectorReport() {
  // 1. Estados de Datos y Carga
  const [data, setData] = useState<InformeSinInspectorResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 3. Inspección seleccionada para modal de detalle técnico
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaSinInspector | null>(null);

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
        const res = await sinInspectorApi.consultarSinInspector(
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
        setError(err instanceof Error ? err.message : 'Error al consultar inspecciones sin inspector');
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

  const filters = useReportFilters({
    initialFase: 'TODAS',
    onClearData: clearData,
    onFetchReport: handleFetchReport,
  });

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // 6. Hook unificado de Tabla (Búsqueda, Ordenación global y Paginación)
  const searchPredicate = useCallback((f: FilaSinInspector, term: string) => {
    return (
      (f.matricula ?? '').toLowerCase().includes(term) ||
      (f.desEstacion ?? '').toLowerCase().includes(term) ||
      (f.codEstacion ?? '').toLowerCase().includes(term) ||
      (f.marca ?? '').toLowerCase().includes(term) ||
      (f.modelo ?? '').toLowerCase().includes(term) ||
      (f.tipoVehiculo ?? '').toLowerCase().includes(term)
    );
  }, []);

  const sortComparator = useCallback(
    (a: FilaSinInspector, b: FilaSinInspector, col: SortableSinInspectorColumn, dir: 'asc' | 'desc') => {
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
        case 'marca':
          valA = `${a.marca ?? ''} ${a.modelo ?? ''}`.trim();
          valB = `${b.marca ?? ''} ${b.modelo ?? ''}`.trim();
          break;
        case 'tipoMotor':
          valA = a.tipoMotor ?? '';
          valB = b.tipoMotor ?? '';
          break;
        case 'tipoVehiculo':
          valA = a.tipoVehiculo ?? '';
          valB = b.tipoVehiculo ?? '';
          break;
        case 'tipoInspeccion':
          valA = a.tipoInspeccion ?? '';
          valB = b.tipoInspeccion ?? '';
          break;
        case 'fase':
          valA = a.fase ?? '';
          valB = b.fase ?? '';
          break;
        case 'textoResultado':
          valA = a.textoResultado ?? '';
          valB = b.textoResultado ?? '';
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

  const table = useReportTable<FilaSinInspector, SortableSinInspectorColumn>({
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

  // 8. Exportación Excel
  const exportarExcel = async () => {
    const err = filters.validarRango(filters.fechaInicio, filters.fechaFin);
    if (err) {
      filters.setAlertaRangoFechas(err);
      setData(null);
      return;
    }

    setIsExporting(true);
    setExportError(null);
    try {
      await sinInspectorApi.descargarExcelSinInspector({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        sociedad: filters.sociedad,
        codEstaciones:
          filters.estacionesSeleccionadas.length === filters.estacionesPermitidas.length
            ? undefined
            : filters.estacionesSeleccionadas,
        fase: filters.fase,
      });
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    // Filtros
    filters,
    fetchReport,

    // Carga y Datos
    data,
    isLoading,
    error,

    // Exportación
    isExporting,
    exportError,
    exportarExcel,

    // Tabla
    table,

    // Modal Detalle
    filaSeleccionada,
    setFilaSeleccionada,
  };
}

