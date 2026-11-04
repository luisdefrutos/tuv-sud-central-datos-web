import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useReportFilters } from './useReportFilters';
import { useReportTable } from './useReportTable';
import { clientesVolumenApi } from '../api/clientesVolumenApi';
import type {
  ClientesVolumenFila,
  ClientesVolumenResponse,
  ProyectoComercialItem,
  TipoVehiculoMinerItem,
} from '../types/clientesVolumen.types';

export type SortableClientesVolumenColumn =
  | 'codEstacion'
  | 'cifFactura'
  | 'cifTitular'
  | 'nombreCliente'
  | 'domicilio'
  | 'codigoPostal'
  | 'poblacion'
  | 'provincia'
  | 'telefono'
  | 'telefono2'
  | 'resultado'
  | 'cuenta'
  | 'cuentaCif';

export function useClientesVolumenReport() {
  const [data, setData] = useState<ClientesVolumenResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filtros específicos del informe C8
  const [fase, setFase] = useState<string>('TODAS');
  const [limiteCuenta, setLimiteCuenta] = useState<number>(1);
  const [idProyecto, setIdProyecto] = useState<number | undefined>(undefined);
  const [tiposVehiculoSeleccionados, setTiposVehiculoSeleccionados] = useState<string[]>([]);

  // Catálogos auxiliares
  const [proyectos, setProyectos] = useState<ProyectoComercialItem[]>([]);
  const [tiposVehiculoCatalogo, setTiposVehiculoCatalogo] = useState<TipoVehiculoMinerItem[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersRef = useRef<any>(null);

  // Cargar catálogos en el montaje
  useEffect(() => {
    clientesVolumenApi.obtenerProyectos().then(setProyectos).catch(() => setProyectos([]));
    clientesVolumenApi.obtenerTiposVehiculo().then(setTiposVehiculoCatalogo).catch(() => setTiposVehiculoCatalogo([]));
  }, []);

  const ejecutarConsulta = useCallback(
    async (
      fIni: string,
      fFin: string,
      soc: string,
      ests: string[],
      faseVal: string,
      limiteVal: number,
      idProyVal: number | undefined,
      tiposVal: string[],
      signal?: AbortSignal
    ) => {
      if (filtersRef.current?.alertaRangoFechas) {
        setData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await clientesVolumenApi.consultar(
          {
            fechaInicio: fIni,
            fechaFin: fFin,
            sociedad: soc as any,
            estaciones: ests && ests.length > 0 ? ests : undefined,
            fase: faseVal !== 'TODAS' ? faseVal : undefined,
            limiteCuenta: limiteVal > 0 ? limiteVal : 1,
            idProyecto: idProyVal && idProyVal > 0 ? idProyVal : undefined,
            tiposVehiculo: tiposVal && tiposVal.length > 0 ? tiposVal : undefined,
          },
          signal
        );
        setData(response);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Error al cargar datos de clientes por volumen de inspecciones');
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
      ejecutarConsulta(
        fIni,
        fFin,
        soc,
        ests,
        fase,
        limiteCuenta,
        idProyecto,
        tiposVehiculoSeleccionados,
        signal
      );
    },
    [ejecutarConsulta, fase, limiteCuenta, idProyecto, tiposVehiculoSeleccionados]
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

  // Clave estable para detectar cambios reales en tipos de vehículos
  const tiposVehiculoKey = useMemo(() => {
    return tiposVehiculoSeleccionados.slice().sort().join(',');
  }, [tiposVehiculoSeleccionados]);

  // Actualización automática debounced (250ms) al cambiar límite de inspecciones, fase, proyecto o MINER
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      consultar();
    }, 250);
    return () => clearTimeout(timer);
  }, [limiteCuenta, fase, idProyecto, tiposVehiculoKey, consultar]);

  // Mapa de total acumulado por CIF titular en todo el periodo consultado (para vincular con el Top Clientes y KPIs)
  const totalesPorCif = useMemo(() => {
    const map = new Map<string, number>();
    if (!data?.filas) return map;
    for (const f of data.filas) {
      const cif = (f.cifTitular || '').trim().toUpperCase();
      if (cif) {
        map.set(cif, (map.get(cif) || 0) + (f.cuenta || 0));
      }
    }
    return map;
  }, [data?.filas]);

  // Predicado de búsqueda en memoria para la tabla (soporta texto y número exacto de inspecciones)
  const searchPredicate = useCallback((fila: ClientesVolumenFila, term: string): boolean => {
    const raw = term.trim().toLowerCase();
    if (!raw) return true;
    if (raw === 'fav' || raw === 'favorable') return fila.resultado === 'FAV';
    if (raw === 'rechazo' || raw === 'desfav' || raw === 'desfavorable') return fila.resultado !== 'FAV';

    // Búsqueda numérica exacta o parcial por número de inspecciones del cliente o fila
    const rawNum = parseInt(raw, 10);
    const cifKey = (fila.cifTitular || '').trim().toUpperCase();
    const totalClientePeriodo = totalesPorCif.get(cifKey);
    const matchesCount = !isNaN(rawNum) && (
      fila.cuenta === rawNum ||
      fila.cuentaCif === rawNum ||
      (totalClientePeriodo !== undefined && totalClientePeriodo === rawNum)
    );

    return Boolean(
      matchesCount ||
      (fila.cifTitular && fila.cifTitular.toLowerCase().includes(raw)) ||
      (fila.cifFactura && fila.cifFactura.toLowerCase().includes(raw)) ||
      (fila.nombreCliente && fila.nombreCliente.toLowerCase().includes(raw)) ||
      (fila.domicilio && fila.domicilio.toLowerCase().includes(raw)) ||
      (fila.codigoPostal && fila.codigoPostal.includes(raw)) ||
      (fila.poblacion && fila.poblacion.toLowerCase().includes(raw)) ||
      (fila.provincia && fila.provincia.toLowerCase().includes(raw)) ||
      (fila.telefono && fila.telefono.includes(raw)) ||
      (fila.telefono2 && fila.telefono2.includes(raw)) ||
      (fila.desEstacion && fila.desEstacion.toLowerCase().includes(raw)) ||
      (fila.codEstacion && fila.codEstacion.includes(raw))
    );
  }, [totalesPorCif]);

  // Comparador de ordenación multi-columna
  const sortComparator = useCallback(
    (a: ClientesVolumenFila, b: ClientesVolumenFila, col: SortableClientesVolumenColumn, dir: 'asc' | 'desc') => {
      let valA: any = '';
      let valB: any = '';

      switch (col) {
        case 'codEstacion':
          valA = a.codEstacion ?? '';
          valB = b.codEstacion ?? '';
          break;
        case 'cifTitular':
          valA = a.cifTitular ?? '';
          valB = b.cifTitular ?? '';
          break;
        case 'cifFactura':
          valA = a.cifFactura ?? '';
          valB = b.cifFactura ?? '';
          break;
        case 'nombreCliente':
          valA = a.nombreCliente ?? '';
          valB = b.nombreCliente ?? '';
          break;
        case 'domicilio':
          valA = a.domicilio ?? '';
          valB = b.domicilio ?? '';
          break;
        case 'codigoPostal':
          valA = a.codigoPostal ?? '';
          valB = b.codigoPostal ?? '';
          break;
        case 'poblacion':
          valA = a.poblacion ?? '';
          valB = b.poblacion ?? '';
          break;
        case 'provincia':
          valA = a.provincia ?? '';
          valB = b.provincia ?? '';
          break;
        case 'telefono':
          valA = a.telefono ?? '';
          valB = b.telefono ?? '';
          break;
        case 'telefono2':
          valA = a.telefono2 ?? '';
          valB = b.telefono2 ?? '';
          break;
        case 'resultado':
          valA = a.resultado ?? '';
          valB = b.resultado ?? '';
          break;
        case 'cuenta':
          valA = a.cuenta ?? 0;
          valB = b.cuenta ?? 0;
          break;
        case 'cuentaCif':
          valA = a.cuentaCif ?? 0;
          valB = b.cuentaCif ?? 0;
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

  const table = useReportTable<ClientesVolumenFila, SortableClientesVolumenColumn>({
    items: data?.filas,
    searchPredicate,
    sortComparator,
    initialSortColumn: 'cuentaCif',
    initialSortDirection: 'desc',
    defaultPageSize: 50,
  });

  const exportarExcel = useCallback(async () => {
    if (!filters.fechaInicio || !filters.fechaFin) return;
    setIsExporting(true);
    setExportError(null);

    try {
      await clientesVolumenApi.exportarExcel({
        fechaInicio: filters.fechaInicio,
        fechaFin: filters.fechaFin,
        sociedad: filters.sociedad as any,
        estaciones: filters.estacionesSeleccionadas.length > 0 ? filters.estacionesSeleccionadas : undefined,
        fase: fase !== 'TODAS' ? fase : undefined,
        limiteCuenta: limiteCuenta > 0 ? limiteCuenta : 1,
        idProyecto: idProyecto && idProyecto > 0 ? idProyecto : undefined,
        tiposVehiculo: tiposVehiculoSeleccionados.length > 0 ? tiposVehiculoSeleccionados : undefined,
      });
    } catch (err: any) {
      setExportError(err.message || 'Error al exportar el fichero Excel');
    } finally {
      setIsExporting(false);
    }
  }, [filters, fase, limiteCuenta, idProyecto, tiposVehiculoSeleccionados]);

  const alternarTipoVehiculo = (codigo: string) => {
    setTiposVehiculoSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const seleccionarTodosTipos = () => {
    if (tiposVehiculoSeleccionados.length === tiposVehiculoCatalogo.length) {
      setTiposVehiculoSeleccionados([]);
    } else {
      setTiposVehiculoSeleccionados(tiposVehiculoCatalogo.map((t) => t.codigo));
    }
  };

  return {
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    filters,
    table,
    consultar,
    fase,
    setFase,
    limiteCuenta,
    setLimiteCuenta,
    idProyecto,
    setIdProyecto,
    tiposVehiculoSeleccionados,
    alternarTipoVehiculo,
    seleccionarTodosTipos,
    proyectos,
    tiposVehiculoCatalogo,
    exportarExcel,
  };
}
