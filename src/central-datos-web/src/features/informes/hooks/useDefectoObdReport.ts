import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import type {
  InformeDefectoObdResponse,
  FilaDefectoObd,
  SortableDefectoObdColumn,
} from '../types/informes.types';
import { defectoObdApi } from '../api/defectoObdApi';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { useAuth } from '../../auth/context/AuthContext';

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useDefectoObdReport() {
  const { user } = useAuth();
  const now = new Date();
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

  // Estaciones autorizadas para el usuario en sesión
  const estacionesPermitidas = useMemo(() => {
    if (!user || user.isSupervisor || !user.allowedStations || user.allowedStations.length === 0) {
      return ESTACIONES_OFICIALES.map((e) => e.codigo);
    }
    return user.allowedStations;
  }, [user]);

  // 1. Estados de Filtros
  const [fechaInicio, setFechaInicio] = useState<string>(toDateInputValue(primerDiaMes));
  const [fechaFin, setFechaFin] = useState<string>(toDateInputValue(now));
  const [sociedad, setSociedad] = useState<FiltroSociedad>('TODAS');
  const [estacionesSeleccionadas, setEstacionesSeleccionadas] = useState<string[]>(estacionesPermitidas);
  const [fase, setFase] = useState<'TODAS' | '1' | '2'>('TODAS');

  useEffect(() => {
    setEstacionesSeleccionadas(estacionesPermitidas);
  }, [estacionesPermitidas]);

  // 2. Estados de Carga y Datos
  const [data, setData] = useState<InformeDefectoObdResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [alertaRangoFechas, setAlertaRangoFechas] = useState<string | null>(null);

  // 3. Estados de Exportación Excel
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 4. Estados de Búsqueda y Ordenación en Tabla
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortableDefectoObdColumn>('fechaInspeccion');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 5. Modo de visualización de Gráficos (Ranking por Estación / Tipología OBD / Combustible)
  const [chartMode, setChartMode] = useState<'estaciones' | 'tipologia' | 'combustible'>('estaciones');

  // 6. Detalle de inspección seleccionada
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaDefectoObd | null>(null);

  // Validación de Rango de Fechas (Máximo 1 año = 366 días)
  const validarRango = useCallback((inicio: string, fin: string): string | null => {
    if (!inicio || !fin) {
      return 'Debe indicar tanto la fecha de inicio como la fecha final.';
    }
    const partsIni = inicio.split('-').map(Number);
    const partsFin = fin.split('-').map(Number);
    if (partsIni.length < 3 || partsFin.length < 3) {
      return 'Formato de fecha inválido.';
    }
    const dIni = new Date(partsIni[0], partsIni[1] - 1, partsIni[2]);
    const dFin = new Date(partsFin[0], partsFin[1] - 1, partsFin[2]);
    if (dFin < dIni) {
      return 'La fecha final no puede ser anterior a la fecha de inicio.';
    }
    const diffTime = dFin.getTime() - dIni.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
      return `El rango seleccionado (${diffDays} días) supera el límite máximo permitido de 1 año (365 días) para optimizar el rendimiento de la consulta.`;
    }
    return null;
  }, []);

  const handleFechaInicioChange = (val: string) => {
    setFechaInicio(val);
    const err = validarRango(val, fechaFin);
    setAlertaRangoFechas(err);
    if (err) {
      setData(null);
    }
  };

  const handleFechaFinChange = (val: string) => {
    setFechaFin(val);
    const err = validarRango(fechaInicio, val);
    setAlertaRangoFechas(err);
    if (err) {
      setData(null);
    }
  };

  const ajustarAUnAno = () => {
    if (!fechaInicio) return;
    const parts = fechaInicio.split('-').map(Number);
    if (parts.length < 3) return;
    const dIni = new Date(parts[0], parts[1] - 1, parts[2]);
    const dFin = new Date(dIni);
    dFin.setFullYear(dFin.getFullYear() + 1);
    dFin.setDate(dFin.getDate() - 1);
    setFechaFin(toDateInputValue(dFin));
    setAlertaRangoFechas(null);
  };

  // 7. Petición al Backend
  const fetchReport = useCallback(
    async (signal?: AbortSignal) => {
      const errValidacion = validarRango(fechaInicio, fechaFin);
      if (errValidacion) {
        setAlertaRangoFechas(errValidacion);
        setData(null);
        return;
      }
      setAlertaRangoFechas(null);
      setIsLoading(true);
      setError(null);

      try {
        const res = await defectoObdApi.consultarDefectosObd(
          {
            fechaInicio,
            fechaFin,
            sociedad,
            codEstaciones:
              estacionesSeleccionadas.length === estacionesPermitidas.length
                ? undefined
                : estacionesSeleccionadas,
            fase,
          },
          signal
        );
        setData(res);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error desconocido al consultar defectos OBD');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [fechaInicio, fechaFin, sociedad, estacionesSeleccionadas, estacionesPermitidas.length, fase, validarRango]
  );

  const isInitialMount = useRef(true);

  // Carga inicial y reactiva ante cambios en Sociedad, Fase o Estaciones seleccionadas.
  // Con debounce de 250ms para evitar colisiones de conexiones si el usuario pincha rápido varios filtros.
  // NO se ejecuta al cambiar fechas (estas esperan a pulsar Enter o el botón "Consultar").
  useEffect(() => {
    if (estacionesSeleccionadas.length === 0) {
      setData({
        filas: [],
        totalDefectosGlobal: 0,
        totalDefectosGlobalFormatted: '0',
        totalGasolinaGlobal: 0,
        totalDieselGlobal: 0,
        totalFase1Global: 0,
        totalFase2Global: 0,
        totalEstacionesAfectadas: 0,
        kpis: [
          { id: 'total-defectos', titulo: 'Total Defectos OBD', valor: '0', subtitulo: '0 estaciones seleccionadas', variant: 'neutral', icon: '🔌' },
          { id: 'defectos-graves', titulo: 'Defectos Graves (DG)', valor: '0', subtitulo: '0,00 % de severidad', variant: 'neutral', icon: '🚨' },
          { id: 'defectos-leves', titulo: 'Defectos Leves (DL)', valor: '0', subtitulo: '0,00 % de anomalías', variant: 'neutral', icon: '⚠️' },
          { id: 'estaciones-afectadas', titulo: 'Estaciones con Defectos', valor: '0', subtitulo: '0 centros analizados', variant: 'neutral', icon: '🏢' },
        ],
        graficoEstaciones: [],
        graficoTipologia: [],
        graficoCombustible: [],
      });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchReport(controller.signal);
      return () => controller.abort();
    }

    const timer = setTimeout(() => {
      fetchReport(controller.signal);
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sociedad, fase, estacionesSeleccionadas]);

  // Exportar Excel / CSV
  const exportarExcel = async () => {
    const errValidacion = validarRango(fechaInicio, fechaFin);
    if (errValidacion) {
      setAlertaRangoFechas(errValidacion);
      setData(null);
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      await defectoObdApi.descargarExcelDefectosObd({
        fechaInicio,
        fechaFin,
        sociedad,
        codEstaciones:
          estacionesSeleccionadas.length === estacionesPermitidas.length
            ? undefined
            : estacionesSeleccionadas,
        fase,
      });
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Error al exportar el fichero');
    } finally {
      setIsExporting(false);
    }
  };

  // 8. Filtrado y Ordenación en Cliente de la Tabla Detallada
  const filasFiltradasYOrdenadas = useMemo(() => {
    if (!data || !data.filas) return [];
    let list = [...data.filas];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.matricula.toLowerCase().includes(q) ||
          f.desEstacion.toLowerCase().includes(q) ||
          f.codEstacion.includes(q) ||
          f.marca.toLowerCase().includes(q) ||
          f.modelo.toLowerCase().includes(q) ||
          f.codigoDefectoCompleto.toLowerCase().includes(q) ||
          f.descripcionDefecto.toLowerCase().includes(q) ||
          f.tipoCombustible.toLowerCase().includes(q) ||
          f.desNivelEmisiones.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortColumn) {
        case 'fechaInspeccion':
          valA = new Date(a.fechaInspeccion).getTime();
          valB = new Date(b.fechaInspeccion).getTime();
          break;
        case 'matricula':
          valA = a.matricula;
          valB = b.matricula;
          break;
        case 'desEstacion':
          valA = a.desEstacion;
          valB = b.desEstacion;
          break;
        case 'marca':
          valA = `${a.marca} ${a.modelo}`;
          valB = `${b.marca} ${b.modelo}`;
          break;
        case 'tipoCombustible':
          valA = a.tipoCombustible;
          valB = b.tipoCombustible;
          break;
        case 'codigoDefectoCompleto':
          valA = a.codigoDefectoCompleto;
          valB = b.codigoDefectoCompleto;
          break;
        case 'gravedadDefecto':
          valA = a.gravedadDefecto;
          valB = b.gravedadDefecto;
          break;
        case 'fase':
          valA = a.fase;
          valB = b.fase;
          break;
        case 'textoResultado':
          valA = a.textoResultado;
          valB = b.textoResultado;
          break;
        default:
          valA = new Date(a.fechaInspeccion).getTime();
          valB = new Date(b.fechaInspeccion).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Manejo de ordenación por columna
  const handleSort = (column: SortableDefectoObdColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Imprimir ventana aislada (sin perder referencia a la página actual)
  const imprimirInforme = () => {
    if (!data) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) return;

    const fechaGen = new Date().toLocaleString('es-ES');
    const filasHtml = filasFiltradasYOrdenadas
      .map(
        (f) => `<tr>
          <td>${f.fechaInspeccionFormatted}</td>
          <td><strong>${f.matricula}</strong></td>
          <td>${f.desEstacion} (${f.codEstacion})</td>
          <td>${f.marca} ${f.modelo}</td>
          <td>${f.tipoCombustible}</td>
          <td><code>${f.codigoDefectoCompleto}</code></td>
          <td>${f.descripcionDefecto}</td>
          <td><span style="color:${f.gravedadDefecto.includes('Grave') ? '#c81e1e' : '#0284c7'};font-weight:bold;">${f.gravedadDefecto}</span></td>
          <td>${f.fase}</td>
          <td>${f.textoResultado}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TÜV SÜD — Informe Inspecciones con Defecto OBD</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #002b49; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #002b49; }
          .subtitle { font-size: 13px; color: #64748b; }
          .kpis { display: flex; gap: 16px; margin-bottom: 20px; }
          .kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; flex: 1; background: #f8fafc; }
          .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .kpi-value { font-size: 20px; font-weight: bold; color: #002b49; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #002b49; color: #ffffff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background-color: #f8fafc; }
          code { font-family: monospace; font-size: 12px; font-weight: bold; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">TÜV SÜD — Informe Inspecciones con Defecto OBD</div>
            <div class="subtitle">Periodo: ${fechaInicio} al ${fechaFin} | Generado: ${fechaGen} | Registros: ${filasFiltradasYOrdenadas.length}</div>
          </div>
          <button class="no-print" onclick="window.print()" style="background:#002b49;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;">Imprimir</button>
        </div>
        <div class="kpis">
          <div class="kpi-card">
            <div class="kpi-title">Total Defectos OBD</div>
            <div class="kpi-value">${data.totalDefectosGlobalFormatted}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Motores Diésel</div>
            <div class="kpi-value">${data.totalDieselGlobal}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Motores Gasolina</div>
            <div class="kpi-value">${data.totalGasolinaGlobal}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Estaciones Afectadas</div>
            <div class="kpi-value">${data.totalEstacionesAfectadas}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Matrícula</th>
              <th>Estación</th>
              <th>Vehículo</th>
              <th>Motor</th>
              <th>Código</th>
              <th>Descripción Defecto</th>
              <th>Gravedad</th>
              <th>Fase</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return {
    // Filtros
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    fase,
    setSociedad,
    setEstacionesSeleccionadas,
    setFase,
    handleFechaInicioChange,
    handleFechaFinChange,
    ajustarAUnAno,

    // Carga y Datos
    data,
    isLoading,
    error,
    alertaRangoFechas,
    fetchReport,

    // Exportación
    isExporting,
    exportError,
    exportarExcel,

    // Tabla
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    filasFiltradasYOrdenadas,
    filaSeleccionada,
    setFilaSeleccionada,

    // Modo Gráfico
    chartMode,
    setChartMode,

    // Utilidades
    imprimirInforme,
  };
}

