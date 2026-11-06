import React, { startTransition, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { TsAlert, TsButton, TsCard, TsBadge, TsIcon } from '@tuvsud/design-system/react';
import { ReportPageHeader } from '../../informes/components/ReportPageHeader';
import { ReportDateRangeAlert } from '../../informes/components/ReportDateRangeAlert';
import { ReportFiltersBar } from '../../informes/components/ReportFiltersBar';
import { ReportBarChart } from '../../informes/components/ReportBarChart';
import { ReportDonutChart } from '../../informes/components/ReportDonutChart';
import { ReportPaginationBar } from '../../informes/components/ReportPaginationBar';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { SortIndicator } from '../../../components/common/SortIndicator';
import { LocalizacionColumnSelectorModal } from '../components/LocalizacionColumnSelectorModal';
import { useLocalizacionReport } from '../hooks/useLocalizacionReport';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { SOCIEDADES } from '../../../constants/companies.constants';
import type { ColumnaResultadoLocalizacion, TipoLocalizacion } from '../types/localizacion.types';
import type { ReportBarChartPoint } from '../../informes/types/informes.types';

export interface LocalizacionReportPageProps {
  tipo: TipoLocalizacion;
  onNavigateHome?: () => void;
  onNavigateToInspecciones?: () => void;
}

const CONFIG_MODULO: Record<
  TipoLocalizacion,
  {
    titulo: string;
    subtitulo: string;
    breadcrumb: string;
    icono: string;
    hojaExcel: string;
  }
> = {
  inspecciones: {
    titulo: 'Localización de Inspecciones',
    subtitulo:
      'Explorador dinámico multi-estación de inspecciones con criterios técnicos, titular, facturación, vencimientos y selección de columnas.',
    breadcrumb: 'Localización inspecciones',
    icono: 'directions_car',
    hojaExcel: 'INSPECCIONES_LOCALIZADAS',
  },
  defectos: {
    titulo: 'Localización de Defectos',
    subtitulo:
      'Búsqueda y auditoría detallada de defectos detectados por sección del manual, bloque, elemento, subdefecto y vehículo.',
    breadcrumb: 'Localización defectos',
    icono: 'warning',
    hojaExcel: 'DEFECTOS_LOCALIZADOS',
  },
  elementos: {
    titulo: 'Localización de Elementos',
    subtitulo:
      'Consulta técnica de elementos verificados en línea de inspección por bloque reglamentario, elemento y tipología de vehículo.',
    breadcrumb: 'Localización elementos',
    icono: 'build',
    hojaExcel: 'ELEMENTOS_LOCALIZADOS',
  },
  mediciones: {
    titulo: 'Localización de Mediciones',
    subtitulo:
      'Explotación técnica de valores de medición en línea (frenómetro, emisiones, alineación, OBD y pesos) con clasificación MINER.',
    breadcrumb: 'Localización mediciones',
    icono: 'analytics',
    hojaExcel: 'MEDICIONES_LOCALIZADAS',
  },
};

function getColumnPixelWidth(col: ColumnaResultadoLocalizacion): number {
  const name = col.columnaExcel.toUpperCase();
  if (name === 'COD_ESTACION' || name === 'FASE' || name === 'CLASIF' || name === 'CATEGORIA') return 110;
  if (name === 'MATRICULA' || name === 'TIPO_MOTOR' || name === 'TIPO_INSP' || name === 'RESULTADO') return 130;
  if (name.includes('FECHA')) return 155;
  if (name.includes('BASTIDOR') || name === 'COD_INSPECCION') return 170;
  if (name.includes('LISTA_DEFECTOS') || name.includes('DESCRIPCION') || name.includes('DOMICILIO') || name.includes('RAZON_SOCIAL')) return 245;
  if (name.includes('EMAIL') || name.includes('APELLIDOS') || name.includes('CLIENTE')) return 200;
  return 150;
}

/**
 * Formatea una línea de filtro reemplazando códigos de estación por "XXXX - NOMBRE ESTACIÓN"
 */
function formatFiltroEstacionesConNombre(filtro: string): string {
  if (!filtro.toUpperCase().startsWith('ESTACIONES:')) return filtro;
  const rawCodes = filtro.slice('ESTACIONES:'.length).trim();
  if (!rawCodes || rawCodes.toLowerCase() === 'todos' || rawCodes.toLowerCase() === 'todas') {
    return `ESTACIONES: Todas las estaciones (${ESTACIONES_OFICIALES.length})`;
  }
  const codes = rawCodes
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const formattedList = codes.map((c) => {
    const padded = c.padStart(4, '0');
    const found = ESTACIONES_OFICIALES.find((e) => e.codigo === padded || e.codigo === c);
    if (!found) return padded;
    const cleanName = found.descripcion.replace(/^I\.T\.V\.\s*-\s*/i, '').trim();
    return `${padded} - ${cleanName}`;
  });

  return `ESTACIONES (${codes.length}): ${formattedList.join(', ')}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.82rem',
  color: '#0b253b',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '4px',
};

interface LocalizacionGridSearchProps {
  value: string;
  searchableFields: string[];
  onSearchChange: (value: string) => void;
}

const LocalizacionGridSearch: React.FC<LocalizacionGridSearchProps> = ({
  value,
  searchableFields,
  onSearchChange,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onSearchChange(draft), 180);
    return () => window.clearTimeout(timer);
  }, [draft, value, onSearchChange]);

  const clearSearch = () => {
    setDraft('');
    onSearchChange('');
  };

  return (
    <div style={{ width: '100%', maxWidth: '520px' }}>
      <AppTooltip
        title={value ? 'Filtro visual activo en la tabla' : 'Filtro rápido sobre los resultados cargados'}
        subtitle="La búsqueda se aplica solo a las filas cargadas en el grid."
        content={
          searchableFields.length > 0
            ? `Campos incluidos: ${searchableFields.join(', ')}`
            : 'No hay columnas de texto, fecha o identificación seleccionadas para buscar.'
        }
        position="top"
        style={{ display: 'block', width: '100%' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0 10px',
            height: '36px',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ color: '#64748b', marginRight: '8px', display: 'flex', alignItems: 'center' }}>
            <TsIcon name="search" style={{ fontSize: '16px' }} />
          </span>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              searchableFields.length > 0
                ? `Buscar en ${searchableFields.slice(0, 3).join(', ')}${searchableFields.length > 3 ? '…' : ''}`
                : 'No hay campos buscables seleccionados'
            }
            aria-label="Buscar en campos de texto, fecha e identificación del grid"
            disabled={searchableFields.length === 0}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.82rem',
              color: '#0f172a',
              backgroundColor: 'transparent',
              fontWeight: 500,
            }}
          />
          {draft && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Limpiar búsqueda"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TsIcon name="close" style={{ fontSize: '14px' }} />
            </button>
          )}
        </div>
      </AppTooltip>
    </div>
  );
};

export const LocalizacionReportPage: React.FC<LocalizacionReportPageProps> = ({
  tipo,
  onNavigateHome,
  onNavigateToInspecciones,
}) => {
  const cfg = CONFIG_MODULO[tipo];
  const r = useLocalizacionReport(tipo);

  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [activeCriteriaTab, setActiveCriteriaTab] = useState<'vehiculo' | 'titular'>('vehiculo');
  const [showChartSection, setShowChartSection] = useState(false);
  const [chartMode, setChartMode] = useState<'barras' | 'donut'>('barras');
  const [highVolumeNoticeDismissed, setHighVolumeNoticeDismissed] = useState(false);

  const gridTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighVolumeNoticeDismissed(false);
  }, [r.data]);

  const hayDatos = Boolean(r.data && r.data.filas.length > 0 && !r.filters.alertaRangoFechas);
  const exportacionSuperaLimite = (r.data?.kpis.totalRegistros ?? 0) > r.maxExportRows;
  const columnasTabla = r.data?.columnas ?? [];
  const handleGridSearchChange = useCallback(
    (value: string) => {
      startTransition(() => {
        r.setBusqueda(value);
        r.setPage(1);
      });
    },
    [r.setBusqueda, r.setPage]
  );
  const searchableFieldNames = useMemo(
    () => r.camposBuscables.map((campo) => campo.desCampo.toLocaleLowerCase('es-ES')),
    [r.camposBuscables]
  );
  const resumenGrid = (
    <>
      Mostrando <strong>{r.filasPaginadas.length.toLocaleString('es-ES')}</strong> de{' '}
      <strong>{r.totalFilas.toLocaleString('es-ES')}</strong> cargados de{' '}
      <strong>{(r.data?.kpis.totalRegistros ?? 0).toLocaleString('es-ES')}</strong> encontrados
      {' '}({columnasTabla.length} columnas)
    </>
  );

  const totalTableMinWidth = useMemo(() => {
    const sumCols = columnasTabla.reduce((acc, c) => acc + getColumnPixelWidth(c), 0);
    return sumCols + 86;
  }, [columnasTabla]);

  // Enriquecer puntos de gráficos con nombres oficiales de estación y colores corporativos ATISAE (#0046ad) y CAL (#00875a)
  const puntosGraficoEstaciones: ReportBarChartPoint[] = useMemo(() => {
    if (!r.data?.graficoPorEstacion) return [];
    return r.data.graficoPorEstacion.map((g) => {
      const codPad = g.clave.trim().padStart(4, '0');
      const estOficial = ESTACIONES_OFICIALES.find((e) => e.codigo === codPad || e.codigo === g.clave.trim());
      const sociedad: 'TSA' | 'CAL' = estOficial?.sociedad === 'CAL' || codPad.startsWith('09') ? 'CAL' : 'TSA';
      const nombreLimpio = estOficial
        ? estOficial.descripcion.replace(/^I\.T\.V\.\s*-\s*/i, '').trim()
        : `ITV ${codPad}`;
      const labelCompleto = `${codPad} - ${nombreLimpio}`;
      const colorCorp = sociedad === 'CAL' ? SOCIEDADES.CAL.colorBorde : SOCIEDADES.ATISAE.colorBorde;

      return {
        id: codPad,
        label: labelCompleto,
        valor: g.valor,
        valorFormateado: g.valorFormateado,
        sociedad,
        color: colorCorp,
        tooltipSubtitle: `${sociedad === 'CAL' ? 'TÜV SÜD CAL' : 'TÜV SÜD ATISAE'} · ${g.valor.toLocaleString('es-ES')} registros localizados`,
      };
    });
  }, [r.data?.graficoPorEstacion]);

  // Enriquecer texto de estación líder para el KPI
  const estacionLiderFormateada = useMemo(() => {
    const rawLider = r.data?.kpis.estacionLider ?? '';
    if (!rawLider || rawLider === 'Sin datos') return 'Sin datos';
    const matchCod = /(\d{2,4})/.exec(rawLider);
    if (!matchCod) return rawLider;
    const codPad = matchCod[1].padStart(4, '0');
    const est = ESTACIONES_OFICIALES.find((e) => e.codigo === codPad);
    if (!est) return `ITV ${codPad}`;
    const clean = est.descripcion.replace(/^I\.T\.V\.\s*-\s*/i, '').trim();
    return `${codPad} - ${clean}`;
  }, [r.data?.kpis.estacionLider]);

  const filtrosAplicadosFormateados = useMemo(
    () => (r.data?.filtrosAplicados ?? []).map(formatFiltroEstacionesConNombre),
    [r.data?.filtrosAplicados]
  );

  // Detalle estructurado para el pie: las estaciones se separan en una lista (una por línea)
  const filtrosPieDetalle = useMemo(() => {
    return (r.data?.filtrosAplicados ?? []).map((raw) => {
      const formateado = formatFiltroEstacionesConNombre(raw);
      const m = /^(ESTACIONES \(\d+\)):\s*(.+)$/.exec(formateado);
      if (!m) return { texto: formateado, estaciones: undefined as string[] | undefined };
      return { texto: m[1], estaciones: m[2].split(', ').filter(Boolean) };
    });
  }, [r.data?.filtrosAplicados]);

  const toggleMinerCode = (cod: string) => {
    r.setTiposVehiculoMiner((prev) =>
      prev.includes(cod) ? prev.filter((x) => x !== cod) : [...prev, cod]
    );
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!r.filters.alertaRangoFechas) {
        r.handleConsultar();
      }
    }
  };

  // Cambio de página desde la paginación inferior haciendo scroll suave a la cabecera del grid
  const handleBottomPageChange = useCallback(
    (newPage: number) => {
      r.setPage(newPage);
      setTimeout(() => {
        gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    },
    [r]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', width: '100%', minWidth: 0, maxWidth: '100%' }}>
      {/* 1. Cabecera corporativa */}
      <ReportPageHeader
        title={cfg.titulo}
        subtitle={cfg.subtitulo}
        breadcrumbItemText={cfg.breadcrumb}
        parentBreadcrumbText="Inspecciones"
        backButtonText="← Volver a Inspecciones"
        icon={cfg.icono}
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInspecciones}
      />

      <ReportDateRangeAlert
        mensaje={r.filters.alertaRangoFechas}
        onAjustarAUnAno={r.filters.ajustarAUnAno}
      />

      {r.error && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TsIcon name="warning" size={18} style={{ color: '#b91c1c' }} />
          <span>{r.error}</span>
        </div>
      )}

      {r.exportError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TsIcon name="warning" size={18} style={{ color: '#d97706' }} />
          <span>{r.exportError}</span>
        </div>
      )}

      {r.data &&
        !r.isLoading &&
        !r.exportConfirmationRequired &&
        !highVolumeNoticeDismissed &&
        r.data.kpis.totalRegistros > r.highVolumeWarningThreshold && (
          <TsAlert
            variant="warning"
            open
            closable
            onTsAfterHide={() => setHighVolumeNoticeDismissed(true)}
            heading="Consulta con un volumen elevado"
          >
            <span>
              Se encontraron <strong>{r.data.kpis.totalRegistros.toLocaleString('es-ES')}</strong> registros. La tabla
              muestra los primeros <strong>{r.data.kpis.mostrandoRegistrosGrid.toLocaleString('es-ES')}</strong>. Puede
              {exportacionSuperaLimite
                ? ` acotar los filtros: se ha deshabilitado la exportación porque supera el límite de ${r.maxExportRows.toLocaleString('es-ES')} registros.`
                : ' acotar los filtros para reducir el tiempo de consulta y exportación.'}{' '}
              Este aviso desaparece al cerrarlo o realizar otra consulta.
            </span>
          </TsAlert>
        )}

      {r.exportConfirmationRequired && r.data && (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ts-semantic-size-space-300, 0.5rem)',
            padding: 'var(--ts-semantic-size-space-400, 0.75rem)',
            border: '1px solid var(--ts-semantic-color-border-warning, #d97706)',
            borderRadius: 'var(--ts-semantic-size-radius-200, 0.375rem)',
            backgroundColor: 'var(--ts-semantic-color-surface-warning-subtle, #fffbeb)',
            color: 'var(--ts-semantic-color-text-default, #0b253b)',
            boxSizing: 'border-box',
          }}
        >
          <strong>Confirmar exportación de gran volumen</strong>
          <span>
            Se van a exportar {r.data.kpis.totalRegistros.toLocaleString('es-ES')} registros. La generación puede
            tardar. El aviso desaparecerá al cancelar o continuar.
          </span>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <TsButton type="button" variant="secondary" size="small" onClick={r.cancelarConfirmacionExportacion}>
              Cancelar
            </TsButton>
            <TsButton type="button" variant="primary" size="small" onClick={r.confirmarExportacionExcel}>
              Continuar exportación
            </TsButton>
          </div>
        </div>
      )}

      {/* Acciones de la consulta fuera del contenedor de filtros */}
      <div
        className="cd-localizacion-actions"
        style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', marginBottom: '-0.85rem' }}
      >
        <AppTooltip
          title="Seleccionar campos visibles y de exportación"
          subtitle={`${r.idsCamposSeleccionados.length} de ${r.catalogos?.columnas.length ?? 0} columnas activas`}
          content="Permite elegir qué columnas se muestran en el listado y se incluyen en el archivo Excel."
          position="bottom"
        >
          <span>
            <TsButton
              type="button"
              variant="secondary"
              size="medium"
              onClick={() => setIsColumnModalOpen(true)}
              disabled={!r.catalogos || r.isCatalogLoading}
            >
              <TsIcon slot="prefix" name="table_chart" />
              Seleccionar campos ({r.idsCamposSeleccionados.length}/{r.catalogos?.columnas.length ?? 0})
            </TsButton>
          </span>
        </AppTooltip>
        <AppTooltip
          title={`Exportar libro oficial (${cfg.hojaExcel}.xlsx)`}
          subtitle="Exportación íntegra según los filtros globales"
          content={
            exportacionSuperaLimite
              ? `No se puede exportar: el resultado supera el límite actual de ${r.maxExportRows.toLocaleString('es-ES')} registros. Acote los filtros y vuelva a consultar.`
              : hayDatos
                ? 'Genera el Excel con los registros de la consulta y los filtros aplicados. Para más de 50.000 registros se solicitará confirmación.'
                : 'Realice una consulta con datos para habilitar la exportación a Excel.'
          }
          position="bottom"
        >
          <span>
            <TsButton
              type="button"
              variant="primary"
              size="medium"
              onClick={r.handleExportarExcel}
              disabled={!hayDatos || exportacionSuperaLimite || r.isExporting || r.isLoading}
            >
              <TsIcon slot="prefix" name={r.isExporting ? 'hourglass_empty' : 'download'} />
              {r.isExporting ? 'Exportando...' : 'Exportar a Excel'}
            </TsButton>
          </span>
        </AppTooltip>
        {exportacionSuperaLimite && (
          <AppTooltip
            title="Exportación no disponible"
            content={`No se puede exportar: el resultado supera el límite actual de ${r.maxExportRows.toLocaleString('es-ES')} registros. Acote los filtros y vuelva a consultar.`}
            position="bottom"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', cursor: 'help' }}>
              <TsIcon name="info" aria-label="Información sobre el límite de exportación" />
            </span>
          </AppTooltip>
        )}
      </div>

      {/* 3. Barra Principal de Fechas, Sociedad, Estaciones, Fase y Único Botón "Consultar" */}
      <ReportFiltersBar
        fechaInicio={r.filters.fechaInicio}
        fechaFin={r.filters.fechaFin}
        onFechaInicioChange={r.filters.handleFechaInicioChange}
        onFechaFinChange={r.filters.handleFechaFinChange}
        sociedad={r.filters.sociedad}
        onSociedadChange={r.filters.setSociedad}
        estacionesSeleccionadas={r.filters.estacionesSeleccionadas}
        onEstacionesChange={r.filters.setEstacionesSeleccionadas}
        estacionesPermitidas={r.filters.estacionesPermitidas}
        fase={r.filters.fase}
        onFaseChange={r.filters.setFase}
        onConsultar={r.handleConsultar}
        loading={r.isLoading}
      />

      {/* 4. Panel de Criterios Avanzados Dividido en 2 Pestañas/Cajas (1. Datos Vehículo, 2. Titular / Cliente Facturación) */}
      <TsCard
        style={{
          padding: '0.9rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Barra superior de Pestañas de Criterios + Botón Limpiar Filtro */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '0.6rem',
            }}
          >
            {/* Selector de las 2 Cajas / Pestañas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveCriteriaTab('vehiculo')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeCriteriaTab === 'vehiculo' ? '1px solid #0046ad' : '1px solid #cbd5e1',
                  backgroundColor: activeCriteriaTab === 'vehiculo' ? '#0046ad' : '#f8fafc',
                  color: activeCriteriaTab === 'vehiculo' ? '#ffffff' : '#334155',
                  transition: 'all 0.15s ease',
                }}
              >
                <TsIcon name="directions_car" size={16} />
                <span>
                  {tipo === 'inspecciones'
                    ? '1. Datos Vehículo y Vencimiento'
                    : '1. Datos Técnicos y Vehículo'}
                </span>
                {r.activeVehiculoFiltersCount > 0 && (
                  <span
                    style={{
                      padding: '1px 7px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: activeCriteriaTab === 'vehiculo' ? '#ffffff' : '#0046ad',
                      color: activeCriteriaTab === 'vehiculo' ? '#0046ad' : '#ffffff',
                    }}
                  >
                    {r.activeVehiculoFiltersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveCriteriaTab('titular')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeCriteriaTab === 'titular' ? '1px solid #0046ad' : '1px solid #cbd5e1',
                  backgroundColor: activeCriteriaTab === 'titular' ? '#0046ad' : '#f8fafc',
                  color: activeCriteriaTab === 'titular' ? '#ffffff' : '#334155',
                  transition: 'all 0.15s ease',
                }}
              >
                <TsIcon name="person" size={16} />
                <span>2. Titular / Cliente Facturación</span>
                {r.activeTitularFacturaFiltersCount > 0 && (
                  <span
                    style={{
                      padding: '1px 7px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      backgroundColor: activeCriteriaTab === 'titular' ? '#ffffff' : '#0046ad',
                      color: activeCriteriaTab === 'titular' ? '#0046ad' : '#ffffff',
                    }}
                  >
                    {r.activeTitularFacturaFiltersCount}
                  </span>
                )}
              </button>

              <span style={{ fontSize: '0.76rem', color: '#64748b', marginLeft: '4px' }}>
                (Soporta comodín <strong>*</strong> al inicio o final · Pulse <strong>Consultar</strong> o <strong>Enter</strong> para aplicar)
              </span>
            </div>

            {/* Botón Limpiar Filtro específico de la caja activa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeCriteriaTab === 'vehiculo' ? (
                <button
                  type="button"
                  onClick={r.limpiarFiltrosVehiculo}
                  disabled={r.activeVehiculoFiltersCount === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: r.activeVehiculoFiltersCount > 0 ? '#ffffff' : '#f8fafc',
                    color: r.activeVehiculoFiltersCount > 0 ? '#0046ad' : '#94a3b8',
                    cursor: r.activeVehiculoFiltersCount > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  <TsIcon name="close" size={15} />
                  <span>Limpiar filtro vehículo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={r.limpiarFiltrosTitularFactura}
                  disabled={r.activeTitularFacturaFiltersCount === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: r.activeTitularFacturaFiltersCount > 0 ? '#ffffff' : '#f8fafc',
                    color: r.activeTitularFacturaFiltersCount > 0 ? '#0046ad' : '#94a3b8',
                    cursor: r.activeTitularFacturaFiltersCount > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  <TsIcon name="close" size={15} />
                  <span>Limpiar filtro titular/factura</span>
                </button>
              )}
            </div>
          </div>

          {/* CAJA 1: DATOS DE VEHÍCULO, VENCIMIENTO Y CRITERIOS TÉCNICOS */}
          {activeCriteriaTab === 'vehiculo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Fila específica de Defectos / Elementos / Mediciones */}
              {(tipo === 'defectos' || tipo === 'elementos' || tipo === 'mediciones') && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {(tipo === 'defectos' || tipo === 'mediciones') && (
                    <div>
                      <label style={labelStyle}>Sección Manual ITV</label>
                      <select
                        value={r.seccionManual}
                        onChange={(e) => {
                          r.setSeccionManual(e.target.value);
                          r.setBloque('');
                          r.setDefecto('');
                          r.setSubdefectoKey('');
                        }}
                        style={inputStyle}
                      >
                        <option value="">Todas las secciones</option>
                        {(r.catalogos?.seccionesManual ?? []).map((s) => (
                          <option key={s.codigo} value={s.codigo}>
                            Sección {s.codigo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(tipo === 'defectos' || tipo === 'elementos') && (
                    <>
                      <div>
                        <label style={labelStyle}>Bloque del Manual</label>
                        <select
                          value={r.bloque}
                          onChange={(e) => {
                            r.setBloque(e.target.value);
                            r.setDefecto('');
                            r.setSubdefectoKey('');
                          }}
                          style={inputStyle}
                        >
                          <option value="">Todos los bloques</option>
                          {r.bloquesDinamicos.map((b) => (
                            <option key={b.codigo} value={b.codigo}>
                              {b.codigo} - {b.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>
                          {tipo === 'defectos' ? 'Punto / Elemento Defecto' : 'Elemento Verificado'}
                        </label>
                        <select
                          value={r.defecto}
                          onChange={(e) => {
                            r.setDefecto(e.target.value);
                            r.setSubdefectoKey('');
                          }}
                          disabled={!r.bloque}
                          style={{
                            ...inputStyle,
                            backgroundColor: !r.bloque ? '#f1f5f9' : '#ffffff',
                          }}
                        >
                          <option value="">
                            {r.bloque ? 'Todos los elementos del bloque' : 'Seleccione primero un bloque'}
                          </option>
                          {r.elementosDinamicos.map((el) => (
                            <option key={el.codigo} value={el.codigo}>
                              {r.bloque}.{el.codigo} - {el.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {tipo === 'defectos' && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Subdefecto / Número Reglamentario</label>
                      <select
                        value={r.subdefectoKey}
                        onChange={(e) => r.setSubdefectoKey(e.target.value)}
                        disabled={!r.bloque || !r.defecto}
                        style={{
                          ...inputStyle,
                          backgroundColor: !r.bloque || !r.defecto ? '#f1f5f9' : '#ffffff',
                        }}
                      >
                        <option value="">
                          {r.defecto ? 'Todos los subdefectos del elemento' : 'Seleccione primero bloque y elemento'}
                        </option>
                        {r.subdefectosDinamicos.map((sub) => {
                          const key = `${sub.subdefecto}|${sub.numero}`;
                          return (
                            <option key={key} value={key}>
                              {sub.bloque}.{sub.defecto}.{sub.subdefecto}.{sub.numero} - {sub.descripcion}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {tipo === 'mediciones' && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>
                          Clasificación de Tipo de Vehículo MINER ({r.tiposVehiculoMiner.length === 0 ? 'Todos' : `${r.tiposVehiculoMiner.length} seleccionados`})
                        </label>
                        {r.tiposVehiculoMiner.length > 0 && (
                          <button
                            type="button"
                            onClick={() => r.setTiposVehiculoMiner([])}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0046ad',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Marcar Todos
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(r.catalogos?.tiposVehiculoMiner ?? []).map((tv) => {
                          const active = r.tiposVehiculoMiner.includes(tv.codigo);
                          return (
                            <button
                              key={tv.codigo}
                              type="button"
                              onClick={() => toggleMinerCode(tv.codigo)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: active ? '1px solid #0046ad' : '1px solid #cbd5e1',
                                backgroundColor: active ? '#0046ad' : '#ffffff',
                                color: active ? '#ffffff' : '#334155',
                              }}
                            >
                              {tv.codigo} · {tv.descripcion}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Campos de Identificación y Clasificación del Vehículo */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {tipo === 'inspecciones' && (
                  <>
                    <div>
                      <label style={labelStyle}>Matrícula (*)</label>
                      <input
                        type="text"
                        value={r.matricula}
                        onChange={(e) => r.setMatricula(e.target.value)}
                        onKeyDown={handleKeyDownInput}
                        placeholder="Ej: *1234* o 1234BBC"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Nº Bastidor VIN (*)</label>
                      <input
                        type="text"
                        value={r.bastidor}
                        onChange={(e) => r.setBastidor(e.target.value)}
                        onKeyDown={handleKeyDownInput}
                        placeholder="Ej: WVWZZZ*"
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={labelStyle}>Marca (*)</label>
                  <input
                    type="text"
                    value={r.marca}
                    onChange={(e) => r.setMarca(e.target.value)}
                    onKeyDown={handleKeyDownInput}
                    placeholder="Ej: SEAT, RENAULT*"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Tipo de Motor</label>
                  <select
                    value={r.tipoMotor}
                    onChange={(e) => r.setTipoMotor(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Todos</option>
                    {(r.catalogos?.tiposMotor ?? []).map((tm) => (
                      <option key={tm.codigo} value={tm.codigo}>
                        {tm.codigo} - {tm.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>Categoría</label>
                    <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={r.categoriaDistinto}
                        onChange={(e) => r.setCategoriaDistinto(e.target.checked)}
                      />
                      Distinto (≠)
                    </label>
                  </div>
                  <select
                    value={r.categoria}
                    onChange={(e) => r.setCategoria(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Todas</option>
                    {(r.catalogos?.categorias ?? []).map((cat) => (
                      <option key={cat.codigo} value={cat.codigo}>
                        {cat.codigo} - {cat.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Construcción</label>
                  <select
                    value={r.construccion}
                    onChange={(e) => r.setConstruccion(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Todas</option>
                    {(r.catalogos?.construcciones ?? []).map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.codigo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Utilización</label>
                  <select
                    value={r.utilizacion}
                    onChange={(e) => r.setUtilizacion(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Todas</option>
                    {(r.catalogos?.utilizaciones ?? []).map((u) => (
                      <option key={u.codigo} value={u.codigo}>
                        {u.codigo}
                      </option>
                    ))}
                  </select>
                </div>

                {tipo === 'inspecciones' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={labelStyle}>Homologación (*)</label>
                      <label style={{ fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={r.homologacionDistinto}
                          onChange={(e) => r.setHomologacionDistinto(e.target.checked)}
                        />
                        Distinto (≠)
                      </label>
                    </div>
                    <input
                      type="text"
                      value={r.homologacion}
                      onChange={(e) => r.setHomologacion(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Contraseña homolog."
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {/* Sub-bloque de Vencimientos / Caducidad ITV (en Localización de Inspecciones) */}
              {tipo === 'inspecciones' && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    alignItems: 'flex-end',
                    padding: '0.7rem 0.85rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ minWidth: '165px' }}>
                    <label style={labelStyle}>Fecha Vencimiento Inicial</label>
                    <input
                      type="date"
                      value={r.fechaVencInicio}
                      onChange={(e) => r.setFechaVencInicio(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ minWidth: '165px' }}>
                    <label style={labelStyle}>Fecha Vencimiento Final</label>
                    <input
                      type="date"
                      value={r.fechaVencFin}
                      onChange={(e) => r.setFechaVencFin(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: r.fechaVencInicio || r.fechaVencFin ? '#0b253b' : '#94a3b8',
                      cursor: r.fechaVencInicio || r.fechaVencFin ? 'pointer' : 'not-allowed',
                      paddingBottom: '6px',
                    }}
                  >
                    <input
                      type="checkbox"
                      disabled={!r.fechaVencInicio && !r.fechaVencFin}
                      checked={r.excluirInspeccionadosPost}
                      onChange={(e) => r.setExcluirInspeccionadosPost(e.target.checked)}
                    />
                    Excluir vehículos inspeccionados posteriormente (Periódicas)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* CAJA 2: DATOS DEL TITULAR Y CLIENTE DE FACTURACIÓN */}
          {activeCriteriaTab === 'titular' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div>
                <label style={labelStyle}>CIF / NIF Titular (*)</label>
                <input
                  type="text"
                  value={r.cifTitular}
                  onChange={(e) => r.setCifTitular(e.target.value)}
                  onKeyDown={handleKeyDownInput}
                  placeholder="CIF o NIF titular"
                  style={inputStyle}
                />
              </div>

              {tipo === 'inspecciones' && (
                <>
                  <div>
                    <label style={labelStyle}>Apellidos / Nombre Titular (*)</label>
                    <input
                      type="text"
                      value={r.apellidosTitular}
                      onChange={(e) => r.setApellidosTitular(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Apellidos titular"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>C.P. Titular (*)</label>
                    <input
                      type="text"
                      value={r.cpTitular}
                      onChange={(e) => r.setCpTitular(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Ej: 28*"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Provincia Titular</label>
                    <select
                      value={r.provinciaTitular}
                      onChange={(e) => r.setProvinciaTitular(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Todas</option>
                      {(r.catalogos?.provincias ?? []).map((p) => (
                        <option key={p.codigo} value={p.descripcion}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Titular (*)</label>
                    <input
                      type="text"
                      value={r.emailTitular}
                      onChange={(e) => r.setEmailTitular(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Email titular"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono 1 Titular (*)</label>
                    <input
                      type="text"
                      value={r.telefonoTitular}
                      onChange={(e) => r.setTelefonoTitular(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Teléfono 1"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono 2 Titular (*)</label>
                    <input
                      type="text"
                      value={r.telefonoTitular2}
                      onChange={(e) => r.setTelefonoTitular2(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Teléfono 2"
                      style={inputStyle}
                    />
                  </div>

                  {/* Facturación inmediata */}
                  <div>
                    <label style={labelStyle}>CIF Cliente Factura (*)</label>
                    <input
                      type="text"
                      value={r.cifFactura}
                      onChange={(e) => r.setCifFactura(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="CIF factura"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Razón Social Factura (*)</label>
                    <input
                      type="text"
                      value={r.razonSocialFactura}
                      onChange={(e) => r.setRazonSocialFactura(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Razón social"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>C.P. Factura (*)</label>
                    <input
                      type="text"
                      value={r.cpFactura}
                      onChange={(e) => r.setCpFactura(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="C.P. factura"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Provincia Factura</label>
                    <select
                      value={r.provinciaFactura}
                      onChange={(e) => r.setProvinciaFactura(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Todas</option>
                      {(r.catalogos?.provincias ?? []).map((p) => (
                        <option key={p.codigo} value={p.descripcion}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Email Factura (*)</label>
                    <input
                      type="text"
                      value={r.emailFactura}
                      onChange={(e) => r.setEmailFactura(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Email factura"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono Factura (*)</label>
                    <input
                      type="text"
                      value={r.telefonoFactura}
                      onChange={(e) => r.setTelefonoFactura(e.target.value)}
                      onKeyDown={handleKeyDownInput}
                      placeholder="Teléfono factura"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </TsCard>

      {/* 5. Tarjetas KPI ejecutivas informativas */}
      {r.data && !r.filters.alertaRangoFechas && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <AppTooltip
            title="Total de Registros Localizados"
            badge={`${r.data.kpis.totalRegistros.toLocaleString('es-ES')} reg.`}
            subtitle={r.data.kpis.truncadoEnGrid ? 'El grid está limitado para agilizar la navegación' : 'Total devuelto por la consulta SQL'}
            content={
              r.data.kpis.truncadoEnGrid
              ? `Se han localizado ${r.data.kpis.totalRegistros.toLocaleString('es-ES')} registros. La tabla muestra los primeros ${r.data.kpis.mostrandoRegistrosGrid.toLocaleString('es-ES')}.`
                : 'Total de registros devueltos por la consulta SQL y cargados en la tabla.'
            }
            position="top"
          >
            <div>
              <ReportKpiCard
                title="Registros Localizados"
                value={r.data.kpis.totalRegistros.toLocaleString('es-ES')}
                subtitle={
                  r.data.kpis.truncadoEnGrid
                    ? `Mostrando ${r.data.kpis.mostrandoRegistrosGrid.toLocaleString('es-ES')} en tabla`
                    : 'Registros cargados en tabla interactiva'
                }
                icon="assignment"
                variant="primary"
                showTooltips={false}
              />
            </div>
          </AppTooltip>
          <AppTooltip
            title="Estaciones ITV con Registros"
            badge={`${r.data.kpis.estacionesConDatos} centros`}
            subtitle={`Estación con mayor volumen: ${estacionLiderFormateada}`}
            content={`Hay ${r.data.kpis.estacionesConDatos} estaciones con registros. La estación líder es ${estacionLiderFormateada}, con ${r.data.kpis.registrosEstacionLider.toLocaleString('es-ES')} registros.`}
            position="top"
          >
            <div>
              <ReportKpiCard
                title="Estaciones con Datos"
                value={`${r.data.kpis.estacionesConDatos}`}
                subtitle={`Mayor volumen: ${estacionLiderFormateada} (${r.data.kpis.registrosEstacionLider.toLocaleString('es-ES')})`}
                icon="apartment"
                variant="success"
                showTooltips={false}
              />
            </div>
          </AppTooltip>
          <AppTooltip
            title="Columnas Proyectadas (Grid y Excel)"
            badge={`${r.data.kpis.columnasActivas} / ${r.data.kpis.totalColumnasDisponibles}`}
            subtitle={`Hoja de Excel: ${cfg.hojaExcel}`}
            content={`Columnas activas en la tabla y en la hoja Excel ${cfg.hojaExcel}. Para cambiarlas, utilice el botón «Seleccionar campos».`}
            position="top"
          >
            <div>
              <ReportKpiCard
                title="Columnas Activas"
                value={`${r.data.kpis.columnasActivas} / ${r.data.kpis.totalColumnasDisponibles}`}
                subtitle={`Hoja destino: ${cfg.hojaExcel}`}
                icon="table_chart"
                variant="neutral"
                showTooltips={false}
              />
            </div>
          </AppTooltip>
          <AppTooltip
            title="Criterios de Búsqueda Aplicados"
            badge={`${r.data.kpis.filtrosAplicadosCount} criterios`}
            subtitle="Trazabilidad incluida al pie del Excel"
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {filtrosAplicadosFormateados.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '0.76rem',
                      padding: '3px 6px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      color: '#0b253b',
                    }}
                  >
                    • {f}
                  </div>
                ))}
              </div>
            }
            position="top"
            maxWidth={460}
          >
            <div>
              <ReportKpiCard
                title="Criterios de Búsqueda Activos"
                value={`${r.data.kpis.filtrosAplicadosCount} criterios`}
                subtitle="Trazabilidad incluida al pie del Excel"
                icon="filter_alt"
                variant="neutral"
                showTooltips={false}
              />
            </div>
          </AppTooltip>
        </div>
      )}

      {/* 6. Distribución Gráfica por Estación (Con Iconos Oficiales, Colores ATISAE/CAL y Leyenda Donut Compacta) */}
      {r.data && puntosGraficoEstaciones.length > 0 && !r.filters.alertaRangoFechas && (
        <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: '8px' }}>
        <TsCard style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '1rem 1.25rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TsIcon name={chartMode === 'barras' ? 'bar_chart' : 'pie_chart'} size={20} style={{ color: '#0046ad' }} />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0b253b' }}>
                Distribución de Registros Localizados por Estación ITV ({puntosGraficoEstaciones.length} centros)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {showChartSection && (
                <div
                  style={{
                    display: 'inline-flex',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setChartMode('barras')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: chartMode === 'barras' ? 700 : 500,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: chartMode === 'barras' ? '#0046ad' : '#ffffff',
                      color: chartMode === 'barras' ? '#ffffff' : '#334155',
                    }}
                  >
                    <TsIcon name="bar_chart" style={{ fontSize: '15px' }} />
                    <span>Ranking Barras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('donut')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 12px',
                      fontSize: '0.8rem',
                      fontWeight: chartMode === 'donut' ? 700 : 500,
                      border: 'none',
                      borderLeft: '1px solid #cbd5e1',
                      cursor: 'pointer',
                      backgroundColor: chartMode === 'donut' ? '#0046ad' : '#ffffff',
                      color: chartMode === 'donut' ? '#ffffff' : '#334155',
                    }}
                  >
                    <TsIcon name="pie_chart" style={{ fontSize: '15px' }} />
                    <span>Distribución Circular</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowChartSection((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#0046ad',
                  cursor: 'pointer',
                }}
              >
                <TsIcon name={showChartSection ? 'keyboard_arrow_down' : 'analytics'} style={{ fontSize: '15px' }} />
                <span>{showChartSection ? '▲ Ocultar gráfico' : '▼ Ver gráfico por estación'}</span>
              </button>
            </div>
          </div>

          {showChartSection && (
            <div style={{ marginTop: '1rem' }}>
              {chartMode === 'barras' ? (
                <ReportBarChart
                  title="Ranking de Registros Localizados por Estación ITV"
                  subtitle="Desglose ordenado por volumen con distinción corporativa TÜV SÜD ATISAE (Azul) y TÜV SÜD CAL (Verde)"
                  data={puntosGraficoEstaciones}
                  height={320}
                  badgeUnit="estaciones"
                  showLegend={true}
                />
              ) : (
                <ReportDonutChart
                  title="Cuota de Registros por Estación ITV"
                  subtitle="Proporción porcentual sobre el total localizado (deslice en la leyenda derecha para ver todas las estaciones)"
                  data={puntosGraficoEstaciones.map((p) => ({
                    ...p,
                    color: undefined, // Permite que el gráfico circular asigne su paleta multicolor diferenciada por sector
                  }))}
                  maxSlices={30}
                />
              )}
            </div>
          )}
        </TsCard>
        </div>
      )}

      {/* 7. Grid: Listado Detallado con Primera Columna "Ficha" Inamovible (Frozen) y Cabecera Azul Estándar */}
      <div ref={gridTopRef} style={{ width: '100%', minWidth: 0, maxWidth: '100%', borderRadius: '8px' }}>
        <section
          className="cd-loc-grid-card"
          style={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            padding: '0',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Barra superior del Grid: Izquierda Título + Buscador debajo | Derecha Registros por página */}
          <div
            className="cd-stack-mobile"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            {/* Izquierda: Título del Grid y, debajo, Buscador con Placeholder Claro */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 320px', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0b253b' }}>
                  Listado detallado (inspecciones localizadas)
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{resumenGrid}</span>
              </div>

              <LocalizacionGridSearch
                value={r.busqueda}
                searchableFields={searchableFieldNames}
                onSearchChange={handleGridSearchChange}
              />
            </div>

            {/* Derecha: Selector de "Registros por página" (la paginación queda únicamente abajo) */}
            {r.totalFilas > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              >
                <label
                  htmlFor="loc-top-pagesize"
                  style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}
                >
                  Registros por página:
                </label>
                <select
                  id="loc-top-pagesize"
                  value={r.pageSize}
                  onChange={(e) => {
                    r.setPageSize(Number(e.target.value));
                    r.setPage(1);
                  }}
                  style={{
                    padding: '3px 7px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {[25, 50, 100, 200, 500].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Contenedor de Tabla con Cabecera Corporativa Azul (#0046ad) y 1ª Columna "Ficha" Frozen */}
          <div
            className="cd-touch-scroll cd-loc-grid-scroll"
            style={{
              overflow: 'auto',
              width: '100%',
              maxWidth: '100%',
              maxHeight: 'min(68vh, 760px)',
              overscrollBehavior: 'contain',
            }}
          >
            <table
              className="cd-data-table"
              style={{
                width: '100%',
                minWidth: `${totalTableMinWidth}px`,
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                fontSize: '0.81rem',
              }}
            >
              <colgroup>
                <col style={{ width: '86px' }} />
                {columnasTabla.map((col) => (
                  <col key={col.idCampo} style={{ width: `${getColumnPixelWidth(col)}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#0046ad', color: '#ffffff', borderBottom: '2px solid #003582' }}>
                  {/* 1ª Columna Fija (Frozen): Ficha */}
                  <th
                    className="cd-table-th"
                    style={{
                      padding: '10px 8px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: '#ffffff',
                      position: 'sticky',
                      left: 0,
                      top: 0,
                      zIndex: 5,
                      backgroundColor: '#0046ad',
                      boxShadow: '2px 0 5px rgba(0, 0, 0, 0.14)',
                    }}
                  >
                    Ficha
                  </th>
                  {columnasTabla.map((col) => {
                    const isSorted = r.sortField === col.columnaExcel;
                    return (
                      <th
                        key={col.idCampo}
                        className={`cd-table-th ${isSorted ? 'cd-table-th-active' : ''}`}
                        onClick={() => r.handleSort(col.columnaExcel)}
                        style={{
                          padding: '10px 8px',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: '#ffffff',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          top: 0,
                          zIndex: 3,
                        }}
                      >
                        <AppTooltip
                          title={col.desCampo}
                          subtitle={`Columna Excel: ${col.columnaExcel} · Clic para ordenar`}
                          position="top"
                          style={{ display: 'flex', width: '100%' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '4px',
                              width: '100%',
                              overflow: 'hidden',
                            }}
                          >
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {col.columnaExcel}
                            </span>
                            <SortIndicator direction={isSorted ? (r.sortAsc ? 'asc' : 'desc') : null} />
                          </div>
                        </AppTooltip>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {r.filters.alertaRangoFechas ? (
                  <tr>
                    <td
                      colSpan={Math.max(2, columnasTabla.length + 1)}
                      style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}
                    >
                      Indique un rango de fechas válido (máximo 1 año) para realizar la consulta.
                    </td>
                  </tr>
                ) : r.filasPaginadas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(2, columnasTabla.length + 1)}
                      style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}
                    >
                      {r.isLoading
                        ? 'Consultando registros en Oracle Central...'
                        : 'No se han encontrado registros para los criterios seleccionados.'}
                    </td>
                  </tr>
                ) : (
                  r.filasPaginadas.map((fila, rIdx) => (
                      <tr
                        key={`${r.page}-${rIdx}`}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {/* 1ª Celda fija: acceso a la ficha del registro */}
                        <td
                          style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                            boxShadow: '2px 0 5px rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          <AppTooltip
                            title="Ver Ficha Técnica Completa"
                            subtitle="Detalle de todos los campos proyectados del registro"
                            position="right"
                          >
                            <button
                              type="button"
                              onClick={() => r.setSelectedRow(fila)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '4px 9px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: '5px',
                                border: '1px solid #0046ad',
                                backgroundColor: '#ffffff',
                                color: '#0046ad',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0, 70, 173, 0.2)',
                              }}
                            >
                              <TsIcon name="search" style={{ fontSize: '13px', color: '#0046ad' }} />
                              <span>Ver</span>
                            </button>
                          </AppTooltip>
                        </td>

                        {columnasTabla.map((col) => {
                          const rawVal = fila[col.columnaExcel];
                          const displayVal =
                            rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== ''
                              ? String(rawVal)
                              : '—';
                          const isMono =
                            col.columnaExcel.includes('MATRICULA') ||
                            col.columnaExcel.includes('BASTIDOR') ||
                            col.columnaExcel.includes('COD_');

                          return (
                            <td
                              key={col.idCampo}
                              style={{
                                padding: '8px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: displayVal === '—' ? '#94a3b8' : '#1e293b',
                                fontFamily: isMono ? 'monospace' : undefined,
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: col.columnaExcel === 'MATRICULA' ? 700 : 400,
                              }}
                            >
                              {displayVal.length > 16 ? (
                                <AppTooltip title={col.desCampo} content={displayVal} position="top">
                                  <span>{displayVal}</span>
                                </AppTooltip>
                              ) : (
                                displayVal
                              )}
                            </td>
                          );
                        })}
                      </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación Inferior Homogénea (con Scroll-Top automático al cambiar de página) */}
          {r.totalFilas > 0 && (
            <>
              <div
                style={{
                  padding: '0.65rem 1.25rem',
                  color: '#64748b',
                  fontSize: '0.76rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                {resumenGrid}
              </div>
              <ReportPaginationBar
                page={r.page}
                totalPaginas={r.totalPages}
                pageSize={r.pageSize}
                totalFilas={r.totalFilas}
                unidadRegistros="registros"
                onPageChange={handleBottomPageChange}
                onPageSizeChange={(newSize) => {
                  r.setPageSize(newSize);
                  r.setPage(1);
                  setTimeout(() => {
                    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 40);
                }}
              />
            </>
          )}

          {/* Pie de Filtros Aplicados: ajustado al ancho del grid, estaciones una por línea (código - nombre) */}
          {r.data && filtrosPieDetalle.length > 0 && (
            <div
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px dashed #cbd5e1',
                fontSize: '0.76rem',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              <strong style={{ color: '#0b253b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <TsIcon name="filter_alt" size={14} style={{ color: '#0046ad' }} />
                <span>Filtros registrados en el libro Excel:</span>
              </strong>

              {/* Criterios simples en chips que saltan de línea */}
              {filtrosPieDetalle.some((f) => !f.estaciones) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minWidth: 0 }}>
                  {filtrosPieDetalle
                    .filter((f) => !f.estaciones)
                    .map((f, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          color: '#1e293b',
                          fontWeight: 500,
                          maxWidth: '100%',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {f.texto}
                      </span>
                    ))}
                </div>
              )}

              {/* Estaciones: una por línea con código y descripción, en columnas responsivas */}
              {filtrosPieDetalle
                .filter((f) => f.estaciones)
                .map((f, i) => (
                  <div key={`est-${i}`} style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#0b253b', marginBottom: '4px' }}>{f.texto}</div>
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))',
                        gap: '4px 12px',
                      }}
                    >
                      {f.estaciones!.map((est) => (
                        <li
                          key={est}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '3px solid #0046ad',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            color: '#1e293b',
                            fontWeight: 500,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {est}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal de Selección de Columnas */}
      <LocalizacionColumnSelectorModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columnasDisponibles={r.catalogos?.columnas ?? []}
        idsSeleccionados={r.idsCamposSeleccionados}
        onApply={r.handleAplicarColumnas}
        tituloModulo={cfg.titulo}
      />

      {/* Modal de Ficha Técnica del Registro */}
      {r.selectedRow && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 37, 59, 0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => r.setSelectedRow(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0046ad 0%, #1d63c8 100%)',
                color: '#ffffff',
                padding: '0.9rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TsIcon name={cfg.icono} size={20} style={{ color: '#dbeafe' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                  Ficha Técnica de Registro · {cfg.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => r.setSelectedRow(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.14)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <TsIcon name="close" size={20} />
              </button>
            </div>

            <div
              style={{
                padding: '1.25rem',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {columnasTabla.map((col) => {
                const val = r.selectedRow?.[col.columnaExcel];
                return (
                  <div
                    key={col.idCampo}
                    style={{
                      padding: '0.6rem 0.75rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                      {col.desCampo} ({col.columnaExcel})
                    </div>
                    <div
                      style={{
                        marginTop: '3px',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        color: '#0b253b',
                        wordBreak: 'break-word',
                      }}
                    >
                      {val !== null && val !== undefined && String(val).trim() !== '' ? String(val) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <TsButton variant="primary" size="small" onClick={() => r.setSelectedRow(null)}>
                Cerrar Ficha
              </TsButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloqueante de Carga y Exportación */}
      <BlockingLoadingModal
        isOpen={r.isLoading || r.isExporting}
        title={
          r.isExporting
            ? `Generando Libro Oficial ${cfg.hojaExcel}.xlsx...`
            : `Consultando ${cfg.titulo}...`
        }
        message={
          r.isExporting
            ? 'Generando el archivo Excel en el servidor. Esta operación no se puede cancelar de forma segura mientras se serializa el libro...'
            : 'Ejecutando consulta parametrizada sobre las estaciones ITV seleccionadas...'
        }
        onCancel={r.isLoading ? r.cancelarConsulta : undefined}
        cancelLabel="Cancelar consulta"
      />
    </div>
  );
};
