import React, { startTransition, useCallback, useMemo, useRef, useState } from 'react';
import { TsAlert, TsButton, TsCard, TsIcon } from '@tuvsud/design-system/react';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import { SOCIEDADES } from '../../../constants/companies.constants';
import { ReportDateRangeAlert } from '../../informes/components/ReportDateRangeAlert';
import { ReportBarChart } from '../../informes/components/ReportBarChart';
import { ReportDonutChart } from '../../informes/components/ReportDonutChart';
import { ReportFiltersBar } from '../../informes/components/ReportFiltersBar';
import { ReportPageHeader } from '../../informes/components/ReportPageHeader';
import { ReportPaginationBar } from '../../informes/components/ReportPaginationBar';
import type { ReportBarChartPoint } from '../../informes/types/informes.types';
import { SortIndicator } from '../../../components/common/SortIndicator';
import { LocalizacionColumnSelectorModal } from '../components/LocalizacionColumnSelectorModal';
import { InspectionRecordDetailModal } from '../components/InspectionRecordDetailModal';
import { InspectionExcelExportAction } from '../components/InspectionExcelExportAction';
import { InspectionAppliedFiltersFooter } from '../components/InspectionAppliedFiltersFooter';
import { LocalizacionGridSearch } from '../components/LocalizacionGridSearch';
import { useLocalizacionReport } from '../hooks/useLocalizacionReport';

interface InspeccionesDefectosPageProps {
  onNavigateHome?: () => void;
  onNavigateToInspecciones?: () => void;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '0.5rem 0.65rem',
  border: '1px solid var(--ts-semantic-color-border-base-default)',
  borderRadius: 'var(--ts-semantic-size-radius-lg)',
  backgroundColor: 'var(--ts-semantic-color-surface-base-default)',
  color: 'var(--ts-semantic-color-text-base-default)',
  font: 'inherit',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.3rem',
  color: 'var(--ts-semantic-color-text-neutral-default)',
  fontSize: '0.78rem',
  fontWeight: 700,
};

const panelStyle: React.CSSProperties = {
  padding: '0.8rem',
  border: '1px solid var(--ts-semantic-color-border-base-default)',
  borderRadius: 'var(--ts-semantic-size-radius-xl)',
  backgroundColor: 'var(--ts-semantic-color-surface-base-default)',
};

const labelMap: Record<string, string> = {
  COD_ESTACION: 'Estación',
  COD_INSPECCION: 'Código de inspección',
  FECHA_INSPECCION: 'Fecha inspección',
  MATRICULA: 'Matrícula',
  BASTIDOR: 'Bastidor',
  NUMBASTIDOR: 'Bastidor',
  CODSECCION: 'Sección manual',
  BLOQUE: 'Bloque',
  DEFECTO: 'Defecto',
  SUBDEFECTO: 'Subdefecto',
  NUMERO: 'Número',
  FASE: 'Fase',
  CATEGORIA: 'Categoría',
  TIPO_MOTOR: 'Tipo de motor',
  TIPO_INSP: 'Tipo de inspección',
  RESULTADO: 'Resultado',
};

function getColumnWidth(columnName: string): number {
  const name = columnName.toUpperCase();
  if (name === 'COD_ESTACION' || name === 'FASE' || name === 'CLASIF' || name === 'CATEGORIA') return 110;
  if (name === 'MATRICULA' || name === 'TIPO_MOTOR' || name === 'TIPO_INSP' || name === 'RESULTADO') return 130;
  if (name.includes('FECHA')) return 155;
  if (name.includes('BASTIDOR') || name === 'COD_INSPECCION') return 170;
  if (
    name.includes('LISTA_DEFECTOS') ||
    name.includes('DESCRIPCION') ||
    name.includes('DOMICILIO') ||
    name.includes('RAZON_SOCIAL')
  ) return 245;
  if (name.includes('EMAIL') || name.includes('APELLIDOS') || name.includes('CLIENTE')) return 200;
  return 150;
}

export const InspeccionesDefectosPage: React.FC<InspeccionesDefectosPageProps> = ({
  onNavigateHome,
  onNavigateToInspecciones,
}) => {
  const report = useLocalizacionReport('defectos');
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);
  const [chartsExpanded, setChartsExpanded] = useState(false);
  const [chartMode, setChartMode] = useState<'barras' | 'donut'>('barras');
  const gridTopRef = useRef<HTMLDivElement>(null);

  const sectionOptions = report.catalogos?.seccionesManual ?? [];
  const title = 'Inspecciones defectos';
  const columnasTabla = report.data?.columnas
    ?? report.catalogos?.columnas.filter((column) => report.idsCamposSeleccionados.includes(column.idCampo)) ?? [];
  const hayDatos = Boolean(report.data?.filas.length && !report.filters.alertaRangoFechas);
  const camposBuscables = report.camposBuscables.map((campo) => campo.desCampo.toLocaleLowerCase('es-ES'));
  const handleGridSearchChange = useCallback(
    (value: string) => {
      startTransition(() => {
        report.setBusqueda(value);
        report.setPage(1);
      });
    },
    [report.setBusqueda, report.setPage]
  );
  const handleBottomPageChange = useCallback(
    (newPage: number) => {
      report.setPage(newPage);
      window.setTimeout(() => gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
    },
    [report.setPage]
  );
  const resumenGrid = (
    <>
      Mostrando <strong>{report.filasPaginadas.length.toLocaleString('es-ES')}</strong> de{' '}
      {report.busqueda.trim() && (
        <>
          <strong>{report.totalFilas.toLocaleString('es-ES')}</strong> coincidencias en{' '}
        </>
      )}
      <strong>{(report.data?.filas.length ?? 0).toLocaleString('es-ES')}</strong> cargados de{' '}
      <strong>{(report.data?.kpis.totalRegistros ?? 0).toLocaleString('es-ES')}</strong> encontrados
    </>
  );
  const chartPoints: ReportBarChartPoint[] = useMemo(
    () =>
      (report.data?.graficoPorEstacion ?? []).map((point) => {
        const code = point.clave.trim().padStart(4, '0');
        const station = ESTACIONES_OFICIALES.find((item) => item.codigo === code);
        const company = station?.sociedad === 'CAL' || code.startsWith('09') ? 'CAL' : 'TSA';
        const name = station?.descripcion.replace(/^I\.T\.V\.\s*-\s*/i, '').trim() ?? `ITV ${code}`;
        return {
          id: code,
          label: `${code} - ${name}`,
          valor: point.valor,
          valorFormateado: point.valorFormateado,
          sociedad: company,
          color: company === 'CAL' ? SOCIEDADES.CAL.colorBorde : SOCIEDADES.ATISAE.colorBorde,
          tooltipSubtitle: `${company === 'CAL' ? 'TÜV SÜD CAL' : 'TÜV SÜD ATISAE'} · ${point.valor.toLocaleString('es-ES')} inspecciones`,
        };
      }),
    [report.data?.graficoPorEstacion]
  );
  const tableMinWidth = useMemo(
    () => Math.max(1_100, columnasTabla.reduce((total, column) => total + getColumnWidth(column.columnaExcel), 0) + 86),
    [columnasTabla]
  );
  const stationLeader = report.data?.kpis.estacionLider.match(/\d{2,4}/)?.[0];
  const stationLeaderName = stationLeader
    ? ESTACIONES_OFICIALES.find((station) => station.codigo === stationLeader.padStart(4, '0'))?.descripcion.replace(/^I\.T\.V\.\s*-\s*/i, '').trim() ?? stationLeader
    : 'Sin datos';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
      <ReportPageHeader
        title={title}
        subtitle="Consulta de defectos de inspección por estación, fecha, vehículo y criterios del manual."
        icon="search"
        breadcrumbItemText={title}
        parentBreadcrumbText="Inspecciones"
        backButtonText="← Volver a Inspecciones"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInspecciones}
      />

      <ReportDateRangeAlert
        mensaje={report.filters.alertaRangoFechas}
        onAjustarAUnAno={report.filters.ajustarAUnAno}
      />

      <div
        className="cd-localizacion-actions"
        style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap', marginBottom: '-0.85rem' }}
      >
        <AppTooltip
          title="Seleccionar campos visibles y de exportación"
          subtitle={`${report.idsCamposSeleccionados.length} de ${report.catalogos?.columnas.length ?? 0} columnas activas`}
          content="Permite elegir qué columnas se muestran en el listado y se incluyen en el archivo Excel."
          position="bottom"
        >
          <span>
            <TsButton
              type="button"
              variant="secondary"
              size="medium"
              onClick={() => setColumnSelectorOpen(true)}
              disabled={!report.catalogos || report.isCatalogLoading}
            >
              <TsIcon slot="prefix" name="view_column" />
              Seleccionar campos ({report.idsCamposSeleccionados.length}/{report.catalogos?.columnas.length ?? 0})
            </TsButton>
          </span>
        </AppTooltip>
        <InspectionExcelExportAction
          fileTitle="Exportar libro oficial (DEFECTOS_LOCALIZADOS.xlsx)"
          totalRecords={report.data?.kpis.totalRegistros ?? 0}
          confirmationThreshold={report.highVolumeWarningThreshold}
          maxExportRows={report.maxExportRows}
          hasData={hayDatos}
          isLoading={report.isLoading}
          isExporting={report.isExporting}
          confirmationRequired={report.exportConfirmationRequired}
          onExport={report.handleExportarExcel}
          onConfirmExport={report.confirmarExportacionExcel}
          onCancelExport={report.cancelarConfirmacionExportacion}
        />
      </div>

      <ReportFiltersBar
        fechaInicio={report.filters.fechaInicio}
        fechaFin={report.filters.fechaFin}
        onFechaInicioChange={report.filters.handleFechaInicioChange}
        onFechaFinChange={report.filters.handleFechaFinChange}
        sociedad={report.filters.sociedad}
        onSociedadChange={report.filters.setSociedad}
        estacionesSeleccionadas={report.filters.estacionesSeleccionadas}
        onEstacionesChange={report.filters.setEstacionesSeleccionadas}
        estacionesPermitidas={report.filters.estacionesPermitidas}
        fase={report.filters.fase}
        onFaseChange={report.filters.setFase}
        onConsultar={report.handleConsultar}
        loading={report.isLoading}
      />

      <div className="defectos-filter-grid">
        <TsCard className="defectos-holder-panel" style={panelStyle}>
          <h2 style={{ margin: '0 0 0.55rem', fontSize: '0.9rem', color: 'var(--ts-semantic-color-text-base-default)' }}>Titular</h2>
          <label style={labelStyle} htmlFor="defectos-nif">NIF</label>
          <input
            id="defectos-nif"
            type="text"
            value={report.cifTitular}
            onChange={(event) => report.setCifTitular(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') report.handleConsultar();
            }}
            placeholder="NIF del titular"
            style={fieldStyle}
          />
        </TsCard>

        <TsCard style={panelStyle}>
          <h2 style={{ margin: '0 0 0.65rem', fontSize: '0.9rem', color: 'var(--ts-semantic-color-text-base-default)' }}>Datos del vehículo</h2>
          <div className="defectos-vehicle-fields">
            <label>
              <span style={labelStyle}>Construcción</span>
              <select value={report.construccion} onChange={(event) => report.setConstruccion(event.target.value)} style={fieldStyle}>
                <option value="">Todas</option>
                {(report.catalogos?.construcciones ?? []).map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Utilización</span>
              <select value={report.utilizacion} onChange={(event) => report.setUtilizacion(event.target.value)} style={fieldStyle}>
                <option value="">Todas</option>
                {(report.catalogos?.utilizaciones ?? []).map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Categoría</span>
              <select value={report.categoria} onChange={(event) => report.setCategoria(event.target.value)} style={fieldStyle}>
                <option value="">Todas</option>
                {(report.catalogos?.categorias ?? []).map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', alignSelf: 'end', gap: '0.45rem', minHeight: '2.3rem', color: 'var(--ts-semantic-color-text-neutral-default)', fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={report.categoriaDistinto}
                onChange={(event) => report.setCategoriaDistinto(event.target.checked)}
              />
              Excluir categoría
            </label>
            <label>
              <span style={labelStyle}>Tipo de motor</span>
              <select value={report.tipoMotor} onChange={(event) => report.setTipoMotor(event.target.value)} style={fieldStyle}>
                <option value="">Todos</option>
                {(report.catalogos?.tiposMotor ?? []).map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Marca</span>
              <input
                type="text"
                value={report.marca}
                onChange={(event) => report.setMarca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') report.handleConsultar();
                }}
                placeholder="Marca"
                style={fieldStyle}
              />
            </label>
          </div>
        </TsCard>

        <TsCard style={panelStyle}>
          <h2 style={{ margin: '0 0 0.65rem', fontSize: '0.9rem', color: 'var(--ts-semantic-color-text-base-default)' }}>Datos de defectos</h2>
          <div className="defectos-manual-fields">
            <label>
              <span style={labelStyle}>Sección manual</span>
              <select
                value={report.seccionManual}
                onChange={(event) => {
                  report.setSeccionManual(event.target.value);
                  report.setBloque('');
                  report.setDefecto('');
                  report.setSubdefectoKey('');
                }}
                style={fieldStyle}
              >
                <option value="">Todas las secciones</option>
                {sectionOptions.map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Bloque</span>
              <select
                value={report.bloque}
                onChange={(event) => {
                  report.setBloque(event.target.value);
                  report.setDefecto('');
                  report.setSubdefectoKey('');
                }}
                style={fieldStyle}
              >
                <option value="">Todos los bloques</option>
                {report.bloquesDinamicos.map((item) => (
                  <option key={item.codigo} value={item.codigo}>{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Elemento</span>
              <select
                value={report.defecto}
                disabled={!report.bloque}
                onChange={(event) => {
                  report.setDefecto(event.target.value);
                  report.setSubdefectoKey('');
                }}
                style={{ ...fieldStyle, opacity: report.bloque ? 1 : 0.65 }}
              >
                <option value="">{report.bloque ? 'Todos los elementos' : 'Seleccione primero un bloque'}</option>
                {report.elementosDinamicos.map((item) => (
                  <option key={item.codigo} value={item.codigo}>{report.bloque}.{item.codigo} - {item.descripcion}</option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Defecto</span>
              <select
                value={report.subdefectoKey}
                disabled={!report.bloque || !report.defecto}
                onChange={(event) => report.setSubdefectoKey(event.target.value)}
                style={{ ...fieldStyle, opacity: report.bloque && report.defecto ? 1 : 0.65 }}
              >
                <option value="">{report.defecto ? 'Todos los defectos' : 'Seleccione primero un elemento'}</option>
                {report.subdefectosDinamicos.map((item) => {
                  const key = `${item.subdefecto}|${item.numero}`;
                  return (
                    <option key={key} value={key}>
                      {item.bloque}.{item.defecto}.{item.subdefecto}.{item.numero} - {item.descripcion}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </TsCard>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
        <TsButton variant="secondary" size="small" onClick={report.limpiarFiltrosAvanzados}>
          <TsIcon slot="prefix" name="close" />
          Limpiar filtros técnicos
        </TsButton>
      </div>

      {report.error && <TsAlert variant="danger" open heading="Error al consultar">{report.error}</TsAlert>}
      {report.exportError && <TsAlert variant="danger" open heading="Error al exportar">{report.exportError}</TsAlert>}

      {report.data && (
        <>
          <div className="defectos-kpi-grid">
            <AppTooltip
                title="Inspecciones con defectos"
                badge={`${report.data.kpis.totalRegistros.toLocaleString('es-ES')} registros`}
                subtitle="Total según los filtros aplicados"
                content="Número total de inspecciones que contienen defectos y coinciden con los criterios actuales."
                position="top"
                style={{ display: 'block', width: '100%' }}
              >
                <div style={{ width: '100%' }}>
                  <ReportKpiCard
                    title="Inspecciones con defectos"
                    value={report.data.kpis.totalRegistros.toLocaleString('es-ES')}
                    subtitle="Según los filtros aplicados"
                    icon="assignment"
                    variant="primary"
                    showTooltips={false}
                  />
                </div>
            </AppTooltip>
            <AppTooltip
                title="Estaciones con resultados"
                badge={`${report.data.kpis.estacionesConDatos.toLocaleString('es-ES')} estaciones`}
                subtitle="Centros incluidos en la consulta"
                content="Cantidad de estaciones con al menos un registro de inspección con defectos para los filtros seleccionados."
                position="top"
                style={{ display: 'block', width: '100%' }}
              >
                <div style={{ width: '100%' }}>
                  <ReportKpiCard
                    title="Estaciones con resultados"
                    value={report.data.kpis.estacionesConDatos.toLocaleString('es-ES')}
                    subtitle="Estaciones incluidas"
                    icon="apartment"
                    variant="success"
                    showTooltips={false}
                  />
                </div>
            </AppTooltip>
            <AppTooltip
                title="Estación con más resultados"
                badge={`${report.data.kpis.registrosEstacionLider.toLocaleString('es-ES')} registros`}
                subtitle={`Estación líder: ${stationLeaderName}`}
                content={`${stationLeaderName} es la estación con más inspecciones con defectos dentro del resultado actual.`}
                position="top"
                style={{ display: 'block', width: '100%' }}
              >
                <div style={{ width: '100%' }}>
                  <ReportKpiCard
                    title="Estación con más resultados"
                    value={stationLeaderName}
                    subtitle={`${report.data.kpis.registrosEstacionLider.toLocaleString('es-ES')} registros`}
                    icon="leaderboard"
                    variant="neutral"
                    showTooltips={false}
                  />
                </div>
            </AppTooltip>
            <AppTooltip
                title="Campos seleccionados para la consulta"
                badge={`${report.data.kpis.columnasActivas} de ${report.data.kpis.totalColumnasDisponibles}`}
                subtitle="Columnas de la tabla y del Excel"
                content="Indica cuántos campos están seleccionados para mostrarse en el grid y en la exportación a Excel."
                position="top"
                style={{ display: 'block', width: '100%' }}
              >
                <div style={{ width: '100%' }}>
                  <ReportKpiCard
                    title="Campos seleccionados"
                    value={`${report.data.kpis.columnasActivas} / ${report.data.kpis.totalColumnasDisponibles}`}
                    subtitle="Tabla y exportación"
                    icon="view_column"
                    variant="neutral"
                    showTooltips={false}
                  />
                </div>
            </AppTooltip>
          </div>

          <TsCard style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '1rem 1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {chartMode === 'barras' ? (
                  <TsIcon name="bar_chart" style={{ color: 'var(--ts-semantic-color-icon-primary-default)' }} />
                ) : (
                  <TsIcon name="pie_chart" style={{ color: 'var(--ts-semantic-color-icon-primary-default)' }} />
                )}
                <strong style={{ color: 'var(--ts-semantic-color-text-base-default)', fontSize: '0.92rem' }}>
                  Distribución de inspecciones con defectos por estación ITV ({chartPoints.length} centros)
                </strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {chartsExpanded && (
                  <div className="defectos-chart-mode">
                    <button
                      type="button"
                      aria-pressed={chartMode === 'barras'}
                      onClick={() => setChartMode('barras')}
                    >
                      <TsIcon name="bar_chart" />
                      Ranking Barras
                    </button>
                    <button
                      type="button"
                      aria-pressed={chartMode === 'donut'}
                      onClick={() => setChartMode('donut')}
                    >
                      <TsIcon name="pie_chart" />
                      Distribución Circular
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  aria-expanded={chartsExpanded}
                  onClick={() => setChartsExpanded((expanded) => !expanded)}
                  className="defectos-chart-toggle"
                >
                  <TsIcon name={chartsExpanded ? 'keyboard_arrow_down' : 'analytics'} />
                  {chartsExpanded ? '▲ Ocultar gráfico' : '▼ Ver gráfico por estación'}
                </button>
              </div>
            </div>

            {chartsExpanded && (
              chartPoints.length > 0 ? (
                <div style={{ marginTop: '1rem' }}>
                  {chartMode === 'barras' ? (
                    <ReportBarChart
                      title="Ranking de inspecciones con defectos por estación ITV"
                      subtitle="Distribución de los resultados según la selección actual"
                      data={chartPoints}
                      height={300}
                      badgeUnit="estaciones"
                      showLegend
                    />
                  ) : (
                    <ReportDonutChart
                      title="Cuota de inspecciones con defectos por estación ITV"
                      subtitle="Distribución porcentual de inspecciones con defectos"
                      data={chartPoints}
                    />
                  )}
                </div>
              ) : (
                <p style={{ margin: '0.8rem 0 0', color: 'var(--ts-semantic-color-text-neutral-default)' }}>
                  No hay datos por estación para mostrar.
                </p>
              )
            )}
          </TsCard>
        </>
      )}

      <div ref={gridTopRef} style={{ width: '100%', minWidth: 0, maxWidth: '100%' }}>
        <section className="cd-loc-grid-card">
          <div className="cd-loc-grid-toolbar">
            <div className="cd-loc-grid-toolbar-main">
              <div>
                <h2 className="cd-loc-grid-title">Listado detallado (inspecciones con defectos)</h2>
                <span className="cd-loc-grid-summary">{resumenGrid}</span>
              </div>
              <LocalizacionGridSearch
                value={report.busqueda}
                searchableFields={camposBuscables}
                onSearchChange={handleGridSearchChange}
              />
            </div>
            {report.totalFilas > 0 && (
              <div className="cd-loc-grid-pagesize">
                <label htmlFor="defectos-top-pagesize">Registros por página:</label>
                <select
                  id="defectos-top-pagesize"
                  value={report.pageSize}
                  onChange={(event) => {
                    report.setPageSize(Number(event.target.value));
                    report.setPage(1);
                  }}
                >
                  {[25, 50, 100, 200, 500].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="cd-touch-scroll cd-loc-grid-scroll" style={{ maxHeight: 'min(68vh, 760px)' }}>
            <table
              className="cd-data-table"
              style={{ width: '100%', minWidth: `${tableMinWidth}px`, tableLayout: 'fixed', fontSize: '0.81rem' }}
            >
              <colgroup>
                <col style={{ width: '86px' }} />
                {columnasTabla.map((column) => (
                  <col key={column.idCampo} style={{ width: `${getColumnWidth(column.columnaExcel)}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="cd-table-th cd-loc-grid-ficha-header">Ficha</th>
                  {columnasTabla.map((column) => {
                    const displayName = column.desCampo || labelMap[column.columnaExcel.toUpperCase()] || column.columnaExcel;
                    const sorted = report.sortField === column.columnaExcel;
                    return (
                      <th
                        key={column.idCampo}
                        className={`cd-table-th ${sorted ? 'cd-table-th-active' : ''}`}
                      >
                        <AppTooltip
                          title={displayName}
                          subtitle={`Columna Excel: ${column.columnaExcel} · Clic para ordenar`}
                          position="top"
                          style={{ display: 'flex', width: '100%' }}
                        >
                          <button
                            type="button"
                            onClick={() => report.handleSort(column.columnaExcel)}
                            className="cd-loc-grid-sort-button"
                          >
                            <span>{column.columnaExcel}</span>
                            <SortIndicator direction={sorted ? (report.sortAsc ? 'asc' : 'desc') : null} />
                          </button>
                        </AppTooltip>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {report.filters.alertaRangoFechas ? (
                  <tr>
                    <td colSpan={Math.max(2, columnasTabla.length + 1)} className="cd-loc-grid-empty">
                      Indique un rango de fechas válido (máximo 1 año) para realizar la consulta.
                    </td>
                  </tr>
                ) : report.filasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(2, columnasTabla.length + 1)} className="cd-loc-grid-empty">
                      {report.isLoading
                        ? 'Consultando registros en Oracle Central...'
                        : report.busqueda
                          ? 'No hay resultados que coincidan con la búsqueda.'
                          : 'No se han encontrado registros para los criterios seleccionados.'}
                    </td>
                  </tr>
                ) : (
                  report.filasPaginadas.map((row, rowIndex) => (
                    <tr key={`${String(row.COD_ESTACION ?? '')}-${String(row.COD_INSPECCION ?? '')}-${rowIndex}`}>
                      <td className="cd-loc-grid-ficha-cell">
                        <AppTooltip title="Ver ficha técnica completa" subtitle="Detalle de los campos de este registro" position="right">
                          <button type="button" className="cd-loc-grid-ficha-button" onClick={() => report.setSelectedRow(row)}>
                            <TsIcon name="search" />
                            <span>Ver</span>
                          </button>
                        </AppTooltip>
                      </td>
                      {columnasTabla.map((column) => {
                        const rawValue = row[column.columnaExcel];
                        const value = rawValue === null || rawValue === undefined || String(rawValue).trim() === ''
                          ? '—'
                          : String(rawValue);
                        const isMono =
                          column.columnaExcel.includes('MATRICULA') ||
                          column.columnaExcel.includes('BASTIDOR') ||
                          column.columnaExcel.includes('COD_');
                        return (
                          <td
                            key={column.idCampo}
                            className="cd-loc-grid-data-cell"
                            style={{
                              padding: '8px',
                              color: value === '—' ? '#94a3b8' : '#1e293b',
                              fontFamily: isMono ? 'monospace' : undefined,
                              fontWeight: column.columnaExcel === 'MATRICULA' ? 700 : 400,
                            }}
                          >
                            {value.length > 16 ? (
                              <AppTooltip title={column.desCampo} content={value} position="top">
                                <span>{value}</span>
                              </AppTooltip>
                            ) : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {report.totalFilas > 0 && (
            <>
              <div className="cd-loc-grid-summary-bottom">{resumenGrid}</div>
              <ReportPaginationBar
                page={report.page}
                pageSize={report.pageSize}
                totalFilas={report.totalFilas}
                totalEncontrados={report.data?.kpis.totalRegistros}
                totalPaginas={report.totalPages}
                onPageChange={handleBottomPageChange}
                showPageSizeSelector={false}
                onPageSizeChange={(newSize) => {
                  report.setPageSize(newSize);
                  report.setPage(1);
                  window.setTimeout(() => gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
                }}
                unidadRegistros="registros"
              />
            </>
          )}
          <InspectionAppliedFiltersFooter filters={report.data?.filtrosAplicados ?? []} />
        </section>
      </div>

      <InspectionRecordDetailModal
        row={report.selectedRow}
        columns={columnasTabla}
        title={title}
        icon="car_repair"
        onClose={() => report.setSelectedRow(null)}
      />

      <LocalizacionColumnSelectorModal
        isOpen={columnSelectorOpen}
        onClose={() => setColumnSelectorOpen(false)}
        columnasDisponibles={report.catalogos?.columnas ?? []}
        idsSeleccionados={report.idsCamposSeleccionados}
        onApply={report.handleAplicarColumnas}
        tituloModulo={title}
      />

      <BlockingLoadingModal
        isOpen={report.isLoading || report.isExporting}
        title={report.isLoading ? 'Consultando inspecciones defectos' : 'Generando archivo Excel'}
        message={report.isLoading ? 'Buscando registros con los criterios seleccionados.' : 'Preparando el archivo para su descarga.'}
        onCancel={report.isLoading ? report.cancelarConsulta : undefined}
      />
    </div>
  );
};
