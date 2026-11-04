import React, { useState } from 'react';
import { TsButton, TsBadge, TsAlert, TsIcon } from '@tuvsud/design-system/react';
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
  ReportPaginationBar,
} from '../components';
import { useCuponDescuentoReport } from '../hooks/useCuponDescuentoReport';
import type { FilaCuponDescuento } from '../types/informes.types';

export interface CuponDescuentoReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const CuponDescuentoReportPage: React.FC<CuponDescuentoReportPageProps> = ({
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
  } = useCuponDescuentoReport();

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
      {/* 0. Modales de carga bloqueantes corporativos */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Inspecciones con Cupón"
        message="Recuperando y analizando inspecciones con promociones y cupones de descuento aplicados..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando y preparando la descarga del libro oficial de cupones de descuento en Excel..."
      />

      {/* 1. Cabecera Oficial Estandarizada */}
      <ReportPageHeader
        title="Informe de Inspecciones con Cupón Descuento"
        subtitle="Auditoría técnica y control de liquidación de promociones y cupones de descuento aplicados en la red ITV"
        icon="confirmation_number"
        breadcrumbItemText="Cupones descuento"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          content="Descarga el informe oficial de inspecciones con cupón de descuento en formato Excel (.xlsx)"
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
              <TsIcon slot="prefix" name={isExporting ? "hourglass_empty" : "download"} />
            {isExporting ? 'Generando Excel...' : 'Exportar a Excel'}
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="cancel" style={{ fontSize: '15px' }} /><span>{error}</span></span>
        </TsAlert>
      )}

      {exportError && (
        <TsAlert
          variant="danger"
          open
          heading="Error de Exportación"
          style={{ fontSize: '0.88rem' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="cancel" style={{ fontSize: '15px' }} /><span>{exportError}</span></span>
        </TsAlert>
      )}

      {/* 4. Tarjetas KPIs Ejecutivas Permanentes */}
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
            { id: 'total-cupones', title: 'Inspecciones con Cupón', value: isLoading ? '...' : '0', subtitle: 'Centros con promociones', icon: 'confirmation_number', variant: 'neutral' as const },
            { id: 'total-descuento', title: 'Total Descuento Aplicado', value: isLoading ? '...' : '0,00 €', subtitle: 'Importe bonificado', icon: 'payments', variant: 'neutral' as const },
            { id: 'total-abonado', title: 'Importe Abonado en Caja', value: isLoading ? '...' : '0,00 €', subtitle: 'Ingreso neto percibido', icon: 'payments', variant: 'neutral' as const },
            { id: 'campana-lider', title: 'Campaña Más Utilizada', value: isLoading ? '...' : 'Sin datos', subtitle: 'Volumen promocional', icon: 'confirmation_number', variant: 'neutral' as const },
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

      {/* 5. Selector de Métricas Visuales (Barras Ranking / Donut Promociones) */}
      {data && (
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
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="bar_chart" style={{ fontSize: '15px' }} /><span>Barras (Ranking por Estación)</span></span></button>
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
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="pie_chart" style={{ fontSize: '15px' }} /><span>Cuota por Campaña de Promoción</span></span></button>
            </div>
          </div>

          {chartMode === 'bar' ? (
            <ReportBarChart
              title="Ranking de Cupones por Estación ITV"
              subtitle="Estaciones ordenadas por volumen de inspecciones con cupón descuento aplicado"
              data={data.graficoEstaciones}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            />
          ) : (
            <ReportDonutChart
              title="Distribución de Inspecciones por Campaña de Promoción"
              subtitle="Porcentaje de cuota de cada promoción comercial sobre el total de cupones canjeados"
              data={data.graficoPromociones}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            />
          )}
        </div>
      )}

      {/* 6. Tabla Detallada de Inspecciones con Cupón */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por matrícula, cupón, promoción, estación o marca..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={isLoading || isExporting || !hayDatosParaExportar}
        unidadRegistros="registros"
      >
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="cd-data-table"
            style={{
              width: '100%',
              minWidth: '1180px',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
            }}
          >
            <colgroup>
              <col style={{ width: '115px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '230px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '115px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '75px' }} />
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
                  onClick={() => handleSort('codCupon')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Cód. Cupón <SortIndicator direction={sortColumn === 'codCupon' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('promocion')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Promoción <SortIndicator direction={sortColumn === 'promocion' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('descuento')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}
                >
                  Descuento <SortIndicator direction={sortColumn === 'descuento' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('importeAbonado')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}
                >
                  Abonado <SortIndicator direction={sortColumn === 'importeAbonado' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('marca')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Vehículo <SortIndicator direction={sortColumn === 'marca' ? sortDirection : null} />
                </th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  Ficha
                </th>
              </tr>
            </thead>
            <tbody>
              {filasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    {isLoading
                      ? 'Cargando inspecciones con cupón descuento...'
                      : filters.alertaRangoFechas
                        ? 'Indique un rango de fechas válido (máximo 1 año) para realizar la consulta.'
                        : 'No se encontraron inspecciones con cupón descuento para los criterios seleccionados.'}
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
                              size="small"
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
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', fontFamily: 'monospace', color: '#0046ad', fontWeight: 600 }}>
                        {f.codCupon}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b', fontWeight: 500 }}>
                        <AppTooltip content={f.promocion} position="top">
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {f.promocion}
                          </span>
                        </AppTooltip>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 700, color: '#d97706', fontVariantNumeric: 'tabular-nums' }}>
                        {f.descuentoFormatted}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 700, color: '#0f7b3f', fontVariantNumeric: 'tabular-nums' }}>
                        {f.importeAbonadoFormatted}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                        <AppTooltip content={`${f.marca || ''} ${f.modelo || ''}`.trim() || 'Sin datos'} position="top">
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            <span style={{ fontWeight: 600 }}>{f.marca || '-'}</span> {f.modelo || ''}
                          </span>
                        </AppTooltip>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <AppTooltip content="Ver ficha técnica completa del cupón e inspección" position="left">
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
                          ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TsIcon name="search" style={{ fontSize: '13px' }} /><span>Ficha</span></span></button>
                        </AppTooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6.1 Barra de Paginación Reactiva Homogénea */}
        <ReportPaginationBar
          page={page}
          pageSize={pageSize}
          totalFilas={totalFilas}
          totalPaginas={totalPaginas}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          unidadRegistros="registros"
        />
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TsIcon name="confirmation_number" style={{ fontSize: '1.4rem', color: '#0046ad' }} />
                <h3 style={{ margin: 0, color: '#0b253b', fontSize: '1.1rem', fontWeight: 800 }}>
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
              ><TsIcon name="close" style={{ fontSize: '16px' }} /></button>
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
                <span style={{ color: '#64748b', fontWeight: 600 }}>Cód. Cupón:</span>
                <div style={{ fontWeight: 700, color: '#0046ad', fontFamily: 'monospace' }}>{filaSeleccionada.codCupon}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Promoción / Campaña:</span>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{filaSeleccionada.promocion}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Descuento Bonificado:</span>
                <div style={{ fontWeight: 700, color: '#d97706' }}>{filaSeleccionada.descuentoFormatted}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Importe Abonado en Caja:</span>
                <div style={{ fontWeight: 700, color: '#0f7b3f' }}>{filaSeleccionada.importeAbonadoFormatted}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Estación ITV:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.desEstacion} ({filaSeleccionada.codEstacion})</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Sociedad:</span>
                <div>
                  <TsBadge size="small" variant={filaSeleccionada.claveSociedad === 'CAL' ? 'success' : 'primary'}>
                    {filaSeleccionada.nombreEmpresa}
                  </TsBadge>
                </div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Vehículo:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.marca} {filaSeleccionada.modelo}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Motor / Combustible:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{filaSeleccionada.tipoMotor}</div>
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
