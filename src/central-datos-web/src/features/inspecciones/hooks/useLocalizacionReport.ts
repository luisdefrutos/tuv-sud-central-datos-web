import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useReportFilters, toDateInputValue } from '../../informes/hooks/useReportFilters';
import type { ReportFilterValues } from '../../informes/hooks/useReportFilters';
import {
  obtenerCatalogosLocalizacion,
  obtenerBloquesPorSeccion,
  obtenerElementosPorBloque,
  obtenerSubdefectosPorElemento,
  consultarLocalizacion,
  exportarLocalizacionExcel,
} from '../api/localizacionApi';
import type {
  CatalogosLocalizacionResponse,
  FilaLocalizacion,
  FiltrosLocalizacionRequest,
  LocalizacionResponse,
  OpcionComboLocalizacion,
  SubdefectoLocalizacion,
  TipoLocalizacion,
} from '../types/localizacion.types';

const UMBRAL_AVISO_REGISTROS_ALTOS = 50_000;
const MAX_FILAS_EXPORT_EXCEL = 150_000;

export function useLocalizacionReport(tipo: TipoLocalizacion) {
  // En frmCriteriosLocalizacion*.vb las fechas por defecto son Ayer (Now - 1 día) a Hoy (Now)
  const defaultDates = useMemo(() => {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    return {
      inicio: toDateInputValue(ayer),
      fin: toDateInputValue(hoy),
    };
  }, []);

  // Catálogos y columnas dinámicas
  const [catalogos, setCatalogos] = useState<CatalogosLocalizacionResponse | null>(null);
  const [idsCamposSeleccionados, setIdsCamposSeleccionados] = useState<number[]>([]);
  const [bloquesDinamicos, setBloquesDinamicos] = useState<OpcionComboLocalizacion[]>([]);
  const [elementosDinamicos, setElementosDinamicos] = useState<OpcionComboLocalizacion[]>([]);
  const [subdefectosDinamicos, setSubdefectosDinamicos] = useState<SubdefectoLocalizacion[]>([]);

  // Filtros comunes de vehículo y titular
  const [marca, setMarca] = useState('');
  const [tipoMotor, setTipoMotor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaDistinto, setCategoriaDistinto] = useState(false);
  const [construccion, setConstruccion] = useState('');
  const [utilizacion, setUtilizacion] = useState('');
  const [cifTitular, setCifTitular] = useState('');

  // Filtros específicos de Localización Inspecciones
  const [fechaVencInicio, setFechaVencInicio] = useState('');
  const [fechaVencFin, setFechaVencFin] = useState('');
  const [excluirInspeccionadosPost, setExcluirInspeccionadosPost] = useState(false);
  const [matricula, setMatricula] = useState('');
  const [homologacion, setHomologacion] = useState('');
  const [homologacionDistinto, setHomologacionDistinto] = useState(false);
  const [bastidor, setBastidor] = useState('');
  const [apellidosTitular, setApellidosTitular] = useState('');
  const [cpTitular, setCpTitular] = useState('');
  const [provinciaTitular, setProvinciaTitular] = useState('');
  const [emailTitular, setEmailTitular] = useState('');
  const [telefonoTitular, setTelefonoTitular] = useState('');
  const [telefonoTitular2, setTelefonoTitular2] = useState('');
  const [cifFactura, setCifFactura] = useState('');
  const [razonSocialFactura, setRazonSocialFactura] = useState('');
  const [cpFactura, setCpFactura] = useState('');
  const [provinciaFactura, setProvinciaFactura] = useState('');
  const [emailFactura, setEmailFactura] = useState('');
  const [telefonoFactura, setTelefonoFactura] = useState('');

  // Filtros específicos de Defectos, Elementos y Mediciones
  const [seccionManual, setSeccionManual] = useState('');
  const [bloque, setBloque] = useState('');
  const [defecto, setDefecto] = useState('');
  const [subdefectoKey, setSubdefectoKey] = useState(''); // formato "SUBDEFECTO|NUMERO"
  const [tiposVehiculoMiner, setTiposVehiculoMiner] = useState<string[]>([]);

  // Estado de datos y carga
  const [data, setData] = useState<LocalizacionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportConfirmationRequired, setExportConfirmationRequired] = useState(false);
  const activeQueryControllerRef = useRef<AbortController | null>(null);

  // Estado de tabla, búsqueda, ordenación y paginación
  const [busqueda, setBusqueda] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRow, setSelectedRow] = useState<FilaLocalizacion | null>(null);

  const buildPayload = useCallback(
    (overrideFilters?: ReportFilterValues, overrideCampos?: number[]): FiltrosLocalizacionRequest => {
      const f = overrideFilters ?? {
        fechaInicio: filtersRef.current.fechaInicio,
        fechaFin: filtersRef.current.fechaFin,
        sociedad: filtersRef.current.sociedad,
        estacionesSeleccionadas: filtersRef.current.estacionesSeleccionadas,
        estacionesPermitidas: filtersRef.current.estacionesPermitidas,
        fase: filtersRef.current.fase,
      };

      let subdefectoVal: string | undefined;
      let numeroDefectoVal: string | undefined;
      if (subdefectoKey && subdefectoKey.includes('|')) {
        const [sd, num] = subdefectoKey.split('|');
        subdefectoVal = sd || undefined;
        numeroDefectoVal = num || undefined;
      }

      return {
        tipo,
        fechaInicio: f.fechaInicio,
        fechaFin: f.fechaFin,
        sociedad: f.sociedad === 'TODAS' ? undefined : f.sociedad,
        codEstaciones: f.estacionesSeleccionadas,
        fase: f.fase === 'TODAS' ? undefined : f.fase,
        idsCamposSeleccionados: overrideCampos ?? idsCamposSeleccionados,
        marca: marca.trim() || undefined,
        tipoMotor: tipoMotor || undefined,
        categoria: categoria || undefined,
        categoriaDistinto,
        construccion: construccion || undefined,
        utilizacion: utilizacion || undefined,
        cifTitular: cifTitular.trim() || undefined,
        fechaVencInicio: fechaVencInicio || null,
        fechaVencFin: fechaVencFin || null,
        excluirInspeccionadosPost: (Boolean(fechaVencInicio || fechaVencFin)) && excluirInspeccionadosPost,
        matricula: matricula.trim() || undefined,
        homologacion: homologacion.trim() || undefined,
        homologacionDistinto,
        bastidor: bastidor.trim() || undefined,
        apellidosTitular: apellidosTitular.trim() || undefined,
        cpTitular: cpTitular.trim() || undefined,
        provinciaTitular: provinciaTitular || undefined,
        emailTitular: emailTitular.trim() || undefined,
        telefonoTitular: telefonoTitular.trim() || undefined,
        telefonoTitular2: telefonoTitular2.trim() || undefined,
        cifFactura: cifFactura.trim() || undefined,
        razonSocialFactura: razonSocialFactura.trim() || undefined,
        cpFactura: cpFactura.trim() || undefined,
        provinciaFactura: provinciaFactura || undefined,
        emailFactura: emailFactura.trim() || undefined,
        telefonoFactura: telefonoFactura.trim() || undefined,
        seccionManual: seccionManual || undefined,
        bloque: bloque || undefined,
        defecto: defecto || undefined,
        subdefecto: subdefectoVal,
        numeroDefecto: numeroDefectoVal,
        tiposVehiculoMiner: tiposVehiculoMiner.length > 0 ? tiposVehiculoMiner : undefined,
      };
    },
    [
      tipo,
      idsCamposSeleccionados,
      marca,
      tipoMotor,
      categoria,
      categoriaDistinto,
      construccion,
      utilizacion,
      cifTitular,
      fechaVencInicio,
      fechaVencFin,
      excluirInspeccionadosPost,
      matricula,
      homologacion,
      homologacionDistinto,
      bastidor,
      apellidosTitular,
      cpTitular,
      provinciaTitular,
      emailTitular,
      telefonoTitular,
      telefonoTitular2,
      cifFactura,
      razonSocialFactura,
      cpFactura,
      provinciaFactura,
      emailFactura,
      telefonoFactura,
      seccionManual,
      bloque,
      defecto,
      subdefectoKey,
      tiposVehiculoMiner,
    ]
  );

  const catalogLoadedRef = useRef(false);

  const ejecutarConsulta = useCallback(
    async (signal?: AbortSignal, currentFilters?: ReportFilterValues, overrideCampos?: number[]) => {
      if (!catalogLoadedRef.current && !overrideCampos) {
        return;
      }
      activeQueryControllerRef.current?.abort();
      const f = currentFilters ?? filtersRef.current;
      if (!f.estacionesSeleccionadas || f.estacionesSeleccionadas.length === 0) {
        setData(null);
        setIsLoading(false);
        return;
      }

      const requestController = new AbortController();
      activeQueryControllerRef.current = requestController;
      const abortFromParent = () => requestController.abort();
      if (signal?.aborted) {
        requestController.abort();
      } else {
        signal?.addEventListener('abort', abortFromParent, { once: true });
      }

      setIsLoading(true);
      setError(null);
      setExportConfirmationRequired(false);
      try {
        const payload = buildPayload(f, overrideCampos);
        const res = await consultarLocalizacion(payload, requestController.signal);
        if (!requestController.signal.aborted) {
          setData(res);
          setPage(1);
          if (res.columnas.length > 0 && !sortField) {
            setSortField(res.columnas[0].columnaExcel);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al consultar la localización.');
      } finally {
        signal?.removeEventListener('abort', abortFromParent);
        if (activeQueryControllerRef.current === requestController) {
          activeQueryControllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [buildPayload, sortField]
  );

  const filters = useReportFilters({
    defaultFechaInicio: defaultDates.inicio,
    defaultFechaFin: defaultDates.fin,
    initialFase: 'TODAS',
    onFetchReport: ejecutarConsulta,
    onClearData: () => setData(null),
    autoFetchOnFilterChange: true,
  });

  const filtersRef = useRef<ReportFilterValues>({
    fechaInicio: filters.fechaInicio,
    fechaFin: filters.fechaFin,
    sociedad: filters.sociedad,
    estacionesSeleccionadas: filters.estacionesSeleccionadas,
    estacionesPermitidas: filters.estacionesPermitidas,
    fase: filters.fase,
  });
  filtersRef.current = {
    fechaInicio: filters.fechaInicio,
    fechaFin: filters.fechaFin,
    sociedad: filters.sociedad,
    estacionesSeleccionadas: filters.estacionesSeleccionadas,
    estacionesPermitidas: filters.estacionesPermitidas,
    fase: filters.fase,
  };

  // Cargar catálogos al montar o al cambiar de tipo de localización
  useEffect(() => {
    let isMounted = true;
    catalogLoadedRef.current = false;
    const queryController = new AbortController();
    setIsCatalogLoading(true);
    setData(null);
    setError(null);

    obtenerCatalogosLocalizacion(tipo, queryController.signal)
      .then((cat) => {
        if (!isMounted) return;
        setCatalogos(cat);
        setBloquesDinamicos(cat.bloques);
        const defaultIds = cat.columnas.filter((c) => c.porDefecto).map((c) => c.idCampo);
        const initialIds = defaultIds.length > 0 ? defaultIds : cat.columnas.slice(0, 10).map((c) => c.idCampo);
        setIdsCamposSeleccionados(initialIds);
        catalogLoadedRef.current = true;
        void ejecutarConsulta(queryController.signal, filtersRef.current, initialIds);
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar catálogos de localización.');
      })
      .finally(() => {
        if (isMounted) {
          setIsCatalogLoading(false);
        }
      });

    return () => {
      isMounted = false;
      queryController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  // Cascada 1: Al cambiar Sección Manual en Defectos -> recargar Bloques
  useEffect(() => {
    if (tipo !== 'defectos') return;
    let isMounted = true;
    const controller = new AbortController();
    obtenerBloquesPorSeccion(seccionManual || undefined, controller.signal)
      .then((b) => {
        if (isMounted) {
          setBloquesDinamicos(b);
        }
      })
      .catch((err: unknown) => {
        if (isMounted && !(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Error al cargar los bloques de inspección.');
        }
      });
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tipo, seccionManual]);

  // Cascada 2: Al cambiar Bloque en Defectos o Elementos -> recargar Elementos/Defectos
  useEffect(() => {
    if (tipo !== 'defectos' && tipo !== 'elementos') return;
    if (!bloque) {
      setElementosDinamicos([]);
      setDefecto('');
      setSubdefectosDinamicos([]);
      setSubdefectoKey('');
      return;
    }
    let isMounted = true;
    const controller = new AbortController();
    obtenerElementosPorBloque(
      bloque,
      tipo === 'defectos' ? seccionManual || undefined : undefined,
      controller.signal
    )
      .then((elems) => {
        if (isMounted) {
          setElementosDinamicos(elems);
        }
      })
      .catch((err: unknown) => {
        if (isMounted && !(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Error al cargar los elementos del bloque.');
        }
      });
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tipo, bloque, seccionManual]);

  // Cascada 3: Al cambiar Defecto en Defectos -> recargar Subdefectos
  useEffect(() => {
    if (tipo !== 'defectos') return;
    if (!bloque || !defecto) {
      setSubdefectosDinamicos([]);
      setSubdefectoKey('');
      return;
    }
    let isMounted = true;
    const controller = new AbortController();
    obtenerSubdefectosPorElemento(bloque, defecto, seccionManual || undefined, controller.signal)
      .then((subs) => {
        if (isMounted) {
          setSubdefectosDinamicos(subs);
        }
      })
      .catch((err: unknown) => {
        if (isMounted && !(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Error al cargar los subdefectos.');
        }
      });
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tipo, bloque, defecto, seccionManual]);

  const limpiarFiltrosVehiculo = useCallback(() => {
    setMarca('');
    setTipoMotor('');
    setCategoria('');
    setCategoriaDistinto(false);
    setConstruccion('');
    setUtilizacion('');
    setMatricula('');
    setHomologacion('');
    setHomologacionDistinto(false);
    setBastidor('');
    setFechaVencInicio('');
    setFechaVencFin('');
    setExcluirInspeccionadosPost(false);
    setSeccionManual('');
    setBloque('');
    setDefecto('');
    setSubdefectoKey('');
    setTiposVehiculoMiner([]);
  }, []);

  const limpiarFiltrosTitularFactura = useCallback(() => {
    setCifTitular('');
    setApellidosTitular('');
    setCpTitular('');
    setProvinciaTitular('');
    setEmailTitular('');
    setTelefonoTitular('');
    setTelefonoTitular2('');
    setCifFactura('');
    setRazonSocialFactura('');
    setCpFactura('');
    setProvinciaFactura('');
    setEmailFactura('');
    setTelefonoFactura('');
  }, []);

  const limpiarFiltrosAvanzados = useCallback(() => {
    limpiarFiltrosVehiculo();
    limpiarFiltrosTitularFactura();
  }, [limpiarFiltrosVehiculo, limpiarFiltrosTitularFactura]);

  const handleAplicarColumnas = useCallback(
    (nuevosIds: number[]) => {
      setIdsCamposSeleccionados(nuevosIds);
      void ejecutarConsulta(undefined, filtersRef.current, nuevosIds);
    },
    [ejecutarConsulta]
  );

  const ejecutarExportacionExcel = useCallback(async () => {
    if (filters.alertaRangoFechas) return;
    const totalRegistros = data?.kpis.totalRegistros ?? 0;
    if (totalRegistros > MAX_FILAS_EXPORT_EXCEL) {
      setExportError(
        `La consulta contiene ${totalRegistros.toLocaleString('es-ES')} registros y supera el límite actual de ${MAX_FILAS_EXPORT_EXCEL.toLocaleString('es-ES')} filas por exportación. Reduzca el rango de fechas o añada filtros.`
      );
      setExportConfirmationRequired(false);
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportConfirmationRequired(false);
    try {
      const payload = buildPayload();
      await exportarLocalizacionExcel(payload);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar a Excel.');
    } finally {
      setIsExporting(false);
    }
  }, [data?.kpis.totalRegistros, filters.alertaRangoFechas, buildPayload]);

  const handleExportarExcel = useCallback(() => {
    if (filters.alertaRangoFechas || isLoading || isExporting || !data) return;
    const totalRegistros = data.kpis.totalRegistros;
    if (totalRegistros > MAX_FILAS_EXPORT_EXCEL) {
      setExportError(
        `La consulta contiene ${totalRegistros.toLocaleString('es-ES')} registros y supera el límite actual de ${MAX_FILAS_EXPORT_EXCEL.toLocaleString('es-ES')} filas por exportación. Reduzca el rango de fechas o añada filtros.`
      );
      setExportConfirmationRequired(false);
      return;
    }
    if (totalRegistros > UMBRAL_AVISO_REGISTROS_ALTOS) {
      setExportConfirmationRequired(true);
      setExportError(null);
      return;
    }
    void ejecutarExportacionExcel();
  }, [data, ejecutarExportacionExcel, filters.alertaRangoFechas, isExporting, isLoading]);

  const cancelarConsulta = useCallback(() => {
    activeQueryControllerRef.current?.abort();
  }, []);

  // Filtrado por texto libre en tabla y ordenación global previa a paginar
  const camposBuscables = useMemo(() => {
    const campos = data?.columnas ?? [];
    return campos.filter((campo) => {
      const nombre = campo.columnaExcel.toUpperCase();
      const tipo = campo.tipoDato.toUpperCase();
      const identificadorTecnico =
        /^(COD|NUM)_/.test(nombre) ||
        /MATRICULA|BASTIDOR|INSPECCION|FASE|RESULTADO/.test(nombre);
      return tipo === 'C' || tipo === 'D' || tipo === 'F' || nombre.includes('FECHA') || identificadorTecnico;
    });
  }, [data?.columnas]);

  const filasConTextoBusqueda = useMemo(() => {
    if (camposBuscables.length === 0) return [];
    return (data?.filas ?? []).map((fila) => ({
      fila,
      textoBusqueda: camposBuscables
        .map((campo) => fila[campo.columnaExcel])
        .filter((val) => val !== null && val !== undefined)
        .map((val) => String(val).toLocaleLowerCase('es-ES'))
        .join('\u0000'),
    }));
  }, [data?.filas, camposBuscables]);

  const filasFiltradasYOrdenadas = useMemo(() => {
    if (filasConTextoBusqueda.length === 0) return [];

    const termino = busqueda.trim().toLocaleLowerCase('es-ES');
    const filtradas = termino
      ? filasConTextoBusqueda
          .filter(({ textoBusqueda }) => textoBusqueda.includes(termino))
          .map(({ fila }) => fila)
      : filasConTextoBusqueda.map(({ fila }) => fila);

    if (!sortField) return filtradas;

    return [...filtradas].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }

      const sa = String(va);
      const sb = String(vb);
      // Soporte para fechas en formato DD/MM/YYYY o DD/MM/YYYY HH:mm:ss
      const parseSpanishDate = (s: string): number | null => {
        const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s.trim());
        if (!m) return null;
        return new Date(
          Number(m[3]),
          Number(m[2]) - 1,
          Number(m[1]),
          Number(m[4] || 0),
          Number(m[5] || 0),
          Number(m[6] || 0)
        ).getTime();
      };

      const dateA = parseSpanishDate(sa);
      const dateB = parseSpanishDate(sb);
      if (dateA !== null && dateB !== null) {
        return sortAsc ? dateA - dateB : dateB - dateA;
      }

      const numA = Number(sa.replace(',', '.'));
      const numB = Number(sb.replace(',', '.'));
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && sa.trim() !== '' && sb.trim() !== '') {
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc ? sa.localeCompare(sb, 'es', { numeric: true }) : sb.localeCompare(sa, 'es', { numeric: true });
    });
  }, [filasConTextoBusqueda, busqueda, sortField, sortAsc]);

  const totalFilas = filasFiltradasYOrdenadas.length;
  const totalPages = Math.max(1, Math.ceil(totalFilas / pageSize));

  const filasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filasFiltradasYOrdenadas.slice(start, start + pageSize);
  }, [filasFiltradasYOrdenadas, page, pageSize]);

  const handleSort = useCallback(
    (colKey: string) => {
      if (sortField === colKey) {
        setSortAsc((prev) => !prev);
      } else {
        setSortField(colKey);
        setSortAsc(true);
      }
      setPage(1);
    },
    [sortField]
  );

  const activeVehiculoFiltersCount = useMemo(() => {
    let count = 0;
    if (marca.trim()) count++;
    if (tipoMotor) count++;
    if (categoria) count++;
    if (construccion) count++;
    if (utilizacion) count++;
    if (fechaVencInicio || fechaVencFin) count++;
    if (matricula.trim()) count++;
    if (homologacion.trim()) count++;
    if (bastidor.trim()) count++;
    if (seccionManual) count++;
    if (bloque) count++;
    if (defecto) count++;
    if (subdefectoKey) count++;
    if (tiposVehiculoMiner.length > 0) count++;
    return count;
  }, [
    marca,
    tipoMotor,
    categoria,
    construccion,
    utilizacion,
    fechaVencInicio,
    fechaVencFin,
    matricula,
    homologacion,
    bastidor,
    seccionManual,
    bloque,
    defecto,
    subdefectoKey,
    tiposVehiculoMiner,
  ]);

  const activeTitularFacturaFiltersCount = useMemo(() => {
    let count = 0;
    if (cifTitular.trim()) count++;
    if (apellidosTitular.trim()) count++;
    if (cpTitular.trim()) count++;
    if (provinciaTitular) count++;
    if (emailTitular.trim()) count++;
    if (telefonoTitular.trim() || telefonoTitular2.trim()) count++;
    if (cifFactura.trim()) count++;
    if (razonSocialFactura.trim()) count++;
    if (cpFactura.trim()) count++;
    if (provinciaFactura) count++;
    if (emailFactura.trim()) count++;
    if (telefonoFactura.trim()) count++;
    return count;
  }, [
    cifTitular,
    apellidosTitular,
    cpTitular,
    provinciaTitular,
    emailTitular,
    telefonoTitular,
    telefonoTitular2,
    cifFactura,
    razonSocialFactura,
    cpFactura,
    provinciaFactura,
    emailFactura,
    telefonoFactura,
  ]);

  const activeAdvancedFiltersCount = activeVehiculoFiltersCount + activeTitularFacturaFiltersCount;

  return {
    filters,
    catalogos,
    idsCamposSeleccionados,
    handleAplicarColumnas,
    bloquesDinamicos,
    elementosDinamicos,
    subdefectosDinamicos,
    // Filtros comunes
    marca,
    setMarca,
    tipoMotor,
    setTipoMotor,
    categoria,
    setCategoria,
    categoriaDistinto,
    setCategoriaDistinto,
    construccion,
    setConstruccion,
    utilizacion,
    setUtilizacion,
    cifTitular,
    setCifTitular,
    // Filtros Inspecciones
    fechaVencInicio,
    setFechaVencInicio,
    fechaVencFin,
    setFechaVencFin,
    excluirInspeccionadosPost,
    setExcluirInspeccionadosPost,
    matricula,
    setMatricula,
    homologacion,
    setHomologacion,
    homologacionDistinto,
    setHomologacionDistinto,
    bastidor,
    setBastidor,
    apellidosTitular,
    setApellidosTitular,
    cpTitular,
    setCpTitular,
    provinciaTitular,
    setProvinciaTitular,
    emailTitular,
    setEmailTitular,
    telefonoTitular,
    setTelefonoTitular,
    telefonoTitular2,
    setTelefonoTitular2,
    cifFactura,
    setCifFactura,
    razonSocialFactura,
    setRazonSocialFactura,
    cpFactura,
    setCpFactura,
    provinciaFactura,
    setProvinciaFactura,
    emailFactura,
    setEmailFactura,
    telefonoFactura,
    setTelefonoFactura,
    // Filtros Defectos / Elementos / Mediciones
    seccionManual,
    setSeccionManual,
    bloque,
    setBloque,
    defecto,
    setDefecto,
    subdefectoKey,
    setSubdefectoKey,
    tiposVehiculoMiner,
    setTiposVehiculoMiner,
    activeVehiculoFiltersCount,
    activeTitularFacturaFiltersCount,
    activeAdvancedFiltersCount,
    limpiarFiltrosVehiculo,
    limpiarFiltrosTitularFactura,
    limpiarFiltrosAvanzados,
    // Estado y resultados
    data,
    isLoading,
    isCatalogLoading,
    error,
    isExporting,
    exportError,
    exportConfirmationRequired,
    highVolumeWarningThreshold: UMBRAL_AVISO_REGISTROS_ALTOS,
    maxExportRows: MAX_FILAS_EXPORT_EXCEL,
    // Tabla
    busqueda,
    setBusqueda,
    camposBuscables,
    sortField,
    sortAsc,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFilas,
    filasPaginadas,
    selectedRow,
    setSelectedRow,
    handleConsultar: () => ejecutarConsulta(),
    handleExportarExcel,
    confirmarExportacionExcel: () => void ejecutarExportacionExcel(),
    cancelarConfirmacionExportacion: () => setExportConfirmationRequired(false),
    cancelarConsulta,
  };
}
