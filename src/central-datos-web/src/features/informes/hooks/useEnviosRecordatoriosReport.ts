import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useReportFilters, type ReportFilterValues } from './useReportFilters';
import {
  fetchPlantillasRecordatorio,
  consultarEnviosRecordatorios,
  exportarExcelEnviosRecordatorios,
} from '../api/enviosRecordatoriosApi';
import type {
  FiltrosEnviosRecordatorios,
  InformeEnviosRecordatoriosResponse,
  PlantillaRecordatorioCatalogo,
  FilaResumenEnviosRecordatorios,
  FilaDetalleEnviosRecordatorios,
} from '../types/enviosRecordatorios.types';

export function useEnviosRecordatoriosReport(initialModo: 'resumen' | 'detalle' = 'resumen') {
  const [data, setData] = useState<InformeEnviosRecordatoriosResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filtros específicos
  const [canal, setCanal] = useState<'TODOS' | 'SMS' | 'EMAIL'>('TODOS');
  const [idPlantilla, setIdPlantilla] = useState<number | null>(null);
  const [modoVista, setModoVista] = useState<'resumen' | 'detalle'>(initialModo);
  const [busqueda, setBusqueda] = useState<string>('');

  // Catálogo de plantillas
  const [plantillas, setPlantillas] = useState<PlantillaRecordatorioCatalogo[]>([]);

  // Paginación y ordenación
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<string>('fechaEnvio');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Modal de detalle de un registro individual
  const [selectedDetalle, setSelectedDetalle] = useState<FilaDetalleEnviosRecordatorios | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersRef = useRef<any>(null);

  useEffect(() => {
    fetchPlantillasRecordatorio()
      .then(setPlantillas)
      .catch((_err) => {
        // En caso de fallo de catálogo, mantener lista vacía
      });
  }, []);

  // Función de consulta reactiva ante cualquier cambio de estación, sociedad o filtros
  const handleConsultar = useCallback(async (signal?: AbortSignal, currentFilters?: ReportFilterValues) => {
    const activeFilters = currentFilters || filtersRef.current;
    if (!activeFilters) return;
    if (activeFilters.alertaRangoFechas) return;

    if (!signal) {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      signal = controller.signal;
    }

    setIsLoading(true);
    setError(null);

    const payload: FiltrosEnviosRecordatorios = {
      fechaInicio: activeFilters.fechaInicio,
      fechaFin: activeFilters.fechaFin,
      canal,
      idPlantilla: idPlantilla && idPlantilla > 0 ? idPlantilla : null,
      codEmpresa: activeFilters.sociedad,
      codEstaciones: activeFilters.estacionesSeleccionadas,
      busqueda: busqueda.trim() ? busqueda.trim() : undefined,
      modoVista,
    };

    try {
      const response = await consultarEnviosRecordatorios(payload, signal);
      setData(response);
      setPage(1);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error al consultar los envíos de recordatorios.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [canal, idPlantilla, busqueda, modoVista]);

  // Hook unificado de filtros con reactividad automática ante cambios en estaciones o sociedad
  const filters = useReportFilters({
    onFetchReport: (signal, currentFilters) => handleConsultar(signal, currentFilters),
    onClearData: () => setData(null),
    autoFetchOnFilterChange: true,
  });

  filtersRef.current = filters;

  // Reactividad inmediata al cambiar canal, plantilla o modo de vista
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    handleConsultar();
  }, [canal, idPlantilla, modoVista, handleConsultar]);

  const handleExportarExcel = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);

    const activeFilters = filtersRef.current || filters;
    const payload: FiltrosEnviosRecordatorios = {
      fechaInicio: activeFilters.fechaInicio,
      fechaFin: activeFilters.fechaFin,
      canal,
      idPlantilla: idPlantilla && idPlantilla > 0 ? idPlantilla : null,
      codEmpresa: activeFilters.sociedad,
      codEstaciones: activeFilters.estacionesSeleccionadas,
      busqueda: busqueda.trim() ? busqueda.trim() : undefined,
      modoVista,
    };

    try {
      const blob = await exportarExcelEnviosRecordatorios(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Envios_Recordatorios_${activeFilters.fechaInicio.replace(/-/g, '')}_${activeFilters.fechaFin.replace(/-/g, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setExportError(err.message || 'Error al descargar el archivo Excel.');
    } finally {
      setIsExporting(false);
    }
  }, [filters, canal, idPlantilla, busqueda, modoVista]);

  // Filtrado y ordenación en cliente para Resumen
  const filasResumenFiltradas = useMemo(() => {
    if (!data?.filasResumen) return [];
    let list = [...data.filasResumen];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.nombreEstacion.toLowerCase().includes(q) ||
          f.codigoEstacion.includes(q) ||
          f.descripcionPlantilla.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (sortField === 'fechaEnvio') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [data?.filasResumen, busqueda, sortField, sortAsc]);

  // Filtrado y ordenación en cliente para Detalle
  const filasDetalleFiltradas = useMemo(() => {
    if (!data?.filasDetalle) return [];
    let list = [...data.filasDetalle];

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.matricula.toLowerCase().includes(q) ||
          f.destinatario.toLowerCase().includes(q) ||
          f.nombre.toLowerCase().includes(q) ||
          f.apellidos.toLowerCase().includes(q) ||
          f.nombreEstacion.toLowerCase().includes(q) ||
          f.descripcionPlantilla.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (sortField === 'fechaEnvio' || sortField === 'fechaCaducidad') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [data?.filasDetalle, busqueda, sortField, sortAsc]);

  const filasActuales = modoVista === 'resumen' ? filasResumenFiltradas : filasDetalleFiltradas;
  const totalFilas = filasActuales.length;
  const totalPages = Math.max(1, Math.ceil(totalFilas / pageSize));

  const filasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filasActuales.slice(start, start + pageSize);
  }, [filasActuales, page, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setPage(1);
  };

  return {
    filters,
    canal,
    setCanal,
    idPlantilla,
    setIdPlantilla,
    modoVista,
    setModoVista,
    busqueda,
    setBusqueda,
    plantillas,
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFilas,
    sortField,
    sortAsc,
    handleSort,
    filasPaginadas,
    selectedDetalle,
    setSelectedDetalle,
    handleConsultar: () => handleConsultar(),
    handleExportarExcel,
  };
}
