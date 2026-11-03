import React, { useMemo } from 'react';
import {
  TsButton,
  TsAlert,
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsBadge,
  TsCard,
} from '@tuvsud/design-system/react';
import { useMinerReport } from '../hooks/useMinerReport';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportDateRangeAlert } from '../components/ReportDateRangeAlert';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { ReportBarChart } from '../components/ReportBarChart';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import type { FilaMinerDefecto } from '../types/miner.types';
import type { ReportBarChartPoint } from '../types/informes.types';

export interface MinerReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

const CATEGORIAS_MINER_INFO = [
  { cod: 'MO', desc: 'Motocicletas, ciclomotores y quads (Grupo 01)' },
  { cod: 'TP', desc: 'Turismos de uso particular (Grupo 02)' },
  { cod: 'TR', desc: 'Turismos alquiler / SP / VTC (Grupo 03)' },
  { cod: 'MP', desc: 'Mercancías ligeras <=3.500 kg (Grupo 04)' },
  { cod: 'MG', desc: 'Mercancías pesadas >3.500 kg (Grupo 05)' },
  { cod: 'AU', desc: 'Autobuses y autocares (Grupo 06)' },
  { cod: 'RS', desc: 'Remolques y semirremolques (Grupo 07)' },
  { cod: 'AG', desc: 'Tractores y maquinaria agrícola (Grupo 08)' },
  { cod: 'OT', desc: 'Otros especiales y obras (Grupo 09)' },
];

export const MinerReportPage: React.FC<MinerReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    sociedad,
    setSociedad,
    estacionesSeleccionadas,
    setEstacionesSeleccionadas,
    estacionesPermitidas,
    alertaRangoFechas,
    ajustarAUnAno,
    data,
    isLoading,
    isExporting,
    error,
    chartMetric,
    setChartMetric,
    fetchReport,
    handleExportExcel,
  } = useMinerReport();

  // Gráfico analítico
  const chartItems: ReportBarChartPoint[] = useMemo(() => {
    if (!data) return [];
    if (chartMetric === 'capitulos') {
      return (data.graficoCapitulos || []).map((c) => ({
        id: c.id,
        label: c.label,
        valor: c.valor,
        valorFormateado: c.valorFormateado,
        color: c.color || 'var(--ts-semantic-color-primary, #005691)',
      }));
    } else {
      return (data.graficoCategorias || []).map((c) => ({
        id: c.id,
        label: c.label,
        valor: c.valor,
        valorFormateado: c.valorFormateado,
        color: c.color || 'var(--ts-semantic-color-accent, #0077c8)',
      }));
    }
  }, [data, chartMetric]);

  // Sumatorios totales de la sección de defectos
  const totalesDefectos = useMemo(() => {
    if (!data?.defectos) return null;

    const leves = data.defectos.filter((d) => d.gravedadTipo === 'Leve');
    const graves = data.defectos.filter((d) => d.gravedadTipo === 'Grave');

    const sumar = (filas: FilaMinerDefecto[]) => ({
      mo: filas.reduce((acc, f) => acc + f.grupo01Mo, 0),
      tp: filas.reduce((acc, f) => acc + f.grupo02Tp, 0),
      tr: filas.reduce((acc, f) => acc + f.grupo03Tr, 0),
      mp: filas.reduce((acc, f) => acc + f.grupo04Mp, 0),
      mg: filas.reduce((acc, f) => acc + f.grupo05Mg, 0),
      au: filas.reduce((acc, f) => acc + f.grupo06Au, 0),
      rs: filas.reduce((acc, f) => acc + f.grupo07Rs, 0),
      ag: filas.reduce((acc, f) => acc + f.grupo08Ag, 0),
      ot: filas.reduce((acc, f) => acc + f.grupo09Ot, 0),
      total: filas.reduce((acc, f) => acc + f.total, 0),
    });

    const sumLeves = sumar(leves);
    const sumGraves = sumar(graves);
    const sumTotal = sumar(data.defectos);

    return { leves: sumLeves, graves: sumGraves, total: sumTotal };
  }, [data?.defectos]);

  // Formateador seguro de porcentajes
  const formatPct = (pct: number, total: number) => (total > 0 ? `${pct.toFixed(2)} %` : '—');

  return (
    <div className="ts-page-container ts-miner-report-page" style={{ padding: '1.5rem' }}>
      {/* 1. Miga de pan oficial */}
      <TsBreadcrumb className="ts-mb-4" aria-label="Navegación secundaria">
        <TsBreadcrumbItem onClick={onNavigateHome} style={{ cursor: 'pointer' }}>
          Inicio
        </TsBreadcrumbItem>
        <TsBreadcrumbItem onClick={onNavigateToInformes} style={{ cursor: 'pointer' }}>
          Informes
        </TsBreadcrumbItem>
        <TsBreadcrumbItem current>Estadística MINER Global (Excel)</TsBreadcrumbItem>
      </TsBreadcrumb>

      {/* 2. Cabecera principal */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--ts-semantic-color-text-primary, #0c2340)',
                margin: 0,
              }}
            >
              Estadística MINER Excel — Datos Globales
            </h1>
            <TsBadge variant="primary">Industria.xls</TsBadge>
            <TsBadge variant="neutral">9 Categorías Reglamentarias</TsBadge>
          </div>
          <p
            style={{
              fontSize: '0.925rem',
              color: 'var(--ts-semantic-color-text-secondary, #54585a)',
              margin: 0,
            }}
          >
            Cuadro de mandos y réplica visual exacta de la plantilla ministerial de inspecciones periódicas
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <TsButton
            variant="secondary"
            onClick={handleExportExcel}
            disabled={isLoading || isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isExporting ? (
              <>⏳ Exportando...</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar Excel Oficial (.xlsx)
              </>
            )}
          </TsButton>

          <TsButton
            variant="primary"
            onClick={fetchReport}
            disabled={isLoading || isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Actualizar
          </TsButton>
        </div>
      </div>

      {/* 3. Filtros */}
      <ReportFiltersBar
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        sociedad={sociedad}
        estacionesSeleccionadas={estacionesSeleccionadas}
        estacionesPermitidas={estacionesPermitidas}
        loading={isLoading}
        showMaxRangeBadge={true}
        onFechaInicioChange={setFechaInicio}
        onFechaFinChange={setFechaFin}
        onSociedadChange={setSociedad}
        onEstacionesChange={setEstacionesSeleccionadas}
        onConsultar={fetchReport}
      />

      {/* Alerta de validación reactiva de fechas con botón de auto-ajuste */}
      <ReportDateRangeAlert
        mensaje={alertaRangoFechas}
        onAjustarAUnAno={ajustarAUnAno}
      />

      {/* Alerta de error */}
      {error && !alertaRangoFechas && (
        <TsAlert variant="danger" className="ts-my-3">
          {error}
        </TsAlert>
      )}

      {/* 4. Tarjetas KPI Ejecutivas */}
      {data?.kpis && data.kpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            margin: '1.5rem 0',
          }}
        >
          {data.kpis.map((kpi) => (
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
      )}

      {/* 5. Leyenda interactiva de categorías MINER */}
      <div
        style={{
          background: 'var(--ts-semantic-color-surface-subtle, #f8f9fa)',
          border: '1px solid var(--ts-semantic-color-border-subtle, #e0e0e0)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0c2340', marginBottom: '0.5rem' }}>
          Categorías Reglamentarias MINER (Ministerio de Industria y Energía):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {CATEGORIAS_MINER_INFO.map((cat) => (
            <AppTooltip key={cat.cod} content={cat.desc}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #dcdcdc',
                  borderRadius: '4px',
                  color: '#333',
                  cursor: 'help',
                }}
              >
                <strong style={{ color: '#005691' }}>{cat.cod}</strong>: {cat.desc.split('(')[0].trim()}
              </span>
            </AppTooltip>
          ))}
        </div>
      </div>

      {/* 6. Gráfico Analítico de Distribución */}
      {chartItems.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--ts-semantic-color-border-subtle, #e0e0e0)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0c2340' }}>
                {chartMetric === 'capitulos'
                  ? 'Defectos Registrados por Capítulo (Manual de Procedimiento)'
                  : 'Volumen de Inspecciones por Grupo MINER'}
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                {data?.rangoFechasLabel} — {data?.estacionesLabel}
              </span>
            </div>

            <div style={{ display: 'inline-flex', background: '#eef2f6', borderRadius: '6px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setChartMetric('capitulos')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: chartMetric === 'capitulos' ? 600 : 400,
                  color: chartMetric === 'capitulos' ? '#005691' : '#555',
                  backgroundColor: chartMetric === 'capitulos' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: chartMetric === 'capitulos' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Defectos por Capítulo
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('categorias')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: chartMetric === 'categorias' ? 600 : 400,
                  color: chartMetric === 'categorias' ? '#005691' : '#555',
                  backgroundColor: chartMetric === 'categorias' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: chartMetric === 'categorias' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Inspecciones por Categoría
              </button>
            </div>
          </div>

          <ReportBarChart
            title={
              chartMetric === 'capitulos'
                ? 'Defectos Registrados por Capítulo (Manual de Procedimiento)'
                : 'Volumen de Inspecciones por Grupo MINER'
            }
            subtitle={`${data?.rangoFechasLabel || ''} — ${data?.estacionesLabel || ''}`}
            data={chartItems}
            loading={isLoading}
            height={260}
          />
        </div>
      )}

      {/* 7. Matriz Oficial Unificada Réplica de Excel (Industria.xls - Hoja PERIODICAS) */}
      <TsCard style={{ padding: '1.25rem', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
            borderBottom: '2px solid #005691',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>📊</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0c2340' }}>
                Estadística Oficial de Inspecciones Periódicas (Hoja PERIODICAS)
              </h3>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.825rem', color: '#54585a' }}>
              Los datos en pantalla son idénticos a los exportados a la plantilla ministerial <strong>Industria.xls</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.825rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <strong>Periodo:</strong> {data?.rangoFechasLabel || '—'}
            </div>
            <TsButton
              variant="secondary"
              size="small"
              onClick={handleExportExcel}
              disabled={isLoading || isExporting}
            >
              📥 Descargar .xlsx
            </TsButton>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            className="ts-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8rem',
              textAlign: 'right',
            }}
          >
            {/* Cabecera idéntica a Industria.xls filas 6 a 8 */}
            <thead>
              <tr style={{ backgroundColor: '#005691', color: '#ffffff' }}>
                <th
                  rowSpan={2}
                  style={{
                    padding: '0.6rem 0.75rem',
                    textAlign: 'left',
                    minWidth: '220px',
                    borderRight: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  DEFECTOS / VEHÍCULOS
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: '0.6rem 0.5rem',
                    textAlign: 'center',
                    width: '60px',
                    borderRight: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  TIPO
                </th>
                <th
                  colSpan={9}
                  style={{
                    padding: '0.45rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    fontSize: '0.75rem',
                    letterSpacing: '1px',
                    backgroundColor: '#004370',
                  }}
                >
                  TIPO DE VEHÍCULO (GRUPOS MINER 01 A 09)
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: '0.6rem 0.75rem',
                    textAlign: 'right',
                    width: '95px',
                    backgroundColor: '#003357',
                  }}
                >
                  TOTALES
                </th>
              </tr>
              <tr style={{ backgroundColor: '#004f85', color: '#ffffff', fontSize: '0.72rem' }}>
                <th style={{ padding: '0.4rem', width: '70px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 01: Motocicletas, ciclomotores y quads">
                    <span style={{ cursor: 'help' }}>MOTOCICL.<br />(MO)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '75px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 02: Turismos de uso particular">
                    <span style={{ cursor: 'help' }}>TURISMOS P.<br />(TP)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '70px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 03: Turismos de alquiler / servicio público (taxis, VTC)">
                    <span style={{ cursor: 'help' }}>RESTO TUR.<br />(TR)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '80px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 04: Transporte de mercancías ligero (<= 3.500 kg, furgonetas)">
                    <span style={{ cursor: 'help' }}>MERC.&le;3.5t<br />(MP)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '80px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 05: Transporte de mercancías pesado (> 3.500 kg, camiones)">
                    <span style={{ cursor: 'help' }}>MERC.&gt;3.5t<br />(MG)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '70px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 06: Autobuses y autocares">
                    <span style={{ cursor: 'help' }}>AUTOBUS.<br />(AU)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '75px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 07: Remolques y semirremolques">
                    <span style={{ cursor: 'help' }}>REMOLQUES<br />(RS)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '70px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 08: Tractores y maquinaria agrícola">
                    <span style={{ cursor: 'help' }}>AGRÍCOL.<br />(AG)</span>
                  </AppTooltip>
                </th>
                <th style={{ padding: '0.4rem', width: '70px', textAlign: 'right' }}>
                  <AppTooltip content="Grupo 09: Otros vehículos especiales y maquinaria de obras">
                    <span style={{ cursor: 'help' }}>OTROS<br />(OT)</span>
                  </AppTooltip>
                </th>
              </tr>
            </thead>

            <tbody>
              {/* TÍTULO SECCIÓN 1: FRECUENCIA DE DEFECTOS */}
              <tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #005691', fontWeight: 700 }}>
                <td colSpan={12} style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#005691', letterSpacing: '1.2px', wordSpacing: '3px', textTransform: 'uppercase', fontSize: '0.875rem' }}>
                  Frecuencia de Defectos
                </td>
              </tr>

              {/* 20 Filas de Defectos (11L a 20G) */}
              {data?.defectos && data.defectos.length > 0 ? (
                data.defectos.map((fila: FilaMinerDefecto, idx: number) => {
                  const isGrave = fila.gravedadTipo === 'Grave';

                  return (
                    <tr
                      key={fila.codigoGravedad}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        borderBottom: isGrave ? '1px solid #d0d7de' : '1px solid #f0f0f0',
                      }}
                    >
                      <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontWeight: isGrave ? 600 : 400, color: '#0c2340' }}>
                        {fila.capituloNombre}
                      </td>
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                        <AppTooltip
                          content={
                            isGrave
                              ? 'DG: Defecto Grave (Inhabilita la circulación excepto traslado al taller; exige 2ª inspección)'
                              : 'DL: Defecto Leve (Debe subsanarse; no requiere pasar una 2ª inspección)'
                          }
                          position="top"
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: isGrave ? '#fee2e2' : '#fef3c7',
                              color: isGrave ? '#b91c1c' : '#b45309',
                              cursor: 'help',
                            }}
                          >
                            {isGrave ? 'DG' : 'DL'}
                          </span>
                        </AppTooltip>
                      </td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo01Mo.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo02Tp.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo03Tr.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo04Mp.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo05Mg.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo06Au.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo07Rs.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo08Ag.toLocaleString('es-ES')}</td>
                      <td style={{ padding: '0.45rem' }}>{fila.grupo09Ot.toLocaleString('es-ES')}</td>
                      <td
                        style={{
                          padding: '0.45rem 0.75rem',
                          fontWeight: 700,
                          backgroundColor: isGrave ? '#fff1f2' : '#fcfcfc',
                          color: isGrave ? '#991b1b' : '#0c2340',
                        }}
                      >
                        {fila.total.toLocaleString('es-ES')}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    {isLoading ? 'Cargando datos...' : 'No hay registros de defectos para los filtros seleccionados.'}
                  </td>
                </tr>
              )}

              {/* Sumatorios de Defectos (DL y DG) */}
              {totalesDefectos && (
                <>
                  <tr style={{ backgroundColor: '#fffbeb', fontWeight: 600, borderTop: '2px solid #b45309', color: '#92400e' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left' }}>TOTAL DEFECTOS LEVES (DL)</td>
                    <td style={{ padding: '0.45rem', textAlign: 'center' }}>DL</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.mo.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.tp.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.tr.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.mp.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.mg.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.au.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.rs.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.ag.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.leves.ot.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700 }}>{totalesDefectos.leves.total.toLocaleString('es-ES')}</td>
                  </tr>
                  <tr style={{ backgroundColor: '#fef2f2', fontWeight: 600, borderBottom: '2px solid #b91c1c', color: '#991b1b' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left' }}>TOTAL DEFECTOS GRAVES (DG)</td>
                    <td style={{ padding: '0.45rem', textAlign: 'center' }}>DG</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.mo.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.tp.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.tr.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.mp.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.mg.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.au.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.rs.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.ag.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{totalesDefectos.graves.ot.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700 }}>{totalesDefectos.graves.total.toLocaleString('es-ES')}</td>
                  </tr>
                </>
              )}

              {/* TÍTULO SECCIÓN 2: VEHÍCULOS TOTALES */}
              <tr style={{ backgroundColor: '#005691', color: '#ffffff', fontWeight: 700 }}>
                <td colSpan={12} style={{ padding: '0.65rem 0.75rem', textAlign: 'center', letterSpacing: '1.2px', wordSpacing: '3px', textTransform: 'uppercase', fontSize: '0.875rem' }}>
                  Balance de Inspecciones y Vehículos (Fase 1 y 2)
                </td>
              </tr>

              {data && (
                <>
                  {/* Fila 30: PRIMERA INSPECC. - FAVORABLES */}
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#166534' }}>
                      1ª INSPECC. - FAVORABLES
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center', color: '#166534', fontWeight: 700 }}>✓</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo01MoFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo02TpFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo03TrFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo04MpFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo05MgFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo06AuFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo07RsFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo08AgFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo09OtFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7' }}>
                      {data.primeraInspeccion.totalFav.toLocaleString('es-ES')}
                    </td>
                  </tr>

                  {/* Fila 31: PRIMERA INSPECC. - RECHAZADOS */}
                  <tr style={{ backgroundColor: '#fef2f2' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#991b1b' }}>
                      1ª INSPECC. - RECHAZADOS
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center', color: '#991b1b', fontWeight: 700 }}>✕</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo01MoDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo02TpDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo03TrDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo04MpDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo05MgDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo06AuDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo07RsDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo08AgDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo09OtDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2' }}>
                      {data.primeraInspeccion.totalDesfav.toLocaleString('es-ES')}
                    </td>
                  </tr>

                  {/* Fila 32: PRIMERA INSPECC. - TOTALES */}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', color: '#0c2340' }}>
                      TOTALES FASE 1
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center' }}>Σ</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo01MoTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo02TpTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo03TrTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo04MpTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo05MgTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo06AuTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo07RsTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo08AgTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.primeraInspeccion.grupo09OtTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', backgroundColor: '#cbd5e1' }}>
                      {data.primeraInspeccion.totalInspecciones.toLocaleString('es-ES')}
                    </td>
                  </tr>

                  {/* Fila 33: PRIMERA INSPECC. - % DE RECHAZO */}
                  <tr style={{ backgroundColor: '#fff1f2', fontWeight: 700, borderBottom: '2px solid #cbd5e1' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', color: '#991b1b' }}>
                      % DE RECHAZO FASE 1
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center', color: '#991b1b' }}>%</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo01MoPctRechazo, data.primeraInspeccion.grupo01MoTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo02TpPctRechazo, data.primeraInspeccion.grupo02TpTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo03TrPctRechazo, data.primeraInspeccion.grupo03TrTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo04MpPctRechazo, data.primeraInspeccion.grupo04MpTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo05MgPctRechazo, data.primeraInspeccion.grupo05MgTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo06AuPctRechazo, data.primeraInspeccion.grupo06AuTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo07RsPctRechazo, data.primeraInspeccion.grupo07RsTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo08AgPctRechazo, data.primeraInspeccion.grupo08AgTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.primeraInspeccion.grupo09OtPctRechazo, data.primeraInspeccion.grupo09OtTotal)}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: '#991b1b', backgroundColor: '#fee2e2' }}>
                      {formatPct(data.primeraInspeccion.pctRechazoGlobal, data.primeraInspeccion.totalInspecciones)}
                    </td>
                  </tr>

                  {/* Fila 34: OTRAS INSPECC. - FAVORABLES */}
                  <tr style={{ backgroundColor: '#f0fdf4' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#166534' }}>
                      OTRAS INSPECC. - FAVORABLES
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center', color: '#166534', fontWeight: 700 }}>✓</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo01MoFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo02TpFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo03TrFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo04MpFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo05MgFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo06AuFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo07RsFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo08AgFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo09OtFav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#166534', backgroundColor: '#dcfce7' }}>
                      {data.segundaInspeccion.totalFav.toLocaleString('es-ES')}
                    </td>
                  </tr>

                  {/* Fila 35: OTRAS INSPECC. - RECHAZADOS */}
                  <tr style={{ backgroundColor: '#fef2f2' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#991b1b' }}>
                      OTRAS INSPECC. - RECHAZADOS
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center', color: '#991b1b', fontWeight: 700 }}>✕</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo01MoDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo02TpDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo03TrDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo04MpDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo05MgDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo06AuDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo07RsDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo08AgDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo09OtDesfav.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2' }}>
                      {data.segundaInspeccion.totalDesfav.toLocaleString('es-ES')}
                    </td>
                  </tr>

                  {/* Fila 36: OTRAS INSPECC. - TOTALES */}
                  <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', color: '#0c2340' }}>
                      TOTALES FASE 2
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center' }}>Σ</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo01MoTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo02TpTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo03TrTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo04MpTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo05MgTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo06AuTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo07RsTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo08AgTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem' }}>{data.segundaInspeccion.grupo09OtTotal.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '0.45rem 0.75rem', backgroundColor: '#cbd5e1' }}>
                      {data.segundaInspeccion.totalInspecciones.toLocaleString('es-ES')}
                    </td>
                  </tr>

                  {/* Fila 37: OTRAS INSPECC. - % DE RECHAZO */}
                  <tr style={{ backgroundColor: '#fff1f2', fontWeight: 700, borderBottom: '2px solid #005691' }}>
                    <td style={{ padding: '0.45rem 0.75rem', textAlign: 'left', color: '#991b1b' }}>
                      % DE RECHAZO FASE 2
                    </td>
                    <td style={{ padding: '0.45rem', textAlign: 'center', color: '#991b1b' }}>%</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo01MoPctRechazo, data.segundaInspeccion.grupo01MoTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo02TpPctRechazo, data.segundaInspeccion.grupo02TpTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo03TrPctRechazo, data.segundaInspeccion.grupo03TrTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo04MpPctRechazo, data.segundaInspeccion.grupo04MpTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo05MgPctRechazo, data.segundaInspeccion.grupo05MgTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo06AuPctRechazo, data.segundaInspeccion.grupo06AuTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo07RsPctRechazo, data.segundaInspeccion.grupo07RsTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo08AgPctRechazo, data.segundaInspeccion.grupo08AgTotal)}</td>
                    <td style={{ padding: '0.45rem', color: '#991b1b' }}>{formatPct(data.segundaInspeccion.grupo09OtPctRechazo, data.segundaInspeccion.grupo09OtTotal)}</td>
                    <td style={{ padding: '0.45rem 0.75rem', color: '#991b1b', backgroundColor: '#fee2e2' }}>
                      {formatPct(data.segundaInspeccion.pctRechazoGlobal, data.segundaInspeccion.totalInspecciones)}
                    </td>
                  </tr>

                  {/* RESUMEN FINAL: TOTAL RED INSPECCIONES (FASE 1 + FASE 2) */}
                  <tr style={{ backgroundColor: '#0c2340', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>
                      TOTAL GENERAL (FASE 1 + FASE 2)
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>TOTAL</td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo01MoTotal + data.segundaInspeccion.grupo01MoTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo02TpTotal + data.segundaInspeccion.grupo02TpTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo03TrTotal + data.segundaInspeccion.grupo03TrTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo04MpTotal + data.segundaInspeccion.grupo04MpTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo05MgTotal + data.segundaInspeccion.grupo05MgTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo06AuTotal + data.segundaInspeccion.grupo06AuTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo07RsTotal + data.segundaInspeccion.grupo07RsTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo08AgTotal + data.segundaInspeccion.grupo08AgTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {(data.primeraInspeccion.grupo09OtTotal + data.segundaInspeccion.grupo09OtTotal).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', backgroundColor: '#005691', color: '#ffffff' }}>
                      {(data.primeraInspeccion.totalInspecciones + data.segundaInspeccion.totalInspecciones).toLocaleString('es-ES')}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </TsCard>

      {/* Modal de Carga Bloqueante */}
      <BlockingLoadingModal
        isOpen={isLoading || isExporting}
        title={isExporting ? 'Exportando Excel MINER...' : 'Consultando Estadística MINER...'}
        message={
          isExporting
            ? 'Generando libro oficial .xlsx a partir de la plantilla Industria.xls con fórmulas y categorías...'
            : 'Extrayendo agregados de defectos y balances de Fase 1 / Fase 2 desde la base de datos...'
        }
      />
    </div>
  );
};
