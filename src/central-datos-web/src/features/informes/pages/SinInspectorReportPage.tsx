import React, { useState } from 'react';
import { TsButton, TsBadge, TsAlert } from '@tuvsud/design-system/react';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { SortIndicator } from '../../../components/common/SortIndicator';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import {
  ReportPageHeader,
  ReportFiltersBar,
  ReportDateRangeAlert,
  ReportTableContainer,
  ReportBarChart,
  ReportDonutChart,
} from '../components';
import { useSinInspectorReport } from '../hooks/useSinInspectorReport';
import type { FilaSinInspector } from '../types/informes.types';

export interface SinInspectorReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const SinInspectorReportPage: React.FC<SinInspectorReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const [chartMode, setChartMode] = useState<'bar' | 'donut'>('bar');
  const {
    filters,
    fetchReport,
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    exportarExcel,
    table,
    filaSeleccionada,
    setFilaSeleccionada,
  } = useSinInspectorReport();

  const {
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    page,
    pageSize,
    setPage,
    setPageSize,
    totalFilas,
    totalPaginas,
    filasPaginadas,
  } = table;

  const hayDatosParaExportar = data && data.filas && data.filas.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 0. Modales de carga bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Inspecciones Sin Inspector"
        message="Recuperando y analizando inspecciones sin inspector asignado en las estaciones seleccionadas..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando y preparando la descarga del informe oficial en Excel..."
      />

      {/* 1. Cabecera Oficial Estandarizada */}
      <ReportPageHeader
        title="Informe de Inspecciones sin Inspector"
        subtitle="Control y auditoría técnica de inspecciones que no tienen asignado ningún inspector responsable en la red ITV"
        icon="⚠️"
        breadcrumbItemText="Inspecciones sin inspector"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          content="Descarga el informe oficial de inspecciones sin inspector en formato Excel (.xlsx)"
          position="bottom"
        >
          <span>
            <TsButton
              variant="primary"
              size="medium"
              onClick={exportarExcel}
              disabled={isLoading || isExporting || !hayDatosParaExportar}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isExporting ? '⏳ Generando Excel...' : '📊 Exportar a Excel'}
            </TsButton>
          </span>
        </AppTooltip>
      </ReportPageHeader>

      {/* 2. Barra Unificada de Filtros */}
      <ReportFiltersBar
        fechaInicio={filters.fechaInicio}
        fechaFin={filters.fechaFin}
        sociedad={filters.sociedad}
        estacionesSeleccionadas={filters.estacionesSeleccionadas}
        estacionesPermitidas={filters.estacionesPermitidas}
        fase={filters.fase}
        onFaseChange={filters.setFase}
        onFechaInicioChange={filters.handleFechaInicioChange}
        onFechaFinChange={filters.handleFechaFinChange}
        onSociedadChange={filters.setSociedad}
        onEstacionesChange={filters.setEstacionesSeleccionadas}
        onConsultar={() => fetchReport()}
        loading={isLoading}
      />

      {/* 3. Alertas de Validación Reactiva y Errores */}
      <ReportDateRangeAlert
        mensaje={filters.alertaRangoFechas}
        onAjustarAUnAno={filters.ajustarAUnAno}
      />

      {error && !filters.alertaRangoFechas && (
        <TsAlert
          variant="danger"
          open
          heading="Error de Consulta"
          style={{ fontSize: '0.88rem' }}
        >
          <span>❌ {error}</span>
        </TsAlert>
      )}

      {exportError && (
        <TsAlert
          variant="danger"
          open
          heading="Error de Exportación"
          style={{ fontSize: '0.88rem' }}
        >
          <span>❌ {exportError}</span>
        </TsAlert>
      )}

      {/* 4. Tarjetas KPIs Ejecutivas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {data && data.kpis && data.kpis.length > 0 ? (
          data.kpis.map((kpi, index) => (
            <ReportKpiCard
              key={`${kpi.id}_${index}`}
              title={kpi.titulo}
              value={kpi.valor}
              subtitle={kpi.subtitulo}
              icon={kpi.icon}
              variant={kpi.variant}
              loading={isLoading}
            />
          ))
        ) : (
          [
            { id: 'total-sin-inspector', title: 'Total Sin Inspector', value: isLoading ? '...' : '0', subtitle: 'Centros con incidencias', icon: '⚠️', variant: 'neutral' as const },
            { id: 'fase1-sin-inspector', title: 'Fase 1 (1ª Inspección)', value: isLoading ? '...' : '0', subtitle: '0,0% del total', icon: '1️⃣', variant: 'neutral' as const },
            { id: 'fase2-sin-inspector', title: 'Fase 2 (Segundas)', value: isLoading ? '...' : '0', subtitle: '0,0% del total', icon: '2️⃣', variant: 'neutral' as const },
            { id: 'estaciones-afectadas', title: 'Estaciones Afectadas', value: isLoading ? '...' : '0', subtitle: 'Sin incidencias', icon: '🏢', variant: 'neutral' as const },
          ].map((kpi, index) => (
            <ReportKpiCard
              key={`${kpi.id}_${index}`}
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
              variant={kpi.variant}
              loading={isLoading}
            />
          ))
        )}
      </div>

      {/* 5. Gráfico de Estaciones Afectadas (Barras Ranking / Donut Cuota) */}
      {data && data.graficoEstaciones && data.graficoEstaciones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Vista del Gráfico:</span>
            <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                style={{
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: chartMode === 'bar' ? 700 : 500,
                  backgroundColor: chartMode === 'bar' ? '#0046ad' : '#ffffff',
                  color: chartMode === 'bar' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📊 Barras (Ranking)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('donut')}
                style={{
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: chartMode === 'donut' ? 700 : 500,
                  backgroundColor: chartMode === 'donut' ? '#0046ad' : '#ffffff',
                  color: chartMode === 'donut' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🍩 Cuota por Estación
              </button>
            </div>
          </div>

          {chartMode === 'bar' ? (
            <ReportBarChart
              title="Ranking de Estaciones con Inspecciones sin Inspector"
              subtitle="Centros ITV ordenados por volumen de inspecciones sin inspector registrado"
              data={data.graficoEstaciones}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            />
          ) : (
            <ReportDonutChart
              title="Distribución de Inspecciones sin Inspector por Estación"
              subtitle="Porcentaje de cuota sobre el total de incidencias registradas en la red analizada"
              data={data.graficoEstaciones}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            />
          )}
        </div>
      )}

      {/* 6. Tabla Detallada de Inspecciones */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por matrícula, estación, marca, modelo o tipo de vehículo..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={isLoading || isExporting || !hayDatosParaExportar}
        unidadRegistros="registros"
      >
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: '1100px',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
            }}
          >
            <colgroup>
              <col style={{ width: '105px' }} /> {/* Fecha */}
              <col style={{ width: '95px' }} />  {/* Matrícula */}
              <col style={{ width: '180px' }} /> {/* Estación */}
              <col style={{ width: '210px' }} /> {/* Vehículo */}
              <col style={{ width: '85px' }} />  {/* Motor */}
              <col style={{ width: '130px' }} /> {/* Tipo Inspección */}
              <col style={{ width: '80px' }} />  {/* Fase */}
              <col style={{ width: '140px' }} /> {/* Resultado */}
              <col style={{ width: '75px' }} />  {/* Detalle */}
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th
                  onClick={() => handleSort('fechaInspeccion')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Fecha <SortIndicator direction={sortColumn === 'fechaInspeccion' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('matricula')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Matrícula <SortIndicator direction={sortColumn === 'matricula' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('desEstacion')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Estación <SortIndicator direction={sortColumn === 'desEstacion' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('marca')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Vehículo <SortIndicator direction={sortColumn === 'marca' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('tipoMotor')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Motor <SortIndicator direction={sortColumn === 'tipoMotor' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('tipoInspeccion')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Tipo Insp. <SortIndicator direction={sortColumn === 'tipoInspeccion' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('fase')}
                  style={{ padding: '0.65rem 0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  Fase <SortIndicator direction={sortColumn === 'fase' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('textoResultado')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Resultado <SortIndicator direction={sortColumn === 'textoResultado' ? sortDirection : null} />
                </th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {filasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    {isLoading
                      ? 'Cargando inspecciones sin inspector...'
                      : filters.alertaRangoFechas
                        ? 'Indique un rango de fechas válido (máximo 1 año) para realizar la consulta.'
                        : 'No se encontraron inspecciones sin inspector para los criterios seleccionados.'}
                  </td>
                </tr>
              ) : (
                filasPaginadas.map((f, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={`${f.codInspeccion}_${idx}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#edf5ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isEven ? '#ffffff' : '#f8fafc';
                      }}
                    >
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        {f.fechaInspeccionFormatted}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', fontWeight: 700, color: '#002b49', fontFamily: 'monospace' }}>
                        {f.matricula}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <AppTooltip content={f.desEstacion} position="top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <TsBadge
                              size="sm"
                              variant={f.claveSociedad === 'CAL' ? 'success' : 'primary'}
                            >
                              {f.claveSociedad}
                            </TsBadge>
                            <span style={{ color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(f.desEstacion || '').replace('I.T.V. - ', '')}
                            </span>
                          </div>
                        </AppTooltip>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                        <AppTooltip content={`${f.marca || ''} ${f.modelo || ''}`.trim() || 'Sin datos'} position="top">
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            <span style={{ fontWeight: 600 }}>{f.marca || '-'}</span> {f.modelo || ''}
                          </span>
                        </AppTooltip>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: f.tipoMotor === 'Diésel' ? '#e0f2fe' : '#fef3c7',
                            color: f.tipoMotor === 'Diésel' ? '#0369a1' : '#b45309',
                          }}
                        >
                          {f.tipoMotor || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', color: '#334155', fontWeight: 500 }}>
                        {f.tipoInspeccion || '-'}
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {f.fase}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: f.resultado === '1' || f.resultado === '2' ? '#0f7b3f' : '#c81e1e',
                          }}
                        >
                          {f.textoResultado}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <AppTooltip content="Ver ficha técnica completa de la inspección" position="left">
                          <button
                            type="button"
                            onClick={() => setFilaSeleccionada(f)}
                            style={{
                              background: 'none',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: '3px 8px',
                              color: '#0046ad',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          >
                            🔍 Ficha
                          </button>
                        </AppTooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6.1 Barra de Paginación Reactiva */}
        {totalFilas > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ color: '#64748b' }}>
              Página <span style={{ fontWeight: 700, color: '#1e293b' }}>{page}</span> de{' '}
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{totalPaginas}</span> ({totalFilas} registros en total)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TsButton
                variant="secondary"
                size="small"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                « Primera
              </TsButton>
              <TsButton
                variant="secondary"
                size="small"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                ‹ Anterior
              </TsButton>
              <span style={{ margin: '0 6px', fontWeight: 600, color: '#0046ad' }}>
                {page} / {totalPaginas}
              </span>
              <TsButton
                variant="secondary"
                size="small"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPaginas}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                Siguiente ›
              </TsButton>
              <TsButton
                variant="secondary"
                size="small"
                onClick={() => setPage(totalPaginas)}
                disabled={page >= totalPaginas}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
              >
                Última »
              </TsButton>
            </div>
          </div>
        )}
      </ReportTableContainer>

      {/* 7. Modal Flotante de Ficha Técnica */}
      {filaSeleccionada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setFilaSeleccionada(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '650px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <h3 style={{ margin: 0, color: '#002b49', fontSize: '1.1rem', fontWeight: 800 }}>
                  Ficha de Inspección: {filaSeleccionada.matricula}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFilaSeleccionada(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Cód. Inspección:</span>
                <div style={{ fontWeight: 700, color: '#002b49', fontFamily: 'monospace' }}>{filaSeleccionada.codInspeccion}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Fecha y Hora:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.fechaInspeccionFormatted}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Estación ITV:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.desEstacion} ({filaSeleccionada.codEstacion})</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Sociedad:</span>
                <div>
                  <TsBadge size="sm" variant={filaSeleccionada.claveSociedad === 'CAL' ? 'success' : 'primary'}>
                    {filaSeleccionada.nombreEmpresa}
                  </TsBadge>
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Vehículo:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.marca} {filaSeleccionada.modelo}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Combustible / Motor:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.tipoMotor}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Tipo de Vehículo:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.tipoVehiculo}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Tipo de Inspección:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.tipoInspeccion}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Fase:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.fase}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Resultado:</span>
                <div style={{ fontWeight: 700, color: filaSeleccionada.resultado === '1' || filaSeleccionada.resultado === '2' ? '#0f7b3f' : '#c81e1e' }}>
                  {filaSeleccionada.textoResultado}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>C. Homologación:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.cHomologacion || '-'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Clasificación / MMA:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.clasificacion} / {filaSeleccionada.mma ? `${filaSeleccionada.mma} kg` : '-'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Kilometraje:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.kilometraje ? `${filaSeleccionada.kilometraje} km` : '-'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Incidencia de Control:</span>
                <div style={{ fontWeight: 700, color: '#c81e1e' }}>Sin inspectores asignados</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <TsButton variant="secondary" size="small" onClick={() => setFilaSeleccionada(null)}>
                Cerrar Ficha
              </TsButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
