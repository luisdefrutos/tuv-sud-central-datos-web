import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  InformeFacturacionComparativaResponse,
  FilaFacturacionComparativa,
  SortableFacturacionComparativaColumn,
} from '../types/informes.types';
import {
  facturacionComparativaApi,
  type FiltrosFacturacionComparativa,
} from '../api/facturacionComparativaApi';
import { toDateInputValue } from './useReportFilters';

export function useFacturacionComparativaReport() {
  // Inicialización de fechas: Rango 2 = Año/mes actual, Rango 1 = Mismo periodo año anterior
  // Inicialización fiel a la app de escritorio (frmCriteriosExcel.vb):
  // R2 = Desde el día 1 del mes anterior hasta la fecha actual
  // R1 = Mismo periodo en el año anterior
  const fechasDefecto = useMemo(() => {
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth(); // 0-indexed
    const diaActual = hoy.getDate();

    const r2Fin = new Date(añoActual, mesActual, diaActual);
    const r2Ini = new Date(añoActual, mesActual - 1, 1);

    const añoAnterior = añoActual - 1;
    const r1Fin = new Date(añoAnterior, mesActual, diaActual);
    const r1Ini = new Date(añoAnterior, mesActual - 1, 1);

    return {
      r1Ini: toDateInputValue(r1Ini),
      r1Fin: toDateInputValue(r1Fin),
      r2Ini: toDateInputValue(r2Ini),
      r2Fin: toDateInputValue(r2Fin),
    };
  }, []);

  const [fechaInicioR1, setFechaInicioR1] = useState(fechasDefecto.r1Ini);
  const [fechaFinR1, setFechaFinR1] = useState(fechasDefecto.r1Fin);
  const [fechaInicioR2, setFechaInicioR2] = useState(fechasDefecto.r2Ini);
  const [fechaFinR2, setFechaFinR2] = useState(fechasDefecto.r2Fin);
  const [sociedad, setSociedad] = useState<'TODAS' | 'TSA' | 'CAL'>('TODAS');
  const [codEstaciones, setCodEstaciones] = useState<string[]>([]);

  // Estados de datos y carga
  const [data, setData] = useState<InformeFacturacionComparativaResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de exportación
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Ordenación y filtrado local
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortableFacturacionComparativaColumn>('difIngresos');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const abortControllerRef = useRef<AbortController | null>(null);

  const consultar = useCallback(
    async (filtrosOverride?: Partial<FiltrosFacturacionComparativa>) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const fR1Ini = filtrosOverride?.fechaInicioRango1 ?? fechaInicioR1;
      const fR1Fin = filtrosOverride?.fechaFinRango1 ?? fechaFinR1;
      const fR2Ini = filtrosOverride?.fechaInicioRango2 ?? fechaInicioR2;
      const fR2Fin = filtrosOverride?.fechaFinRango2 ?? fechaFinR2;
      const soc = filtrosOverride?.sociedad ?? sociedad;
      const ests = filtrosOverride?.codEstaciones ?? codEstaciones;

      setIsLoading(true);
      setError(null);

      try {
        const res = await facturacionComparativaApi.consultarFacturacionComparativa(
          {
            fechaInicioRango1: fR1Ini,
            fechaFinRango1: fR1Fin,
            fechaInicioRango2: fR2Ini,
            fechaFinRango2: fR2Fin,
            sociedad: soc,
            codEstaciones: ests.length > 0 ? ests : undefined,
          },
          abortControllerRef.current.signal
        );
        setData(res);
        setCurrentPage(1);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al consultar la facturación comparativa');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [fechaInicioR1, fechaFinR1, fechaInicioR2, fechaFinR2, sociedad, codEstaciones]
  );

  // Carga inicial protegida contra StrictMode de React
  const hasLoadedInitialRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      void consultar();
    }
  }, [consultar]);

  // Exportar Excel
  const exportarExcel = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await facturacionComparativaApi.exportarExcel({
        fechaInicioRango1: fechaInicioR1,
        fechaFinRango1: fechaFinR1,
        fechaInicioRango2: fechaInicioR2,
        fechaFinRango2: fechaFinR2,
        sociedad,
        codEstaciones: codEstaciones.length > 0 ? codEstaciones : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturacion-comparativa-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar el fichero Excel');
    } finally {
      setIsExporting(false);
    }
  }, [fechaInicioR1, fechaFinR1, fechaInicioR2, fechaFinR2, sociedad, codEstaciones]);

  // Manejo de cambio de orden
  const handleSort = (col: SortableFacturacionComparativaColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  // Filtrado y ordenación sobre las filas con normalización estricta de sociedad (Burgos 09xx = CAL)
  const filasFiltradas = useMemo(() => {
    if (!data?.filas) return [];

    let result = data.filas.map((f) => {
      const cod = (f.codEstacion || '').trim().padStart(4, '0');
      const esCal = cod.startsWith('09') || ['0902', '0903', '0906', '0908'].includes(cod);
      const socReal = esCal ? 'CAL' : 'TSA';
      return f.sociedad !== socReal ? { ...f, sociedad: socReal } : f;
    });

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.desEstacion.toLowerCase().includes(q) ||
          f.codEstacion.includes(q) ||
          f.sociedad.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: string | number = a[sortColumn];
      let valB: string | number = b[sortColumn];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string, 'es', { sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      return sortDirection === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [data?.filas, searchTerm, sortColumn, sortDirection]);

  // Paginación de filas
  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / pageSize));
  const filasPaginadas = useMemo(() => {
    const inicio = (currentPage - 1) * pageSize;
    return filasFiltradas.slice(inicio, inicio + pageSize);
  }, [filasFiltradas, currentPage, pageSize]);

  return {
    // Filtros
    fechaInicioR1,
    setFechaInicioR1,
    fechaFinR1,
    setFechaFinR1,
    fechaInicioR2,
    setFechaInicioR2,
    fechaFinR2,
    setFechaFinR2,
    sociedad,
    setSociedad,
    codEstaciones,
    setCodEstaciones,
    consultar,

    // Estados
    data,
    isLoading,
    error,
    isExporting,
    exportError,

    // Búsqueda y orden
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,

    // Paginación
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPaginas,
    filasFiltradas,
    filasPaginadas,

    // Acciones
    exportarExcel,
  };
}
