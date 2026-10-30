import React from 'react';
import {
  TsButton,
  TsAlert,
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsBadge,
} from '@tuvsud/design-system/react';
import { useDuracionPromedioReport } from '../hooks/useDuracionPromedioReport';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportDonutChart } from '../components/ReportDonutChart';
import { ReportTableContainer } from '../components/ReportTableContainer';
import { CrystalReportDuracionPromedioModal } from '../components/CrystalReportDuracionPromedioModal';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { SortIndicator } from '../../../components/common/SortIndicator';
import type { SortableDuracionPromedioColumn } from '../types/informes.types';

export interface DuracionPromedioReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const DuracionPromedioReportPage: React.FC<DuracionPromedioReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    estacionesPermitidas,
    fase,
    setFase,
    data,
    isLoading,
    error,
    setError,
    alertaRangoFechas,
    isExporting,
    exportError,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    chartMode,
    setChartMode,
    modalCrystalOpen,
    setModalCrystalOpen,
    estacionesFiltradas,
    kpisDinamicos,
    graficoRankingEstacionesDinamico,
    graficoTiposVehiculoDinamico,
    graficoCuotaTiposDinamico,
    graficoCuotaSociedadDinamico,
    handleFechaInicioChange,
    handleFechaFinChange,
    setSociedad,
    setEstacionesSeleccionadas,
    consultar,
    handleSort,
    exportarExcel,
  } = useDuracionPromedioReport();

  // Sumas y promedios totales para la fila resumen de la tabla
  const totalInspeccionesVisibles = estacionesFiltradas.reduce((acc, e) => acc + e.totalInspecciones, 0);
  const duracionPonderadaVisible = totalInspeccionesVisibles > 0
    ? estacionesFiltradas.reduce((acc, e) => acc + e.duracionPromedioMinutos * e.totalInspecciones, 0) / totalInspeccionesVisibles
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Miga de pan de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <TsBreadcrumb>
          <TsBreadcrumbItem onClick={onNavigateHome} style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}>
            Inicio
          </TsBreadcrumbItem>
          <TsBreadcrumbItem onClick={onNavigateToInformes} style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}>
            Informes
          </TsBreadcrumbItem>
          <TsBreadcrumbItem active>Duración Promedio de Inspecciones</TsBreadcrumbItem>
        </TsBreadcrumb>

        {onNavigateToInformes && (
          <TsButton variant="secondary" size="small" onClick={onNavigateToInformes} style={{ fontSize: '0.82rem' }}>
            ← Volver a Informes
          </TsButton>
        )}
      </div>

      {/* 2. Cabecera y Acciones Principales */}
      <div
        style={{
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.75rem' }}>⏱️</span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              Duración Promedio de Inspecciones Periódicas (001)
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
            Tiempos medios de proceso por estación y clasificación de vehículos según datos de producción centralizados.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <TsButton
            variant="secondary"
            size="medium"
            onClick={() => setModalCrystalOpen(true)}
            disabled={isLoading || estacionesFiltradas.length === 0}
            style={{ fontWeight: 600 }}
          >
            🖨️ Imprimir (Crystal Report)
          </TsButton>
          <TsButton
            variant="primary"
            size="medium"
            onClick={consultar}
            disabled={isLoading}
            loading={isLoading}
            style={{ fontWeight: 700 }}
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
        <TsAlert variant="warning" open heading="Incidencia de Exportación">
          <span>{exportError}</span>
        </TsAlert>
      )}

      {/* 4. Barra Horizontal de Filtros Oficial */}
      <ReportFiltersBar
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        sociedad={sociedad}
        estacionesSeleccionadas={estacionesSeleccionadas}
        estacionesPermitidas={estacionesPermitidas}
        fase={fase}
        onFaseChange={setFase}
        onFechaInicioChange={handleFechaInicioChange}
        onFechaFinChange={handleFechaFinChange}
        onSociedadChange={setSociedad}
        onEstacionesChange={setEstacionesSeleccionadas}
        onConsultar={consultar}
        loading={isLoading}
      />

      {/* 5. Tarjetas de KPIs Ejecutivos (Misma tipología y estilo corporativo) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {kpisDinamicos.map((kpi) => (
          <ReportKpiCard
            key={kpi.id}
            title={kpi.titulo}
            value={kpi.valor}
            subtitle={kpi.subtitulo}
            variant={kpi.variant}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* 6. Selector de Métricas Visuales (Barras Agilidad, Barras Tipos, Donut Cuota Tipos y Donut Sociedades) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Vista del Gráfico:</span>
          <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setChartMode('estaciones')}
              style={{
                border: 'none',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: chartMode === 'estaciones' ? 700 : 500,
                backgroundColor: chartMode === 'estaciones' ? '#0046ad' : '#ffffff',
                color: chartMode === 'estaciones' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📊 Ranking Agilidad (Menor a Mayor)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('tipos')}
              style={{
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: chartMode === 'tipos' ? 700 : 500,
                backgroundColor: chartMode === 'tipos' ? '#0046ad' : '#ffffff',
                color: chartMode === 'tipos' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🚗 Por Tipo de Vehículo
            </button>
            <button
              type="button"
              onClick={() => setChartMode('donut-tipos')}
              style={{
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: chartMode === 'donut-tipos' ? 700 : 500,
                backgroundColor: chartMode === 'donut-tipos' ? '#0046ad' : '#ffffff',
                color: chartMode === 'donut-tipos' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🍩 Cuota por Tipo (Donut)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('donut-sociedad')}
              style={{
                border: 'none',
                borderLeft: '1px solid #cbd5e1',
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: chartMode === 'donut-sociedad' ? 700 : 500,
                backgroundColor: chartMode === 'donut-sociedad' ? '#0046ad' : '#ffffff',
                color: chartMode === 'donut-sociedad' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🏢 Cuota Sociedades (Donut)
            </button>
          </div>
        </div>

        {chartMode === 'estaciones' && (
          <ReportBarChart
            title="Ranking de Agilidad por Estación ITV (Duración Media en Minutos)"
            subtitle="Ordenado de menor a mayor tiempo (mayor celeridad media de proceso en inspección periódica 001)"
            data={graficoRankingEstacionesDinamico}
            loading={isLoading}
            sortOrder="asc"
            emptyMessage={
              estacionesSeleccionadas.length === 0
                ? 'No hay estaciones seleccionadas en el filtro. Seleccione al menos una para visualizar el ranking.'
                : 'No hay datos de duración disponibles para las estaciones seleccionadas en este periodo.'
            }
          />
        )}

        {chartMode === 'tipos' && (
          <ReportBarChart
            title="Duración Media por Tipo de Vehículo (Clasificación Oficial MINER)"
            subtitle="Tiempos medios de proceso según categorías reglamentarias de vehículos"
            data={graficoTiposVehiculoDinamico}
            loading={isLoading}
            emptyMessage={
              estacionesSeleccionadas.length === 0
                ? 'No hay datos para representar. Seleccione al menos una estación.'
                : 'No hay datos de tipos de vehículos disponibles en este periodo.'
            }
          />
        )}

        {chartMode === 'donut-tipos' && (
          <ReportDonutChart
            title="Distribución de Inspecciones por Tipo de Vehículo"
            subtitle="Cuota porcentual de vehículos inspeccionados (001) según clasificación reglamentaria MINER"
            data={graficoCuotaTiposDinamico}
            loading={isLoading}
            valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            emptyMessage="No hay datos de inspecciones para mostrar en el gráfico circular."
          />
        )}

        {chartMode === 'donut-sociedad' && (
          <ReportDonutChart
            title="Distribución de Volumen por Sociedad (TÜV SÜD ATISAE vs TÜV SÜD CAL)"
            subtitle="Porcentaje de cuota de inspecciones periódicas analizadas entre ambas sociedades"
            data={graficoCuotaSociedadDinamico}
            loading={isLoading}
            valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            emptyMessage="No hay datos disponibles para mostrar la cuota de sociedades."
          />
        )}
      </div>

      {/* 7. Tabla Analítica con Búsqueda en Memoria y Exportación a Excel */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por código, estación, sociedad..."
        totalFilas={data?.resumenEstaciones.length || 0}
        filasVisibles={estacionesFiltradas.length}
        onExportExcel={exportarExcel}
        onOpenCrystalReport={() => setModalCrystalOpen(true)}
        isExporting={isExporting}
        exportDisabled={estacionesFiltradas.length === 0}
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
                color: '#ffffff',
                borderBottom: '2px solid #002d73',
              }}
            >
              <th
                onClick={() => handleSort('codEstacion')}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100px',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Código</span>
                  <SortIndicator direction={sortColumn === 'codEstacion' ? sortDirection : null} />
                </div>
              </th>

              <th
                onClick={() => handleSort('desEstacion')}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Estación ITV</span>
                  <SortIndicator direction={sortColumn === 'desEstacion' ? sortDirection : null} />
                </div>
              </th>

              <th
                onClick={() => handleSort('claveSociedad')}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '180px',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Sociedad</span>
                  <SortIndicator direction={sortColumn === 'claveSociedad' ? sortDirection : null} />
                </div>
              </th>

              <th
                onClick={() => handleSort('totalInspecciones')}
                style={{
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                  width: '180px',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <span>Inspecciones (001)</span>
                  <SortIndicator direction={sortColumn === 'totalInspecciones' ? sortDirection : null} />
                </div>
              </th>

              <th
                onClick={() => handleSort('duracionPromedioMinutos')}
                style={{
                  padding: '0.75rem 1.25rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right',
                  width: '200px',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <span>Duración Media</span>
                  <SortIndicator direction={sortColumn === 'duracionPromedioMinutos' ? sortDirection : null} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  Consultando base de datos centralizada de tiempos de inspección...
                </td>
              </tr>
            ) : estacionesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                  {estacionesSeleccionadas.length === 0 ? (
                    <div>
                      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>ℹ️</div>
                      <div style={{ fontWeight: 600, color: '#0b253b', marginBottom: '0.25rem' }}>
                        No hay estaciones seleccionadas en el filtro
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        Abra el desplegable "Estaciones" en la barra superior y marque las estaciones deseadas para ver sus duraciones.
                      </div>
                    </div>
                  ) : (
                    'No se han encontrado registros coincidentes con los filtros seleccionados.'
                  )}
                </td>
              </tr>
            ) : (
              estacionesFiltradas.map((est, idx) => {
                const isEven = idx % 2 === 1;
                return (
                  <tr
                    key={est.codEstacion}
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
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#0046ad',
                      }}
                    >
                      {est.codEstacion}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1a202c' }}>
                      {est.desEstacion}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <TsBadge
                        variant={
                          est.codEmpresa === '03' || est.claveSociedad === 'CAL'
                            ? 'success'
                            : 'primary'
                        }
                      >
                        {est.nombreEmpresa || (est.claveSociedad === 'CAL' ? 'TÜV SÜD CAL (CAL)' : 'TÜV SÜD ATISAE (TSA)')}
                      </TsBadge>
                    </td>
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: '#334155',
                      }}
                    >
                      {est.totalInspecciones.toLocaleString('es-ES')}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem 1.25rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: est.duracionPromedioMinutos > 30 ? '#b91c1c' : '#047857',
                        fontSize: '0.94rem',
                      }}
                    >
                      {est.duracionPromedioMinutos.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min ({est.duracionFormateada})
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {estacionesFiltradas.length > 0 && (
            <tfoot>
              <tr
                style={{
                  backgroundColor: '#f1f5f9',
                  borderTop: '2px solid #0046ad',
                  fontWeight: 800,
                  color: '#0b253b',
                }}
              >
                <td colSpan={3} style={{ padding: '0.85rem 1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total / Promedio Ponderado ({estacionesFiltradas.length} estaciones)
                </td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.98rem' }}>
                  {totalInspeccionesVisibles.toLocaleString('es-ES')}
                </td>
                <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.98rem', color: '#0046ad' }}>
                  {duracionPonderadaVisible.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </ReportTableContainer>

      {/* 8. Visor Modal Oficial Réplica 1:1 de Crystal Reports */}
      <CrystalReportDuracionPromedioModal
        isOpen={modalCrystalOpen}
        onClose={() => setModalCrystalOpen(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        fase={fase}
        filas={data?.filas || []}
        resumenEstaciones={estacionesFiltradas}
      />

      {/* Modal bloqueante mientras se consulta en BD */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando base de datos de producción de Central Datos..."
        message="Calculando duraciones promedio por vehículo y estación con índices optimizados en Oracle."
      />
    </div>
  );
};
