import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ResumenEstaciones, FiltroSociedad, EstacionDato } from '../types/estaciones.types';
import { fetchUltimosDatosEstaciones } from '../../../api/estacionesApi';
import { SOCIEDADES } from '../../../constants/companies.constants';

export interface UseUltimosDatosReturn {
  data: ResumenEstaciones | null;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filtroSociedad: FiltroSociedad;
  setFiltroSociedad: (sociedad: FiltroSociedad) => void;
  estacionesFiltradas: EstacionDato[];
  recargar: () => Promise<void>;
}

/**
 * Custom Hook: useUltimosDatos
 * 
 * Centraliza toda la lógica de obtención de datos, filtrado en memoria por texto/sociedad
 * y control de estados (carga/error) desacoplándola de la vista JSX.
 */
export function useUltimosDatos(): UseUltimosDatosReturn {
  const [data, setData] = useState<ResumenEstaciones | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroSociedad, setFiltroSociedad] = useState<FiltroSociedad>('TODAS');

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await fetchUltimosDatosEstaciones();
      setData(json);
    } catch (err: any) {
      console.error('[Estaciones] Error técnico al obtener datos:', err);
      // Mensaje seguro sanitizado para pentest (cero fuga de ex.Message o infraestructura)
      setError('No ha sido posible recuperar los datos centralizados de las estaciones. Si la incidencia persiste, contacte con el departamento de soporte técnico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Filtrado reactivo optimizado con useMemo
  const estacionesFiltradas = useMemo(() => {
    if (!data?.estaciones) return [];
    return data.estaciones.filter((item) => {
      const matchText =
        item.codEstacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desEstacion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSociedad =
        filtroSociedad === 'TODAS' ||
        (filtroSociedad === SOCIEDADES.ATISAE.clave && item.codEmpresa === SOCIEDADES.ATISAE.codigo) ||
        (filtroSociedad === SOCIEDADES.CAL.clave && item.codEmpresa === SOCIEDADES.CAL.codigo);

      return matchText && matchSociedad;
    });
  }, [data, searchTerm, filtroSociedad]);

  return {
    data,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtroSociedad,
    setFiltroSociedad,
    estacionesFiltradas,
    recargar: cargarDatos,
  };
}

