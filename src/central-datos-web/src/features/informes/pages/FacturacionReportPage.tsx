import React, { useState, useMemo } from 'react';
import {
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsButton,
  TsBadge,
  TsAlert,
  TsSpinner,
} from '@tuvsud/design-system/react';
import {
  ReportFiltersBar,
  ReportBarChart,
  ReportDonutChart,
  ReportLoadingModal,
  ReportTableContainer,
  ReportKpiCard,
  SortIndicator,
  CrystalReportPreviewModal,
} from '../components';
import { useFacturacionReport, SortableColumn } from '../hooks/useFacturacionReport';

export interface FacturacionReportPageProps {
  onNavigateHome: () => void;
  onNavigateToInformes?: () => void;
}

export const FacturacionReportPage: React.FC<FacturacionReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    handleFechaInicioChange,
    handleFechaFinChange,
    setSociedad,
    setEstacionesSeleccionadas,
    consultar,
    alertaRangoFechas,
    data,
    isLoading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    filasFiltradas,
    totalesVisibles,
    chartMode,
    setChartMode,
    graficoPuntos,
    exportarExcel,
    isExporting,
    exportError,
    setExportError,
  } = useFacturacionReport();

  const [modalCrystalOpen, setModalCrystalOpen] = useState<boolean>(false);

  // Estación líder real con máxima facturación (excluye estaciones con 0 €)
  const estacionTop = useMemo(() => {
    if (!filasFiltradas || filasFiltradas.length === 0) return null;
    const conIngresos = filasFiltradas.filter((f) => f.totalIngresos > 0);
    if (conIngresos.length === 0) return null;
    return [...conIngresos].sort((a, b) => b.totalIngresos - a.totalIngresos)[0];
  }, [filasFiltradas]);

  const renderTh = (
    column: SortableColumn,
    label: string,
    width?: string,
    alignRight = false
  ) => {
    const isSorted = sortColumn === column;
    const direction = isSorted ? sortDirection : null;

    return (
      <th
        className={`cd-table-th ${isSorted ? 'cd-table-th-active' : ''}`}
        onClick={() => handleSort(column)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort(column);
          }
        }}
        tabIndex={0}
        role="columnheader"
        aria-sort={
          isSorted
            ? sortDirection === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none'
        }
        style={{
          padding: '0.85rem 1rem',
          textAlign: alignRight ? 'right' : 'left',
          width,
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isSorted ? '#003580' : 'transparent',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: alignRight ? 'flex-end' : 'flex-start',
            width: '100%',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</span>
          <SortIndicator direction={direction} />
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 0. Modal de bloqueo para carga y exportación unificada */}
      <ReportLoadingModal
        isOpen={isLoading}
        title="Consultando Central Datos"
        message="Por favor, espere mientras se calculan las métricas y los rankings de facturación..."
      />

      <ReportLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando y descargando el archivo oficial de facturación con codificación UTF-8..."
      />

      {/* 1. Miga de pan de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <TsBreadcrumb>
          <TsBreadcrumbItem onClick={onNavigateHome} style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}>
            Inicio
          </TsBreadcrumbItem>
          <TsBreadcrumbItem
            onClick={onNavigateToInformes || onNavigateHome}
            style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}
          >
            Informes
          </TsBreadcrumbItem>
          <TsBreadcrumbItem active>Facturación de Inspecciones</TsBreadcrumbItem>
        </TsBreadcrumb>

        <TsButton
          variant="secondary"
          size="small"
          onClick={onNavigateToInformes || onNavigateHome}
          style={{ fontSize: '0.82rem' }}
        >
          ← Volver a Informes
        </TsButton>
      </div>

      {/* 2. Cabecera del Módulo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.75rem' }}>💶</span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              Informe Facturación de Inspecciones
            </h1>
            <TsBadge variant="primary" style={{ fontWeight: 600 }}>
              Oficial
            </TsBadge>
          </div>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              color: '#64748b',
              fontSize: '0.86rem',
              lineHeight: 1.4,
            }}
          >
            Liquidación consolidada y desglose de tarifas, suplementos y descuentos por estación de la red ITV.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <TsButton
            variant="secondary"
            size="medium"
            onClick={() => setModalCrystalOpen(true)}
            disabled={isLoading || filasFiltradas.length === 0}
            style={{ fontWeight: 600 }}
          >
            🖨️ Imprimir (Crystal Report)
          </TsButton>
          <TsButton
            variant="secondary"
            size="medium"
            onClick={consultar}
            disabled={isLoading}
            loading={isLoading}
          >
            🔄 Actualizar Datos
          </TsButton>
        </div>
      </div>

      {/* 3. Alertas de Validación y Error */}
      {alertaRangoFechas && (
        <TsAlert variant="warning" open heading="Validación de Rango de Fechas">
          <span>⚠️ {alertaRangoFechas}</span>
        </TsAlert>
      )}

      {error && !alertaRangoFechas && (
        <TsAlert variant="danger" open heading="Incidencia de Consulta">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
            <span>{error}</span>
            <TsButton variant="secondary" size="small" onClick={() => { setError(null); consultar(); }}>
              Reintentar
            </TsButton>
          </div>
        </TsAlert>
      )}

      {exportError && (
        <TsAlert
          variant="warning"
          open
          closable
          onTsAfterHide={() => setExportError(null)}
          heading="Exportación no disponible"
        >
          <span>⚠️ {exportError}</span>
        </TsAlert>
      )}

      {/* 4. Barra Unificada de Filtros (Fechas + Sociedad + Selector Estaciones + Botón Consultar) */}
      <ReportFiltersBar
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        sociedad={sociedad}
        estacionesSeleccionadas={estacionesSeleccionadas}
        onFechaInicioChange={handleFechaInicioChange}
        onFechaFinChange={handleFechaFinChange}
        onSociedadChange={setSociedad}
        onEstacionesChange={setEstacionesSeleccionadas}
        onConsultar={consultar}
        loading={isLoading}
      />

      {/* 5. Cuadro de Mandos: Tarjetas KPI Interactivas y Sincronizadas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '1rem',
        }}
      >
        {isLoading && !data ? (
          <>
            <ReportKpiCard title="Total Facturación" value="---" loading />
            <ReportKpiCard title="Inspecciones Totales" value="---" loading />
            <ReportKpiCard title="Ticket Medio Global" value="---" loading />
            <ReportKpiCard title="Estaciones Analizadas" value="---" loading />
          </>
        ) : (
          <>
            <ReportKpiCard
              title="Facturación Neta Total"
              value={totalesVisibles.totalFacturacionFormatted}
              subtitle={`${totalesVisibles.totalEstaciones} estaciones ${sociedad === 'TODAS' ? 'analizadas' : `(${sociedad})`}`}
              variant="primary"
              icon="💰"
            />
            <ReportKpiCard
              title="Total Inspecciones"
              value={totalesVisibles.totalInspecciones.toLocaleString('es-ES')}
              subtitle="Inspecciones válidas no anuladas"
              variant="neutral"
              icon="🚗"
            />
            <ReportKpiCard
              title="Ticket Medio / Inspección"
              value={totalesVisibles.ticketMedioGlobalFormatted}
              subtitle="Promedio en estaciones visibles"
              variant="neutral"
              icon="📊"
            />
            <ReportKpiCard
              title="Estación Mayor Facturación"
              value={estacionTop ? estacionTop.desEstacion.replace('I.T.V. - ', '') : 'Sin datos'}
              subtitle={estacionTop ? estacionTop.totalIngresosFormatted : '0,00 €'}
              variant="success"
              icon="🏆"
            />
          </>
        )}
      </div>

      {/* 6. Selector de Visualización y Gráfico (Barras Ranking / Donut Cuota %) */}
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
              🍩 Circular (Cuota %)
            </button>
          </div>
        </div>

        {chartMode === 'bar' ? (
          <ReportBarChart
            title="Ranking de Facturación por Estación ITV"
            subtitle="Distribución de facturación acumulada (€) en las estaciones seleccionadas"
            data={graficoPuntos}
            loading={isLoading}
            valueFormatter={(val) =>
              val.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })
            }
          />
        ) : (
          <ReportDonutChart
            title="Distribución de Cuota de Facturación"
            subtitle="Porcentaje de cuota de ingresos de cada estación sobre el total analizado"
            data={graficoPuntos}
            loading={isLoading}
            valueFormatter={(val) =>
              val.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })
            }
          />
        )}
      </div>

      {/* 7. Tabla Detallada con Búsqueda en Memoria y Exportación a Excel */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por estación, código, empresa o sociedad..."
        totalFilas={data?.filas.length || 0}
        filasVisibles={filasFiltradas.length}
        onExportExcel={exportarExcel}
        onOpenCrystalReport={() => setModalCrystalOpen(true)}
        isExporting={isExporting}
        exportDisabled={filasFiltradas.length === 0}
      >
        <table
          style={{
            width: '100%',
            minWidth: '780px',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontFamily: 'var(--ts-font-family-sans, system-ui)',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--ts-table-header-bg, #0046ad)',
                borderBottom: '2px solid #002d73',
                color: '#ffffff',
              }}
            >
              {renderTh('codEstacion', 'Código', '100px')}
              {renderTh('desEstacion', 'Estación ITV')}
              {renderTh('nombreEmpresa', 'Sociedad', '185px')}
              {renderTh('totalInspecciones', 'Inspecciones', '160px', true)}
              {renderTh('totalIngresos', 'Facturación Total', '180px', true)}
              {renderTh('ticketMedio', 'Ticket Medio', '150px', true)}
            </tr>
          </thead>
          <tbody>
            {isLoading && !data ? (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <TsSpinner size="medium" />
                    <span>Calculando informe de facturación en Central Datos...</span>
                  </div>
                </td>
              </tr>
            ) : filasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: 700, color: '#0b253b', fontSize: '1rem' }}>
                    No se encontraron registros de facturación
                  </div>
                  <div style={{ fontSize: '0.84rem', marginTop: '6px', color: '#64748b' }}>
                    {searchTerm.trim() !== ''
                      ? `No hay coincidencias para el texto "${searchTerm}". Pruebe borrando el texto de búsqueda.`
                      : 'Pruebe ajustando el rango de fechas (máximo 1 año) o cambiando el selector de sociedad.'}
                  </div>
                </td>
              </tr>
            ) : (
              filasFiltradas.map((fila, index) => {
                const isEven = index % 2 === 1;
                const isTsa = fila.claveSociedad === 'TSA';

                return (
                  <tr
                    key={fila.codEstacion}
                    style={{
                      backgroundColor: isEven ? '#f8fafc' : '#ffffff',
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#edf5ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isEven ? '#f8fafc' : '#ffffff';
                    }}
                  >
                    {/* Código */}
                    <td
                      className="cd-table-td"
                      style={{
                        padding: '0.75rem 1rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: '#0046ad',
                        borderRight: '1px solid #edf2f7',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fila.codEstacion}
                    </td>

                    {/* Descripción de Estación */}
                    <td className="cd-table-td" style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0b253b' }}>
                      {fila.desEstacion}
                    </td>

                    {/* Sociedad (Unificada según diseño corporativo oficial: TÜV SÜD ATISAE (TSA) / TÜV SÜD CAL (CAL)) */}
                    <td className="cd-table-td" style={{ padding: '0.75rem 1rem' }}>
                      <TsBadge
                        variant={
                          fila.codEmpresa === '03' || fila.claveSociedad === 'CAL'
                            ? 'success'
                            : 'primary'
                        }
                      >
                        {fila.nombreEmpresa || (isTsa ? 'TÜV SÜD ATISAE (TSA)' : 'TÜV SÜD CAL (CAL)')}
                      </TsBadge>
                    </td>

                    {/* Total Inspecciones */}
                    <td
                      className="cd-table-td"
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#0b253b',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fila.totalInspecciones.toLocaleString('es-ES')}
                    </td>

                    {/* Total Ingresos */}
                    <td
                      className="cd-table-td"
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'right',
                        fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#0046ad',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fila.totalIngresosFormatted}
                    </td>

                    {/* Ticket Medio */}
                    <td
                      className="cd-table-td"
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: '#475569',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fila.ticketMedioFormatted}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Pie de tabla con totales consolidados dinámicos (Se oculta o limpia a 0 si la búsqueda no encuentra nada) */}
          {filasFiltradas.length > 0 && (
            <tfoot>
              <tr
                style={{
                  backgroundColor: '#f1f5f9',
                  borderTop: '2px solid #cbd5e1',
                  fontWeight: 800,
                  color: '#0b253b',
                  fontSize: '0.92rem',
                }}
              >
                <td style={{ padding: '0.85rem 1rem' }} colSpan={2}>
                  TOTALES VISIBLES ({totalesVisibles.totalEstaciones} ESTACIONES)
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <TsBadge variant="neutral">{sociedad}</TsBadge>
                </td>
                <td
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1rem',
                    color: '#00875a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {totalesVisibles.totalInspecciones.toLocaleString('es-ES')}
                </td>
                <td
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '1.05rem',
                    color: '#0046ad',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {totalesVisibles.totalFacturacionFormatted}
                </td>
                <td
                  style={{
                    padding: '0.85rem 1rem',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.95rem',
                    color: '#334155',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {totalesVisibles.ticketMedioGlobalFormatted}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </ReportTableContainer>

      {/* 8. Modal Réplica Oficial SAP Crystal Reports (rptResumenInspecciones) */}
      <CrystalReportPreviewModal
        isOpen={modalCrystalOpen}
        onClose={() => setModalCrystalOpen(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        filas={filasFiltradas}
      />
    </div>
  );
};
