import { useState, useEffect, useCallback, useRef } from 'react';
import { useReportFilters } from './useReportFilters';
import { useReportTable } from './useReportTable';
import { volumenDefectosApi } from '../api/volumenDefectosApi';
import type { CatalogoDefectoItem, VolumenDefectosFila, VolumenDefectosResponse } from '../types/volumenDefectos.types';

export type SortableVolumenDefectosColumn =
  | 'codEstacion'
  | 'grupoCategoria'
  | 'codigoCompleto'
  | 'gravedad'
  | 'descripcion'
  | 'numDefectos'
  | 'pctSobreTotal';

export const CATEGORIAS_DEFECTOS_MAP: Record<string, { label: string; desc: string }> = {
  Grupo_M1: { label: 'M1', desc: 'Turismos convencionales y todo-terrenos (M1, M1G)' },
  M1: { label: 'M1', desc: 'Turismos convencionales y todo-terrenos (M1, M1G)' },
  Grupo_M2_M3: { label: 'M2/M3', desc: 'Autobuses y autocares de transporte de personas (M2, M3)' },
  M2_M3: { label: 'M2/M3', desc: 'Autobuses y autocares de transporte de personas (M2, M3)' },
  Grupo_N1: { label: 'N1', desc: 'Vehículos comerciales ligeros hasta 3.500 kg (N1)' },
  N1: { label: 'N1', desc: 'Vehículos comerciales ligeros hasta 3.500 kg (N1)' },
  Grupo_N2_N3: { label: 'N2/N3', desc: 'Camiones pesados y cabezas tractoras > 3,5 t (N2, N3)' },
  N2_N3: { label: 'N2/N3', desc: 'Camiones pesados y cabezas tractoras > 3,5 t (N2, N3)' },
  Grupo_O3_O4: { label: 'O3/O4', desc: 'Remolques y semirremolques pesados (O3, O4)' },
  O3_O4: { label: 'O3/O4', desc: 'Remolques y semirremolques pesados (O3, O4)' },
  Grupo_L1_L1e: { label: 'L1', desc: 'Ciclomotores de dos y tres ruedas (L1, L1e)' },
  L1_L1e: { label: 'L1', desc: 'Ciclomotores de dos y tres ruedas (L1, L1e)' },
  Grupo_L3_L3e: { label: 'L3', desc: 'Motocicletas y triciclos de media/alta cilindrada (L3, L3e)' },
  L3_L3e: { label: 'L3', desc: 'Motocicletas y triciclos de media/alta cilindrada (L3, L3e)' },
  Otros: { label: 'Otros', desc: 'Otros vehículos especiales / agrícolas' },
};

export function useVolumenDefectosReport() {
  const [data, setData] = useState<VolumenDefectosResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filtros específicos del informe: Bloque y Defecto/Elemento
  const [bloques, setBloques] = useState<CatalogoDefectoItem[]>([]);
  const [elementos, setElementos] = useState<CatalogoDefectoItem[]>([]);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<string>('');
  const [defectoSeleccionado, setDefectoSeleccionado] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersRef = useRef<any>(null);

  // Cargar bloques en el montaje
  useEffect(() => {
    volumenDefectosApi.obtenerBloques().then(setBloques).catch(() => setBloques([]));
  }, []);

  // Cargar elementos al cambiar de bloque
  useEffect(() => {
    if (bloqueSeleccionado && bloqueSeleccionado !== 'TODOS') {
      volumenDefectosApi.obtenerElementos(bloqueSeleccionado).then(setElementos).catch(() => setElementos([]));
    } else {
      setElementos([]);
      setDefectoSeleccionado('');
    }
  }, [bloqueSeleccionado]);

  const ejecutarConsulta = useCallback(
    async (
      fIni: string,
      fFin: string,
      soc: string,
      ests: string[],
      bloqueVal: string,
      defectoVal: string,
      signal?: AbortSignal
    ) => {
      if (filtersRef.current?.alertaRangoFechas) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await volumenDefectosApi.consultar(
          {
            fechaInicio: fIni,
            fechaFin: fFin,
            sociedad: soc as any,
            estaciones: ests && ests.length > 0 ? ests : undefined,
            bloque: bloqueVal && bloqueVal !== 'TODOS' ? bloqueVal : undefined,
            defecto: defectoVal && defectoVal !== 'TODOS' ? defectoVal : undefined,
          },
          signal
        );
        setData(response);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Error al cargar datos del informe de volumen de defectos');
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
      ejecutarConsulta(fIni, fFin, soc, ests, bloqueSeleccionado, defectoSeleccionado, signal);
    },
    [ejecutarConsulta, bloqueSeleccionado, defectoSeleccionado]
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

  const searchPredicate = useCallback((fila: VolumenDefectosFila, term: string) => {
    const raw = term.trim().toLowerCase();
    if (!raw) return true;

    // 1. Filtrado canónico por Gravedad precisa (evita que 'g' o 'l' haga match en descripciones)
    if (raw === 'g' || raw === 'grave' || raw === 'graves') {
      return fila.gravedad === 'G';
    }
    if (raw === 'mg' || raw === 'muy grave' || raw === 'muy graves') {
      return fila.gravedad === 'MG';
    }
    if (raw === 'l' || raw === 'leve' || raw === 'leves') {
      return fila.gravedad === 'L';
    }
    if (raw === 'rechazo' || raw === 'con rechazo' || raw === 'desfavorable' || raw === 'g+mg' || raw === 'g + mg') {
      return fila.gravedad === 'G' || fila.gravedad === 'MG';
    }

    // 2. Homologación de Categoría de Vehículo (ej: 'turismo', 'm1', 'camión', 'n1'...)
    const catInfo = CATEGORIAS_DEFECTOS_MAP[fila.grupoCategoria];
    const catCodLimpio = (fila.grupoCategoria ?? '').replace('Grupo_', '').toLowerCase();
    const catTextoCompleto = `${catCodLimpio} ${catInfo?.label ?? ''} ${catInfo?.desc ?? ''}`.toLowerCase();
    if (catTextoCompleto.includes(raw)) {
      return true;
    }

    // 3. Filtrado por estación, código tipificado, descripción o número
    return (
      (fila.desEstacion ?? '').toLowerCase().includes(raw) ||
      (fila.codEstacion ?? '').toLowerCase().includes(raw) ||
      (fila.codigoCompleto ?? '').toLowerCase().includes(raw) ||
      (fila.descripcion ?? '').toLowerCase().includes(raw) ||
      (fila.numDefectos ?? 0).toString().includes(raw)
    );
  }, []);

  const sortComparator = useCallback(
    (a: VolumenDefectosFila, b: VolumenDefectosFila, col: SortableVolumenDefectosColumn, dir: 'asc' | 'desc') => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (col) {
        case 'codEstacion':
          valA = a.codEstacion ?? '';
          valB = b.codEstacion ?? '';
          break;
        case 'grupoCategoria':
          valA = a.grupoCategoria ?? '';
          valB = b.grupoCategoria ?? '';
          break;
        case 'codigoCompleto':
          valA = a.codigoCompleto ?? '';
          valB = b.codigoCompleto ?? '';
          break;
        case 'gravedad':
          valA = a.gravedad ?? '';
          valB = b.gravedad ?? '';
          break;
        case 'descripcion':
          valA = a.descripcion ?? '';
          valB = b.descripcion ?? '';
          break;
        case 'numDefectos':
          valA = a.numDefectos ?? 0;
          valB = b.numDefectos ?? 0;
          break;
        case 'pctSobreTotal':
          valA = a.pctSobreTotal ?? 0;
          valB = b.pctSobreTotal ?? 0;
          break;
        default:
          return 0;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return dir === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return dir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    },
    []
  );

  const table = useReportTable<VolumenDefectosFila, SortableVolumenDefectosColumn>({
    items: data?.filas,
    searchPredicate,
    sortComparator,
    initialSortColumn: 'numDefectos',
    initialSortDirection: 'desc',
    defaultPageSize: 50,
  });

  const exportarExcel = useCallback(async () => {
    if (!filters.fechaInicio || !filters.fechaFin) return;
    setIsExporting(true);
    setExportError(null);

    try {
      await volumenDefectosApi.exportarExcel({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        sociedad: filters.sociedad as any,
        estaciones: filters.estacionesSeleccionadas.length > 0 ? filters.estacionesSeleccionadas : undefined,
        bloque: bloqueSeleccionado && bloqueSeleccionado !== 'TODOS' ? bloqueSeleccionado : undefined,
        defecto: defectoSeleccionado && defectoSeleccionado !== 'TODOS' ? defectoSeleccionado : undefined,
      });
    } catch (err: any) {
      setExportError(err.message || 'Error al exportar volumen de defectos a Excel');
    } finally {
      setIsExporting(false);
    }
  }, [filters, bloqueSeleccionado, defectoSeleccionado]);

  return {
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    filters,
    table,
    consultar,
    exportarExcel,
    bloques,
    elementos,
    bloqueSeleccionado,
    setBloqueSeleccionado,
    defectoSeleccionado,
    setDefectoSeleccionado,
  };
}
