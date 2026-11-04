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
  // Filtros rápidos granulares (frmSMSEnviado)
  const [filtroCodInspeccion, setFiltroCodInspeccion] = useState<string>('');
  const [filtroTelefono, setFiltroTelefono] = useState<string>('');
  const [filtroMatricula, setFiltroMatricula] = useState<string>('');
  const [filtroFechaCaducidad, setFiltroFechaCaducidad] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroFechaEnvio, setFiltroFechaEnvio] = useState<string>('');

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
  const handleConsultar = useCallback(async (
    signal?: AbortSignal, 
    currentFilters?: ReportFilterValues,
    overrideGranulares?: Partial<FiltrosEnviosRecordatorios>
  ) => {
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
      canal: overrideGranulares && 'canal' in overrideGranulares ? (overrideGranulares.canal as any) : canal,
      idPlantilla: idPlantilla && idPlantilla > 0 ? idPlantilla : null,
      codEmpresa: activeFilters.sociedad,
      codEstaciones: activeFilters.estacionesSeleccionadas,
      busqueda: overrideGranulares && 'busqueda' in overrideGranulares 
        ? overrideGranulares.busqueda 
        : (busqueda.trim() ? busqueda.trim() : undefined),
      modoVista,
      codInspeccion: overrideGranulares && 'codInspeccion' in overrideGranulares 
        ? overrideGranulares.codInspeccion 
        : (filtroCodInspeccion.trim() ? filtroCodInspeccion.trim() : undefined),
      telefono: overrideGranulares && 'telefono' in overrideGranulares 
        ? overrideGranulares.telefono 
        : (filtroTelefono.trim() ? filtroTelefono.trim() : undefined),
      matricula: overrideGranulares && 'matricula' in overrideGranulares 
        ? overrideGranulares.matricula 
        : (filtroMatricula.trim() ? filtroMatricula.trim() : undefined),
      fechaCaducidad: overrideGranulares && 'fechaCaducidad' in overrideGranulares 
        ? overrideGranulares.fechaCaducidad 
        : (filtroFechaCaducidad.trim() ? filtroFechaCaducidad.trim() : undefined),
      cliente: overrideGranulares && 'cliente' in overrideGranulares 
        ? overrideGranulares.cliente 
        : (filtroCliente.trim() ? filtroCliente.trim() : undefined),
      fechaEnvioFiltro: overrideGranulares && 'fechaEnvioFiltro' in overrideGranulares 
        ? overrideGranulares.fechaEnvioFiltro 
        : (filtroFechaEnvio.trim() ? filtroFechaEnvio.trim() : undefined),
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
  }, [
    canal,
    idPlantilla,
    busqueda,
    modoVista,
    filtroCodInspeccion,
    filtroTelefono,
    filtroMatricula,
    filtroFechaCaducidad,
    filtroCliente,
    filtroFechaEnvio,
  ]);

  const limpiarFiltrosGranulares = useCallback(() => {
    setCanal('TODOS');
    setFiltroCodInspeccion('');
    setFiltroTelefono('');
    setFiltroMatricula('');
    setFiltroFechaCaducidad('');
    setFiltroCliente('');
    setFiltroFechaEnvio('');
    setBusqueda('');
    setPage(1);

    // Ejecución inmediata con el payload completamente limpio sin depender de closures asíncronas
    handleConsultar(undefined, undefined, {
      canal: 'TODOS',
      codInspeccion: undefined,
      telefono: undefined,
      matricula: undefined,
      fechaCaducidad: undefined,
      cliente: undefined,
      fechaEnvioFiltro: undefined,
      busqueda: undefined,
    });
  }, [handleConsultar]);

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
      codInspeccion: filtroCodInspeccion.trim() ? filtroCodInspeccion.trim() : undefined,
      telefono: filtroTelefono.trim() ? filtroTelefono.trim() : undefined,
      matricula: filtroMatricula.trim() ? filtroMatricula.trim() : undefined,
      fechaCaducidad: filtroFechaCaducidad.trim() ? filtroFechaCaducidad.trim() : undefined,
      cliente: filtroCliente.trim() ? filtroCliente.trim() : undefined,
      fechaEnvioFiltro: filtroFechaEnvio.trim() ? filtroFechaEnvio.trim() : undefined,
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

  // Filtrado y ordenación en cliente para Detalle (con soporte exacto de comodín * de frmSMSEnviado)
  const filasDetalleFiltradas = useMemo(() => {
    if (!data?.filasDetalle) return [];
    let list = [...data.filasDetalle];

    // Helper para coincidencias con comodín * estilo desktop
    const matchesWildcard = (value: string, pattern: string) => {
      if (!pattern) return true;
      const cleanPat = pattern.trim().toLowerCase();
      if (!cleanPat) return true;
      if (cleanPat.includes('*')) {
        const regexStr = '^' + cleanPat.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$';
        return new RegExp(regexStr, 'i').test(value);
      }
      return value.toLowerCase().includes(cleanPat);
    };

    // 1. Filtro Cod. Inspección
    if (filtroCodInspeccion.trim()) {
      const q = filtroCodInspeccion.trim();
      list = list.filter((f) => f.numeroInspeccion.toString().includes(q));
    }

    // 2. Filtro Teléfono / Destinatario
    if (filtroTelefono.trim()) {
      list = list.filter((f) => matchesWildcard(f.destinatario, filtroTelefono));
    }

    // 3. Filtro Matrícula (soporta comodín *)
    if (filtroMatricula.trim()) {
      list = list.filter((f) => matchesWildcard(f.matricula, filtroMatricula));
    }

    // 4. Filtro Fecha Caducidad / Vencimiento
    if (filtroFechaCaducidad.trim()) {
      const q = filtroFechaCaducidad.trim();
      list = list.filter((f) => {
        if (!f.fechaCaducidad) return false;
        const dStr = new Date(f.fechaCaducidad).toLocaleDateString('es-ES');
        return dStr.includes(q) || f.fechaCaducidad.includes(q);
      });
    }

    // 5. Filtro Cliente (Nombre o Apellidos)
    if (filtroCliente.trim()) {
      list = list.filter((f) => {
        const nombreCompleto = `${f.nombre} ${f.apellidos}`.trim();
        return matchesWildcard(nombreCompleto, filtroCliente);
      });
    }

    // 6. Filtro Fecha Envío
    if (filtroFechaEnvio.trim()) {
      const q = filtroFechaEnvio.trim();
      list = list.filter((f) => {
        const dStr = new Date(f.fechaEnvio).toLocaleDateString('es-ES');
        return dStr.includes(q) || f.fechaEnvio.includes(q);
      });
    }

    // 7. Buscador general adicional
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
    filtroCodInspeccion,
    setFiltroCodInspeccion,
    filtroTelefono,
    setFiltroTelefono,
    filtroMatricula,
    setFiltroMatricula,
    filtroFechaCaducidad,
    setFiltroFechaCaducidad,
    filtroCliente,
    setFiltroCliente,
    filtroFechaEnvio,
    setFiltroFechaEnvio,
    limpiarFiltrosGranulares,
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
