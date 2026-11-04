import React, { useMemo, useState } from 'react';
import {
  TsButton,
  TsCard,
  TsBadge,
  TsSpinner,
  TsIcon,
} from '@tuvsud/design-system/react';
import { ReportPageHeader } from '../components/ReportPageHeader';
import { ReportDateRangeAlert } from '../components/ReportDateRangeAlert';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportDonutChart } from '../components/ReportDonutChart';
import type { ReportBarChartPoint } from '../types/informes.types';
import { useEnviosRecordatoriosReport } from '../hooks/useEnviosRecordatoriosReport';

interface EnviosTotalesReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

/**
 * Pantalla 1: 'SMSs/EMAILs - Nº envíos totales'
 * Equivalente exacto a: frmCriterios.vb (Envios_Sms_Mail)
 * Muestra exclusivamente análisis estadístico y de gestión:
 * - 4 KPIs ejecutivos consolidados
 * - Gráficos completos de barras por estación con scroll sin truncar
 * - Gráficos circulares por plantilla y por canal
 * - Tabla agregada de totales por estación, canal y plantilla
 */
export const EnviosTotalesReportPage: React.FC<EnviosTotalesReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    filters,
    canal,
    setCanal,
    idPlantilla,
    setIdPlantilla,
    busqueda,
    setBusqueda,
    plantillas,
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFilas,
    sortField,
    sortAsc,
    handleSort,
    filasPaginadas,
    handleConsultar,
    handleExportarExcel,
  } = useEnviosRecordatoriosReport('resumen');

  const [chartMode, setChartMode] = useState<'split' | 'bar' | 'donut-plantilla' | 'donut-canal'>('split');

  // Adaptador para Gráfico de Barras: TODAS las estaciones con scroll continuo (sin truncamiento ni Top 8)
  const barDataEstaciones: ReportBarChartPoint[] = useMemo(() => {
    if (!data?.graficoPorEstacion || data.graficoPorEstacion.length === 0) return [];
    return data.graficoPorEstacion.map((p) => {
      const isCal = p.categoria.startsWith('09') || p.label.includes('CAL');
      return {
        id: p.categoria || p.label,
        label: p.label,
        valor: p.total,
        valorFormateado: `${p.total.toLocaleString('es-ES')} envíos`,
        sociedad: isCal ? 'CAL' : 'TSA',
        color: isCal ? '#00875a' : '#0046ad',
      };
    });
  }, [data?.graficoPorEstacion]);

  // Adaptador para Gráfico Circular por Plantilla de Recordatorio
  const donutDataPlantillas: ReportBarChartPoint[] = useMemo(() => {
    if (!data?.graficoPorPlantilla || data.graficoPorPlantilla.length === 0) return [];
    return data.graficoPorPlantilla.map((p) => ({
      id: p.label,
      label: p.label,
      valor: p.total,
      valorFormateado: `${p.total.toLocaleString('es-ES')} envíos`,
    }));
  }, [data?.graficoPorPlantilla]);

  // Adaptador para Gráfico Circular por Canal (SMS vs Email)
  const donutDataCanal: ReportBarChartPoint[] = useMemo(() => {
    if (!data?.graficoPorCanal || data.graficoPorCanal.length === 0) return [];
    return data.graficoPorCanal.map((p) => ({
      id: p.label,
      label: p.label,
      valor: p.total,
      valorFormateado: `${p.total.toLocaleString('es-ES')} envíos`,
    }));
  }, [data?.graficoPorCanal]);

  // Desglose de plantillas activas con volumen para el tooltip interactivo del KPI
  const tooltipItemsPlantillas = useMemo(() => {
    if (!data?.graficoPorPlantilla || data.graficoPorPlantilla.length === 0) return undefined;
    return data.graficoPorPlantilla
      .map((p) => ({
        nombre: p.label,
        valor: `${p.total.toLocaleString('es-ES')} envíos`,
      }))
      .sort((a, b) => b.valor.localeCompare(a.valor, undefined, { numeric: true }));
  }, [data?.graficoPorPlantilla]);

  const kpis = data?.kpis;
  const hayDatosParaExportar = (data?.filasResumen && data.filasResumen.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Cabecera Corporativa del Informe */}
      <ReportPageHeader
        title="SMSs/EMAILs — Nº Envíos Totales"
        subtitle="Resumen analítico consolidado de comunicaciones enviadas a clientes agrupadas por estación, canal y plantilla (frmCriterios - Envios_Sms_Mail)."
        breadcrumbItemText="SMSs/EMAILs Totales"
        icon="leaderboard"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          content={
            hayDatosParaExportar
              ? 'Descargar informe analítico multi-hoja en formato Excel (.xlsx)'
              : 'Consulte primero para habilitar la exportación'
          }
          position="bottom"
        >
          <span>
            <TsButton
              variant="primary"
              onClick={handleExportarExcel}
              disabled={!hayDatosParaExportar || isExporting}
            >
              <TsIcon slot="prefix" name={isExporting ? 'hourglass_empty' : 'download'} />
              {isExporting ? 'Generando Excel...' : 'Exportar a Excel'}
            </TsButton>
          </span>
        </AppTooltip>
      </ReportPageHeader>

      {/* 2. Alertas de validación de fechas o errores */}
      <ReportDateRangeAlert
        mensaje={filters.alertaRangoFechas}
        onAjustarAUnAno={filters.ajustarAUnAno}
      />

      {error && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TsIcon name="warning" size={18} style={{ color: '#b91c1c' }} />
          <span>{error}</span>
        </div>
      )}

      {exportError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.88rem',
          }}
        >
          {exportError}
        </div>
      )}

      {/* 3. Barra de Filtros Primaria */}
      <ReportFiltersBar
        fechaInicio={filters.fechaInicio}
        fechaFin={filters.fechaFin}
        sociedad={filters.sociedad}
        estacionesSeleccionadas={filters.estacionesSeleccionadas}
        estacionesPermitidas={filters.estacionesPermitidas}
        onFechaInicioChange={filters.handleFechaInicioChange}
        onFechaFinChange={filters.handleFechaFinChange}
        onSociedadChange={filters.setSociedad}
        onEstacionesChange={filters.setEstacionesSeleccionadas}
        onConsultar={handleConsultar}
        loading={isLoading}
      />

      {/* 4. Panel de Filtros Específicos: Canal y Plantilla */}
      <TsCard style={{ padding: '14px 20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Selector de Canal: TODOS, SMS, EMAIL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Canal:</span>
            <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setCanal('TODOS')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: canal === 'TODOS' ? '#0046ad' : '#ffffff',
                  color: canal === 'TODOS' ? '#ffffff' : '#334155',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCanal('SMS')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: canal === 'SMS' ? '#0046ad' : '#ffffff',
                  color: canal === 'SMS' ? '#ffffff' : '#334155',
                  transition: 'background-color 0.15s ease',
                }}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => setCanal('EMAIL')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: canal === 'EMAIL' ? '#0046ad' : '#ffffff',
                  color: canal === 'EMAIL' ? '#ffffff' : '#334155',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Email
              </button>
            </div>
          </div>

          {/* Selector de Plantilla */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Plantilla:</span>
            <select
              value={idPlantilla ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setIdPlantilla(val);
              }}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                minWidth: '240px',
              }}
            >
              <option value="">-- Todas las plantillas --</option>
              {plantillas
                .filter((p) => canal === 'TODOS' || p.canal.toUpperCase() === canal)
                .map((p) => (
                  <option key={`${p.canal}-${p.idTipo}`} value={p.idTipo}>
                    [{p.canal}] #{p.idTipo} — {p.descripcion}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </TsCard>

      {/* 5. Tarjetas de KPIs Principales */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <ReportKpiCard
          title="Total Envíos Globales"
          value={kpis ? kpis.totalGlobal.toLocaleString('es-ES') : '—'}
          subtitle={`${kpis?.estacionesActivas ?? 0} estaciones con envíos`}
          icon="sms"
          variant="primary"
        />
        <ReportKpiCard
          title="Total SMS Enviados"
          value={kpis ? kpis.totalSms.toLocaleString('es-ES') : '—'}
          subtitle={kpis && kpis.totalGlobal > 0 ? `${((kpis.totalSms / kpis.totalGlobal) * 100).toFixed(1)}% del total` : 'Canal SMS'}
          icon="chat"
          variant="success"
        />
        <ReportKpiCard
          title="Total Emails Enviados"
          value={kpis ? kpis.totalEmail.toLocaleString('es-ES') : '—'}
          subtitle={kpis && kpis.totalGlobal > 0 ? `${((kpis.totalEmail / kpis.totalGlobal) * 100).toFixed(1)}% del total` : 'Canal Email'}
          icon="mail"
          variant="neutral"
        />
        <ReportKpiCard
          title="Plantilla Más Utilizada"
          value={kpis?.plantillaLider || '—'}
          subtitle={`${kpis?.totalPlantillas ?? 0} plantillas activas`}
          icon="description"
          variant="warning"
          tooltipSubtitle="Número de plantillas diferentes que han emitido mensajes en las fechas seleccionadas:"
          tooltipItems={tooltipItemsPlantillas}
        />
      </div>

      {/* 6. Sección de Gráficos */}
      {data && (barDataEstaciones.length > 0 || donutDataPlantillas.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '0.5rem 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0046ad' }}>
                Análisis Gráfico de Envíos:
              </span>
              <TsBadge variant="neutral">
                {barDataEstaciones.length} estaciones con actividad
              </TsBadge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Modo Gráfico:</span>
              <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setChartMode('split')}
                  title="Vista dividida: Barras de estaciones a la izquierda y Circular de cuotas a la derecha"
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: chartMode === 'split' ? 700 : 500,
                    backgroundColor: chartMode === 'split' ? '#0046ad' : '#ffffff',
                    color: chartMode === 'split' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TsIcon name="leaderboard" size={15} />
                  <span>Dividida (Barras + Circular)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('bar')}
                  title="Ver únicamente gráfico de barras verticales de todas las estaciones con scroll"
                  style={{
                    border: 'none',
                    borderLeft: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: chartMode === 'bar' ? 700 : 500,
                    backgroundColor: chartMode === 'bar' ? '#0046ad' : '#ffffff',
                    color: chartMode === 'bar' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TsIcon name="bar_chart" size={15} />
                  <span>Todas las Estaciones (Barras con Scroll)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('donut-plantilla')}
                  title="Distribución porcentual por Tipo de Plantilla de Recordatorio"
                  style={{
                    border: 'none',
                    borderLeft: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: chartMode === 'donut-plantilla' ? 700 : 500,
                    backgroundColor: chartMode === 'donut-plantilla' ? '#0046ad' : '#ffffff',
                    color: chartMode === 'donut-plantilla' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TsIcon name="pie_chart" size={15} />
                  <span>Circular por Plantilla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('donut-canal')}
                  title="Distribución global entre envíos SMS y Email"
                  style={{
                    border: 'none',
                    borderLeft: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: chartMode === 'donut-canal' ? 700 : 500,
                    backgroundColor: chartMode === 'donut-canal' ? '#0046ad' : '#ffffff',
                    color: chartMode === 'donut-canal' ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <TsIcon name="tune" size={15} />
                  <span>Circular por Canal</span>
                </button>
              </div>
            </div>
          </div>

          {chartMode === 'split' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))',
                gap: '1rem',
                alignItems: 'stretch',
              }}
            >
              <ReportBarChart
                title="Volumen de Envíos por Estación ITV"
                subtitle="Todas las estaciones con comunicaciones enviadas (desplace el scroll para ver la lista completa)"
                data={barDataEstaciones}
                height={400}
                badgeUnit="estaciones"
                sortOrder="desc"
                showLegend={true}
              />
              <ReportDonutChart
                title="Distribución por Plantilla de Recordatorio"
                subtitle="Cuotas porcentuales sobre el total de comunicaciones emitidas"
                data={donutDataPlantillas}
                maxSlices={10}
              />
            </div>
          )}

          {chartMode === 'bar' && (
            <ReportBarChart
              title="Volumen de Envíos por Estación ITV (Red Completa)"
              subtitle="Todas las estaciones de la red con actividad en el rango seleccionado (con scroll vertical continuo)"
              data={barDataEstaciones}
              height={480}
              badgeUnit="estaciones"
              sortOrder="desc"
              showLegend={true}
            />
          )}

          {chartMode === 'donut-plantilla' && (
            <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
              <ReportDonutChart
                title="Distribución por Tipo de Plantilla de Recordatorio"
                subtitle="Cuotas porcentuales sobre el total de recordatorios remitidos"
                data={donutDataPlantillas}
                maxSlices={12}
              />
            </div>
          )}

          {chartMode === 'donut-canal' && (
            <div style={{ maxWidth: '850px', margin: '0 auto', width: '100%' }}>
              <ReportDonutChart
                title="Distribución por Canal de Comunicación"
                subtitle="Comparativa de volumen entre SMS y Email"
                data={donutDataCanal}
                maxSlices={2}
              />
            </div>
          )}
        </div>
      )}

      {/* 7. Tabla Analítica Agregada de Totales */}
      <TsCard style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                width: '100%',
                maxWidth: '420px',
              }}
            >
              <TsIcon name="search" size={18} style={{ color: '#64748b' }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por estación o plantilla..."
                className="cd-report-search-input"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  backgroundColor: 'transparent',
                }}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                  }}
                >
                  <TsIcon name="close" size={16} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
              Mostrando {totalFilas.toLocaleString('es-ES')} registro{totalFilas !== 1 ? 's' : ''}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <option value="15">15 por pág.</option>
              <option value="25">25 por pág.</option>
              <option value="50">50 por pág.</option>
              <option value="100">100 por pág.</option>
            </select>
          </div>
        </div>

        {/* Contenido de la Tabla */}
        {isLoading ? (
          <div
            style={{
              padding: '3rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: '#64748b',
            }}
          >
            <TsSpinner size="large" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Consultando resumen de envíos...</span>
          </div>
        ) : totalFilas === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
            }}
          >
            <TsIcon name="leaderboard" size={40} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#334155', fontWeight: 600 }}>No se encontraron registros de totales</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Intente ampliar el rango de fechas o seleccionar otro canal o estación.
            </p>
          </div>
        ) : (
          <div className="cd-touch-scroll" style={{ overflowX: 'auto' }}>
            <table className="cd-data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr>
                  <th className="cd-table-th" onClick={() => handleSort('codigoEstacion')} style={{ padding: '10px 14px', textAlign: 'left', color: '#ffffff', fontWeight: 700 }}>
                    Cód. {sortField === 'codigoEstacion' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('nombreEstacion')} style={{ padding: '10px 14px', textAlign: 'left', color: '#ffffff', fontWeight: 700 }}>
                    Estación ITV {sortField === 'nombreEstacion' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('canal')} style={{ padding: '10px 14px', textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>
                    Canal {sortField === 'canal' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('idPlantilla')} style={{ padding: '10px 14px', textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>
                    ID Tipo {sortField === 'idPlantilla' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('descripcionPlantilla')} style={{ padding: '10px 14px', textAlign: 'left', color: '#ffffff', fontWeight: 700 }}>
                    Plantilla {sortField === 'descripcionPlantilla' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('fechaEnvio')} style={{ padding: '10px 14px', textAlign: 'center', color: '#ffffff', fontWeight: 700 }}>
                    Fecha Envío {sortField === 'fechaEnvio' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('totalEnviados')} style={{ padding: '10px 14px', textAlign: 'right', color: '#ffffff', fontWeight: 700 }}>
                    Total Envíos {sortField === 'totalEnviados' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(filasPaginadas as any[]).map((row, idx) => (
                  <tr key={`${row.codigoEstacion}-${row.canal}-${row.idPlantilla}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                      {row.codigoEstacion}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0b253b' }}>
                      {row.nombreEstacion}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <TsBadge variant={row.canal === 'SMS' ? 'primary' : 'neutral'}>
                        {row.canal}
                      </TsBadge>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>
                      #{row.idPlantilla}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                      {row.descripcionPlantilla}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>
                      {new Date(row.fechaEnvio).toLocaleDateString('es-ES')}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0046ad' }}>
                      {row.totalEnviados.toLocaleString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalFilas > pageSize && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Página {page} de {totalPages} ({totalFilas.toLocaleString('es-ES')} totales)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: page === 1 ? '#f1f5f9' : '#ffffff',
                  color: page === 1 ? '#94a3b8' : '#334155',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                ◀ Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: page === totalPages ? '#f1f5f9' : '#ffffff',
                  color: page === totalPages ? '#94a3b8' : '#334155',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </TsCard>

      {/* Modal Bloqueante Durante Carga */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Datos de Producción Oracle"
        message="Cargando estadísticas consolidadas y agregados de envíos de recordatorios..."
      />
    </div>
  );
};
