import React, { useState, useMemo } from 'react';
import { TsButton, TsBadge, TsIcon } from '@tuvsud/design-system/react';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { SortIndicator } from '../../../components/common/SortIndicator';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import {
  ReportPageHeader,
  ReportTableContainer,
  ReportBarChart,
  ReportPaginationBar,
} from '../components';
import { useFacturacionComparativaReport } from '../hooks/useFacturacionComparativaReport';
import type { SortableFacturacionComparativaColumn, ReportBarChartPoint } from '../types/informes.types';

export interface FacturacionComparativaReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const FacturacionComparativaReportPage: React.FC<FacturacionComparativaReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    fechaInicioR1,
    setFechaInicioR1,
    fechaFinR1,
    setFechaFinR1,
    fechaInicioR2,
    setFechaInicioR2,
    fechaFinR2,
    setFechaFinR2,
    sociedad,
    setSociedad,
    consultar,
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPaginas,
    filasFiltradas,
    filasPaginadas,
    exportarExcel,
  } = useFacturacionComparativaReport();

  const [mostrarGrafico, setMostrarGrafico] = useState<boolean>(true);
  const [metricaGrafico, setMetricaGrafico] = useState<'ingresos' | 'inspecciones' | 'variacion'>('ingresos');
  const hayDatosParaExportar = Boolean(data && data.filas && data.filas.length > 0);

  // Años para las etiquetas contextuales
  const anyoR1 = fechaInicioR1 ? fechaInicioR1.slice(0, 4) : 'P1';
  const anyoR2 = fechaInicioR2 ? fechaInicioR2.slice(0, 4) : 'P2';

  // Preparar puntos para el gráfico corporativo según métrica
  const puntosGrafico: ReportBarChartPoint[] = (data?.graficoEstaciones || []).map((g) => {
    let val = g.ingresos2;
    let formatted = g.ingresos2Formatted;
    let tooltip = (g.porcentajeVariacionIngresos >= 0 ? '+' : '') + g.porcentajeVariacionIngresos.toFixed(1) + ` % vs ${anyoR1}`;

    if (metricaGrafico === 'inspecciones') {
      val = g.inspecciones2;
      formatted = `${g.inspecciones2.toLocaleString('es-ES')} insp.`;
    } else if (metricaGrafico === 'variacion') {
      val = g.porcentajeVariacionIngresos;
      formatted = (g.porcentajeVariacionIngresos >= 0 ? '+' : '') + g.porcentajeVariacionIngresos.toFixed(1) + ' %';
      tooltip = `Ingresos ${anyoR2}: ${g.ingresos2Formatted} | Ingresos ${anyoR1}: ${g.ingresos1Formatted}`;
    }

    const cod = (g.codEstacion || '').trim().padStart(4, '0');
    const esCal = cod.startsWith('09') || ['0902', '0903', '0906', '0908'].includes(cod);
    const soc = esCal ? 'CAL' : 'TSA';

    return {
      id: g.codEstacion,
      label: g.estacionNombre,
      valor: val,
      valorFormateado: formatted,
      sociedad: soc,
      tooltipSubtitle: tooltip,
    };
  });

  // Subtotales de pie de tabla: TSA, CAL y TOTAL GLOBAL (réplica exacta del Excel)
  const subtotales = useMemo(() => {
    const calcularGrupo = (filas: typeof filasFiltradas) => {
      const totIng1 = filas.reduce((acc, f) => acc + f.totalIngresos1, 0);
      const totInsp1 = filas.reduce((acc, f) => acc + f.totalInspecciones1, 0);
      const totIng2 = filas.reduce((acc, f) => acc + f.totalIngresos2, 0);
      const totInsp2 = filas.reduce((acc, f) => acc + f.totalInspecciones2, 0);
      const difIng = totIng2 - totIng1;
      const pctIng = totIng1 > 0 ? (difIng / totIng1) * 100 : 0;
      const difInsp = totInsp2 - totInsp1;
      const pctInsp = totInsp1 > 0 ? (difInsp / totInsp1) * 100 : 0;

      return {
        count: filas.length,
        totIng1Formatted: `${totIng1.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        totInsp1: totInsp1.toLocaleString('es-ES'),
        totIng2Formatted: `${totIng2.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        totInsp2: totInsp2.toLocaleString('es-ES'),
        difIngFormatted: `${difIng >= 0 ? '+' : ''}${difIng.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
        pctIngFormatted: `${pctIng >= 0 ? '+' : ''}${pctIng.toFixed(2)} %`,
        difInspFormatted: `${difInsp >= 0 ? '+' : ''}${difInsp.toLocaleString('es-ES')}`,
        pctInspFormatted: `${pctInsp >= 0 ? '+' : ''}${pctInsp.toFixed(2)} %`,
        esPositivoIng: difIng >= 0,
        esPositivoInsp: difInsp >= 0,
      };
    };

    const filasTsa = filasFiltradas.filter((f) => f.sociedad === 'TSA');
    const filasCal = filasFiltradas.filter((f) => f.sociedad === 'CAL');

    return {
      tsa: calcularGrupo(filasTsa),
      cal: calcularGrupo(filasCal),
      global: calcularGrupo(filasFiltradas),
    };
  }, [filasFiltradas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 0. Modales de carga bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Facturación Comparativa"
        message="Calculando métricas interanuales e ingresos agregados por centro ITV (TSA / CAL)..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Libro Excel Oficial"
        message="Rellenando plantilla oficial de facturación comparativa con fórmulas y subtotales..."
      />

      {/* 1. Cabecera Oficial */}
      <ReportPageHeader
        title="Excel Facturación de Inspecciones (TSA / CAL)"
        subtitle="Análisis comparativo de ingresos e inspecciones entre dos periodos por sociedad y estación ITV"
        icon="trending_up"
        breadcrumbItemText="Facturación comparativa"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          content="Descarga el libro oficial de facturación comparativa en formato Excel (.xlsx) con fórmulas corporativas"
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

      {/* 2. Barra de Filtros Dual (Fiel a frmCriteriosExcel.vb: Red Completa TSA + CAL) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Rango 1 (Referencia) */}
          <div style={{ flex: '1 1 240px', padding: '0.65rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0046ad', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="calendar_today" style={{ fontSize: '14px' }} /><span>Rango 1 (Referencia / Año Ant.)</span></span>
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="date"
                value={fechaInicioR1}
                onChange={(e) => setFechaInicioR1(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                title="Fecha inicio periodo 1"
              />
              <input
                type="date"
                value={fechaFinR1}
                onChange={(e) => setFechaFinR1(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                title="Fecha fin periodo 1"
              />
            </div>
          </div>

          {/* Rango 2 (Actual) */}
          <div style={{ flex: '1 1 240px', padding: '0.65rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#0046ad', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="calendar_today" style={{ fontSize: '14px' }} /><span>Rango 2 (Actual / Comparado)</span></span>
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="date"
                value={fechaInicioR2}
                onChange={(e) => setFechaInicioR2(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                title="Fecha inicio periodo 2"
              />
              <input
                type="date"
                value={fechaFinR2}
                onChange={(e) => setFechaFinR2(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                title="Fecha fin periodo 2"
              />
            </div>
          </div>

          {/* Botón de Actualizar Compacto */}
          <div style={{ flex: '0 0 auto', paddingBottom: '2px' }}>
            <TsButton
              variant="primary"
              size="medium"
              onClick={() => consultar()}
              disabled={isLoading}
              style={{ height: '36px', padding: '0 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
            >
              {isLoading ? 'Calculando...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="refresh" style={{ fontSize: '15px' }} /><span>Actualizar</span></span>}
            </TsButton>
          </div>
        </div>
      </div>

      {/* Errores de exportación o consulta */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.85rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="warning" style={{ fontSize: '15px' }} /><span>{error}</span></span>
        </div>
      )}
      {exportError && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '0.85rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="warning" style={{ fontSize: '15px' }} /><span>Error al exportar: {exportError}</span></span>
        </div>
      )}

      {/* 3. Tarjetas KPIs Ejecutivas */}
      {data && data.kpis && data.kpis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {data.kpis.map((kpi, idx) => (
            <ReportKpiCard
              key={`${kpi.id}_${idx}`}
              title={kpi.titulo}
              value={kpi.valor || (kpi as any).valorPrincipal || '-'}
              subtitle={kpi.subtitulo}
              icon={kpi.icon}
              variant={kpi.variant}
              loading={isLoading}
            />
          ))}
        </div>
      )}

      {/* 4. Resumen por Sociedad con Desglose Temporal Claro (Réplica Exacta del Excel) */}
      {data && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Totales por Sociedad ({anyoR1} vs {anyoR2})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Valores calculados entre {data.rango1Label} y {data.rango2Label}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Tarjeta CAL */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TsBadge size="small" variant="success">CAL</TsBadge>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                    ITV Castilla y León ({subtotales.cal.count} ITV)
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: subtotales.cal.esPositivoIng ? '#ecfdf5' : '#fff1f2',
                    color: subtotales.cal.esPositivoIng ? '#047857' : '#be123c',
                  }}
                >
                  {subtotales.cal.pctIngFormatted}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem', backgroundColor: '#f8fafc', padding: '0.65rem', borderRadius: '6px' }}>
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '0.5rem' }}>
                  <span style={{ color: '#0046ad', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Año {anyoR1} (P1)
                  </span>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Facturación: </span>
                    <span style={{ fontWeight: 600 }}>{subtotales.cal.totIng1Formatted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Inspecciones: </span>
                    <span style={{ fontWeight: 600 }}>{subtotales.cal.totInsp1}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: '#0046ad', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Año {anyoR2} (P2)
                  </span>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Facturación: </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{subtotales.cal.totIng2Formatted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Inspecciones: </span>
                    <span style={{ fontWeight: 700 }}>{subtotales.cal.totInsp2}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem' }}>
                <span>Var. Facturación: <strong style={{ color: subtotales.cal.esPositivoIng ? '#047857' : '#be123c' }}>{subtotales.cal.difIngFormatted}</strong></span>
                <span>Var. Inspecciones: <strong style={{ color: subtotales.cal.esPositivoInsp ? '#047857' : '#be123c' }}>{subtotales.cal.difInspFormatted}</strong></span>
              </div>
            </div>

            {/* Tarjeta TSA */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TsBadge size="small" variant="primary">TSA</TsBadge>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                    TÜV SÜD ATISAE ({subtotales.tsa.count} ITV)
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: subtotales.tsa.esPositivoIng ? '#ecfdf5' : '#fff1f2',
                    color: subtotales.tsa.esPositivoIng ? '#047857' : '#be123c',
                  }}
                >
                  {subtotales.tsa.pctIngFormatted}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem', backgroundColor: '#f8fafc', padding: '0.65rem', borderRadius: '6px' }}>
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '0.5rem' }}>
                  <span style={{ color: '#0046ad', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Año {anyoR1} (P1)
                  </span>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Facturación: </span>
                    <span style={{ fontWeight: 600 }}>{subtotales.tsa.totIng1Formatted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Inspecciones: </span>
                    <span style={{ fontWeight: 600 }}>{subtotales.tsa.totInsp1}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: '#0046ad', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Año {anyoR2} (P2)
                  </span>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Facturación: </span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{subtotales.tsa.totIng2Formatted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Inspecciones: </span>
                    <span style={{ fontWeight: 700 }}>{subtotales.tsa.totInsp2}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem' }}>
                <span>Var. Facturación: <strong style={{ color: subtotales.tsa.esPositivoIng ? '#047857' : '#be123c' }}>{subtotales.tsa.difIngFormatted}</strong></span>
                <span>Var. Inspecciones: <strong style={{ color: subtotales.tsa.esPositivoInsp ? '#047857' : '#be123c' }}>{subtotales.tsa.difInspFormatted}</strong></span>
              </div>
            </div>

            {/* Tarjeta Total Global */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '8px',
                padding: '1rem',
                boxShadow: '0 1px 3px rgba(0,70,173,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #dbeafe', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0046ad', letterSpacing: '0.03em' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="apartment" style={{ fontSize: '14px' }} /><span>TOTAL RED (TSA + CAL)</span></span>
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: subtotales.global.esPositivoIng ? '#ecfdf5' : '#fff1f2',
                    color: subtotales.global.esPositivoIng ? '#047857' : '#be123c',
                  }}
                >
                  {subtotales.global.pctIngFormatted}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem', backgroundColor: '#ffffff', padding: '0.65rem', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '0.5rem' }}>
                  <span style={{ color: '#0046ad', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Año {anyoR1} (P1)
                  </span>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Facturación: </span>
                    <span style={{ fontWeight: 600 }}>{subtotales.global.totIng1Formatted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Inspecciones: </span>
                    <span style={{ fontWeight: 600 }}>{subtotales.global.totInsp1}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: '#0046ad', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Año {anyoR2} (P2)
                  </span>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Facturación: </span>
                    <span style={{ fontWeight: 800, color: '#0046ad' }}>{subtotales.global.totIng2Formatted}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Inspecciones: </span>
                    <span style={{ fontWeight: 800 }}>{subtotales.global.totInsp2}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#1e3a8a', borderTop: '1px dashed #bfdbfe', paddingTop: '0.5rem' }}>
                <span>Var. Facturación: <strong style={{ color: subtotales.global.esPositivoIng ? '#047857' : '#be123c' }}>{subtotales.global.difIngFormatted}</strong></span>
                <span>Var. Inspecciones: <strong style={{ color: subtotales.global.esPositivoInsp ? '#047857' : '#be123c' }}>{subtotales.global.difInspFormatted}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Gráfico de Comparación por Estación (Colapsable) */}
      {data && data.graficoEstaciones && data.graficoEstaciones.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mostrarGrafico ? '1rem' : '0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                Visualización Analítica por Centro ITV
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                Comparación visual de volumen o variaciones de crecimiento entre {anyoR1} y {anyoR2}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mostrarGrafico && (
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setMetricaGrafico('ingresos')}
                    style={{
                      border: 'none',
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      fontWeight: metricaGrafico === 'ingresos' ? 700 : 500,
                      backgroundColor: metricaGrafico === 'ingresos' ? '#0046ad' : '#ffffff',
                      color: metricaGrafico === 'ingresos' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="payments" style={{ fontSize: '14px' }} /><span>Ingresos {anyoR2}</span></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricaGrafico('inspecciones')}
                    style={{
                      border: 'none',
                      borderLeft: '1px solid #cbd5e1',
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      fontWeight: metricaGrafico === 'inspecciones' ? 700 : 500,
                      backgroundColor: metricaGrafico === 'inspecciones' ? '#0046ad' : '#ffffff',
                      color: metricaGrafico === 'inspecciones' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="directions_car" style={{ fontSize: '14px' }} /><span>Insp. {anyoR2}</span></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricaGrafico('variacion')}
                    style={{
                      border: 'none',
                      borderLeft: '1px solid #cbd5e1',
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      fontWeight: metricaGrafico === 'variacion' ? 700 : 500,
                      backgroundColor: metricaGrafico === 'variacion' ? '#0046ad' : '#ffffff',
                      color: metricaGrafico === 'variacion' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="trending_up" style={{ fontSize: '14px' }} /><span>Crecimiento %</span></span>
                  </button>
                </div>
              )}

              {/* Botón para Ocultar/Mostrar Gráfico */}
              <button
                type="button"
                onClick={() => setMostrarGrafico(!mostrarGrafico)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                {mostrarGrafico ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="visibility" style={{ fontSize: '15px' }} /><span>Ocultar Gráfico</span></span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="bar_chart" style={{ fontSize: '15px' }} /><span>Mostrar Gráfico</span></span>
            )}
              </button>
            </div>
          </div>

          {mostrarGrafico && (
            <ReportBarChart
              title={`Ranking por ${metricaGrafico === 'ingresos' ? 'Ingresos Netos' : metricaGrafico === 'inspecciones' ? 'Número de Inspecciones' : 'Tasa de Crecimiento Interanual'} (${anyoR2})`}
              subtitle={`Estaciones ordenadas por ${metricaGrafico === 'ingresos' ? 'euros de facturación neta' : metricaGrafico === 'inspecciones' ? 'inspecciones realizadas' : 'variación porcentual respecto a ' + anyoR1}`}
              data={puntosGrafico}
              valueFormatter={(val) => {
                if (metricaGrafico === 'ingresos') return `${val.toLocaleString('es-ES')} €`;
                if (metricaGrafico === 'inspecciones') return `${val.toLocaleString('es-ES')} insp.`;
                return `${val.toFixed(1)} %`;
              }}
            />
          )}
        </div>
      )}

      {/* 6. Tabla de Detalle con Contenedor Corporativo */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por estación, código, sociedad..."
        totalFilas={data?.filas?.length ?? 0}
        filasVisibles={filasFiltradas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={!hayDatosParaExportar}
        unidadRegistros="centros"
      >
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="cd-data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <colgroup>
              <col style={{ width: '220px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '110px' }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                <th onClick={() => handleSort('desEstacion')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Estación <SortIndicator direction={sortColumn === 'desEstacion' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('sociedad')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Sociedad <SortIndicator direction={sortColumn === 'sociedad' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('totalIngresos1')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Ingresos {anyoR1} (€) <SortIndicator direction={sortColumn === 'totalIngresos1' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('totalInspecciones1')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Insp. {anyoR1} <SortIndicator direction={sortColumn === 'totalInspecciones1' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('totalIngresos2')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Ingresos {anyoR2} (€) <SortIndicator direction={sortColumn === 'totalIngresos2' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('totalInspecciones2')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Insp. {anyoR2} <SortIndicator direction={sortColumn === 'totalInspecciones2' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('difIngresos')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Dif. Ingresos (€) <SortIndicator direction={sortColumn === 'difIngresos' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('porcentajeDifIngresos')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Var % Ingresos <SortIndicator direction={sortColumn === 'porcentajeDifIngresos' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('difInspecciones')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Dif. Insp <SortIndicator direction={sortColumn === 'difInspecciones' ? sortDirection : null} />
                </th>
                <th onClick={() => handleSort('porcentajeDifInspecciones')} style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  Var % Insp <SortIndicator direction={sortColumn === 'porcentajeDifInspecciones' ? sortDirection : null} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron registros de facturación para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filasPaginadas.map((f) => (
                  <tr key={f.codEstacion} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>
                      {f.desEstacion}{' '}
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>({f.codEstacion})</span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      <TsBadge size="small" variant={f.sociedad === 'CAL' ? 'success' : 'primary'}>
                        {f.sociedad}
                      </TsBadge>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#64748b' }}>
                      {f.totalIngresos1Formatted}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#64748b' }}>
                      {f.totalInspecciones1.toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {f.totalIngresos2Formatted}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {f.totalInspecciones2.toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: f.difIngresos >= 0 ? '#047857' : '#be123c' }}>
                      {f.difIngresosFormatted}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: f.porcentajeDifIngresos >= 0 ? '#ecfdf5' : '#fff1f2', color: f.porcentajeDifIngresos >= 0 ? '#047857' : '#be123c' }}>
                        {f.porcentajeDifIngresosFormatted}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: f.difInspecciones >= 0 ? '#047857' : '#be123c' }}>
                      {f.difInspeccionesFormatted}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: f.porcentajeDifInspecciones >= 0 ? '#ecfdf5' : '#fff1f2', color: f.porcentajeDifInspecciones >= 0 ? '#047857' : '#be123c' }}>
                        {f.porcentajeDifInspeccionesFormatted}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filasFiltradas.length > 0 && (
              <tfoot style={{ borderTop: '2px solid #0046ad', fontWeight: 700 }}>
                {/* 1. Subtotal TÜV SÜD ATISAE (TSA) */}
                {subtotales.tsa.count > 0 && (
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#0046ad', textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '0.78rem' }}>
                      SUBTOTAL ATISAE ({subtotales.tsa.count} ITV)
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <TsBadge size="small" variant="primary">TSA</TsBadge>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                      {subtotales.tsa.totIng1Formatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                      {subtotales.tsa.totInsp1}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a', fontSize: '0.82rem', fontWeight: 700 }}>
                      {subtotales.tsa.totIng2Formatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a', fontSize: '0.82rem', fontWeight: 700 }}>
                      {subtotales.tsa.totInsp2}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: subtotales.tsa.esPositivoIng ? '#047857' : '#be123c', fontSize: '0.82rem' }}>
                      {subtotales.tsa.difIngFormatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: subtotales.tsa.esPositivoIng ? '#ecfdf5' : '#fff1f2', color: subtotales.tsa.esPositivoIng ? '#047857' : '#be123c' }}>
                        {subtotales.tsa.pctIngFormatted}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: subtotales.tsa.esPositivoInsp ? '#047857' : '#be123c', fontSize: '0.82rem' }}>
                      {subtotales.tsa.difInspFormatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: subtotales.tsa.esPositivoInsp ? '#ecfdf5' : '#fff1f2', color: subtotales.tsa.esPositivoInsp ? '#047857' : '#be123c' }}>
                        {subtotales.tsa.pctInspFormatted}
                      </span>
                    </td>
                  </tr>
                )}

                {/* 2. Subtotal ITV CASTILLA Y LEÓN (CAL) */}
                {subtotales.cal.count > 0 && (
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#00875a', textTransform: 'uppercase', letterSpacing: '0.03em', fontSize: '0.78rem' }}>
                      SUBTOTAL CAL ({subtotales.cal.count} ITV)
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <TsBadge size="small" variant="success">CAL</TsBadge>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                      {subtotales.cal.totIng1Formatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>
                      {subtotales.cal.totInsp1}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a', fontSize: '0.82rem', fontWeight: 700 }}>
                      {subtotales.cal.totIng2Formatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#0f172a', fontSize: '0.82rem', fontWeight: 700 }}>
                      {subtotales.cal.totInsp2}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: subtotales.cal.esPositivoIng ? '#047857' : '#be123c', fontSize: '0.82rem' }}>
                      {subtotales.cal.difIngFormatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: subtotales.cal.esPositivoIng ? '#ecfdf5' : '#fff1f2', color: subtotales.cal.esPositivoIng ? '#047857' : '#be123c' }}>
                        {subtotales.cal.pctIngFormatted}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: subtotales.cal.esPositivoInsp ? '#047857' : '#be123c', fontSize: '0.82rem' }}>
                      {subtotales.cal.difInspFormatted}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: subtotales.cal.esPositivoInsp ? '#ecfdf5' : '#fff1f2', color: subtotales.cal.esPositivoInsp ? '#047857' : '#be123c' }}>
                        {subtotales.cal.pctInspFormatted}
                      </span>
                    </td>
                  </tr>
                )}

                {/* 3. TOTAL CONSOLIDADO GLOBAL */}
                <tr style={{ backgroundColor: '#edf5ff', borderTop: '2px solid #0046ad' }}>
                  <td style={{ padding: '0.8rem 0.75rem', color: '#0b253b', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.82rem', fontWeight: 800 }}>
                    TOTAL RED GLOBAL ({subtotales.global.count} ITV)
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem' }}>
                    <TsBadge size="small" variant="neutral">GLOBAL</TsBadge>
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: '#475569', fontSize: '0.84rem' }}>
                    {subtotales.global.totIng1Formatted}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: '#475569', fontSize: '0.84rem' }}>
                    {subtotales.global.totInsp1}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: '#0046ad', fontSize: '0.88rem', fontWeight: 800 }}>
                    {subtotales.global.totIng2Formatted}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: '#0046ad', fontSize: '0.88rem', fontWeight: 800 }}>
                    {subtotales.global.totInsp2}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: subtotales.global.esPositivoIng ? '#047857' : '#be123c', fontSize: '0.84rem', fontWeight: 800 }}>
                    {subtotales.global.difIngFormatted}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right' }}>
                    <span style={{ padding: '3px 7px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800, backgroundColor: subtotales.global.esPositivoIng ? '#ecfdf5' : '#fff1f2', color: subtotales.global.esPositivoIng ? '#047857' : '#be123c' }}>
                      {subtotales.global.pctIngFormatted}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', color: subtotales.global.esPositivoInsp ? '#047857' : '#be123c', fontSize: '0.84rem', fontWeight: 800 }}>
                    {subtotales.global.difInspFormatted}
                  </td>
                  <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right' }}>
                    <span style={{ padding: '3px 7px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 800, backgroundColor: subtotales.global.esPositivoInsp ? '#ecfdf5' : '#fff1f2', color: subtotales.global.esPositivoInsp ? '#047857' : '#be123c' }}>
                      {subtotales.global.pctInspFormatted}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Paginación Homogénea */}
        <ReportPaginationBar
          page={currentPage}
          pageSize={pageSize}
          totalFilas={filasFiltradas.length}
          totalPaginas={totalPaginas}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          unidadRegistros="centros"
        />
      </ReportTableContainer>
    </div>
  );
};
