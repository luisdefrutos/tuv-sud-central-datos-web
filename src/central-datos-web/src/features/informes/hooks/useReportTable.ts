import { useState, useMemo, useCallback } from 'react';

export interface UseReportTableOptions<T, K extends string = string> {
  items: T[] | null | undefined;
  searchPredicate?: (item: T, term: string) => boolean;
  sortComparator?: (a: T, b: T, column: K, direction: 'asc' | 'desc') => number;
  initialSortColumn?: K;
  initialSortDirection?: 'asc' | 'desc';
  defaultPageSize?: number;
}

/**
 * Hook unificado para la gestión de tablas y grids en todos los informes de Central Datos.
 * Cumple los puntos 11 y 12 del Estándar Oficial de Informes:
 * - Búsqueda en memoria reactiva.
 * - Ordenación sobre todo el conjunto de datos antes de paginar.
 * - Reseteo a la página 1 ante búsquedas u ordenaciones.
 * - Paginación reactiva con selector de tamaño (50, 100, 200, 500).
 */
export function useReportTable<T, K extends string = string>({
  items,
  searchPredicate,
  sortComparator,
  initialSortColumn,
  initialSortDirection = 'desc',
  defaultPageSize = 50,
}: UseReportTableOptions<T, K>) {
  const [searchTerm, setSearchTermState] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<K | undefined>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number>(defaultPageSize);

  // Al escribir en el buscador, reseteamos a la página 1
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    setPage(1);
  }, []);

  // Al cambiar el tamaño de página, reseteamos a la página 1
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  // Ordenación con alternancia asc/desc y reseteo a página 1
  const handleSort = useCallback(
    (col: K) => {
      if (sortColumn === col) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(col);
        setSortDirection('desc');
      }
      setPage(1);
    },
    [sortColumn]
  );

  // 1. Filtrado por término de búsqueda
  const filasFiltradas = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (!searchTerm.trim() || !searchPredicate) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter((item) => searchPredicate(item, term));
  }, [items, searchTerm, searchPredicate]);

  // 2. Ordenación global de todo el conjunto de datos filtrado
  const filasFiltradasYOrdenadas = useMemo(() => {
    if (!filasFiltradas || filasFiltradas.length === 0) return [];
    if (!sortColumn || !sortComparator) return filasFiltradas;
    return [...filasFiltradas].sort((a, b) => sortComparator(a, b, sortColumn, sortDirection));
  }, [filasFiltradas, sortColumn, sortDirection, sortComparator]);

  // 3. Paginación
  const totalFilas = filasFiltradasYOrdenadas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFilas / pageSize));

  // Ajustar página actual si supera el total
  const paginaAjustada = Math.min(page, totalPaginas);

  const filasPaginadas = useMemo(() => {
    const start = (paginaAjustada - 1) * pageSize;
    return filasFiltradasYOrdenadas.slice(start, start + pageSize);
  }, [filasFiltradasYOrdenadas, paginaAjustada, pageSize]);

  return {
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    page: paginaAjustada,
    pageSize,
    setPage,
    setPageSize,
    totalFilas,
    totalPaginas,
    filasFiltradasYOrdenadas,
    filasPaginadas,
  };
}

