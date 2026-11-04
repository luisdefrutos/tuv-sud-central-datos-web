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
import { useBastidoresObdReport } from '../hooks/useBastidoresObdReport';
import type { FilaBastidorObdNoCoincidente, SortableBastidorObdColumn } from '../types/bastidoresObd.types';

export interface BastidoresObdReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const BastidoresObdReportPage: React.FC<BastidoresObdReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const [chartMode, setChartMode] = useState<'bar' | 'donut'>('bar');
  const {
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    filaSeleccionada,
    setFilaSeleccionada,
    filters,
    table,
    exportarExcel,
    recargar,
  } = useBastidoresObdReport();

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

  const filtrarPorValor = (valor?: string | null) => {
    const termino = String(valor || '').trim();
    setSearchTerm(termino);
    setTimeout(() => {
      const container = document.getElementById('report-search-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        container.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        container.style.boxShadow = '0 0 0 4px rgba(0, 43, 73, 0.25)';
        setTimeout(() => {
          container.style.boxShadow = 'none';
        }, 1500);
      }
      const input = document.getElementById('report-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        if (typeof input.select === 'function') {
          input.select();
        }
      }
    }, 100);
  };

  const hayDatosParaExportar = data && data.filas && data.filas.length > 0;

  // Adaptador para Donut Chart de categorías
  const donutData = React.useMemo(() => {
    if (!data?.graficoPorCategoria) return [];
    const colores = ['#003366', '#0072ce', '#00a3e0', '#2d68c4', '#64748b', '#94a3b8', '#e2e8f0'];
    return data.graficoPorCategoria.map((cat, idx) => ({
      id: cat.categoria,
      label: cat.descripcion,
      valor: cat.totalDiscordancias,
      valorFormateado: `${cat.totalDiscordancias} discordancias (${cat.pctSobreTotal}%)`,
      color: colores[idx % colores.length],
      porcentaje: parseFloat(cat.pctSobreTotal) || 0,
    }));
  }, [data]);

  // Comparador visual de caracteres para la Ficha Técnica
  const renderComparativaBastidor = (bastidorFicha: string, bastidorObd: string) => {
    const len = Math.max(bastidorFicha.length, bastidorObd.length);
    const charsFicha: React.ReactNode[] = [];
    const charsObd: React.ReactNode[] = [];

    for (let i = 0; i < len; i++) {
      const c1 = bastidorFicha[i] || ' ';
      const c2 = bastidorObd[i] || ' ';
      const coincide = c1.toUpperCase() === c2.toUpperCase();

      charsFicha.push(
        <span
          key={`f_${i}`}
          style={{
            display: 'inline-block',
            width: '20px',
            textAlign: 'center',
            fontWeight: 700,
            backgroundColor: coincide ? '#e2e8f0' : '#fee2e2',
            color: coincide ? '#003366' : '#991b1b',
            border: coincide ? '1px solid #cbd5e1' : '1px solid #f87171',
            borderRadius: '3px',
            margin: '0 1px',
            padding: '2px 0',
          }}
        >
          {c1}
        </span>
      );

      charsObd.push(
        <span
          key={`o_${i}`}
          style={{
            display: 'inline-block',
            width: '20px',
            textAlign: 'center',
            fontWeight: 700,
            backgroundColor: coincide ? '#e2e8f0' : '#fecaca',
            color: coincide ? '#1e293b' : '#b91c1c',
            border: coincide ? '1px solid #cbd5e1' : '1px solid #ef4444',
            borderRadius: '3px',
            margin: '0 1px',
            padding: '2px 0',
          }}
        >
          {c2}
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowX: 'auto', padding: '0.5rem 0' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#003366', marginBottom: '4px' }}>
            BASTIDOR FICHA TÉCNICA (DOCUMENTAL):
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{charsFicha}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
            BASTIDOR CENTRALITA OBD (ELECTRÓNICO):
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{charsObd}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 0. Modales de carga bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Bastidores OBD No Coincidentes"
        message="Verificando discrepancias entre los bastidores de inspección y lecturas electrónicas OBD..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando y descargando el informe oficial de bastidores OBD no coincidentes..."
      />

      {/* 1. Cabecera Oficial Estandarizada */}
      <ReportPageHeader
        title="Informe de Bastidores OBD No Coincidentes"
        subtitle="Control de calidad antifraude: discrepancias entre el bastidor de ficha/inspección y la lectura electrónica OBD"
        icon="cable"
        breadcrumbItemText="Bastidores OBD no coincidentes"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          content="Descarga el informe oficial de bastidores OBD en formato Excel (.xlsx con hoja BASTIDORES_OBD)"
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
        onFechaInicioChange={filters.handleFechaInicioChange}
        onFechaFinChange={filters.handleFechaFinChange}
        onSociedadChange={filters.setSociedad}
        onEstacionesChange={filters.setEstacionesSeleccionadas}
        onConsultar={recargar}
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

      {/* 4. Tarjetas KPIs Ejecutivas con AppTooltip y Filtrado Rápido */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        {data && data.kpis && data.kpis.length > 0 ? (
          data.kpis.map((kpi, index) => {
            const isClickable = kpi.id === 'equipo-obd-top' || kpi.id === 'estacion-maxima' || kpi.id === 'total-discordancias';
            
            let tooltipTitle = kpi.titulo;
            let tooltipSubtitle = 'Indicador ejecutivo';
            let tooltipContent = kpi.subtitulo;

            if (kpi.id === 'equipo-obd-top') {
              tooltipTitle = 'Equipo OBD con Más Casos';
              tooltipSubtitle = `Equipo ${kpi.valor} · Clic para filtrar`;
              tooltipContent = `Haga clic para filtrar el grid y ver los ${kpi.subtitulo} registrados por el equipo ${kpi.valor}. Se desplazará automáticamente a la caja de búsqueda.`;
            } else if (kpi.id === 'estacion-maxima') {
              tooltipTitle = 'Estación con Más Casos';
              tooltipSubtitle = `Estación ${kpi.valor} · Clic para filtrar`;
              tooltipContent = `Haga clic para filtrar el grid por la estación ${kpi.valor}. Se desplazará automáticamente a la caja de búsqueda.`;
            } else if (kpi.id === 'total-discordancias') {
              tooltipTitle = 'Total Discordancias';
              tooltipSubtitle = 'Clic para mostrar todos los datos';
              tooltipContent = 'Haga clic para restablecer el buscador y mostrar la totalidad de las discordancias sin filtrar.';
            } else if (kpi.id === 'estaciones-afectadas') {
              tooltipTitle = 'Estaciones Afectadas';
              tooltipSubtitle = `${kpi.valor} estaciones con incidencias`;
              tooltipContent = 'Estaciones ITV que han registrado al menos una inspección con discrepancia de bastidor OBD en el rango seleccionado.';
            }

            return (
              <AppTooltip
                key={`${kpi.id}_${index}`}
                title={tooltipTitle}
                subtitle={tooltipSubtitle}
                content={tooltipContent}
                position="top"
              >
                <div
                  onClick={
                    isClickable
                      ? () => {
                          if (kpi.id === 'total-discordancias') {
                            filtrarPorValor('');
                          } else {
                            filtrarPorValor(String(kpi.valor || '').trim());
                          }
                        }
                      : undefined
                  }
                  style={{
                    cursor: isClickable ? 'pointer' : 'default',
                    borderRadius: '8px',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 43, 73, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isClickable) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <ReportKpiCard
                    title={kpi.titulo}
                    value={kpi.valor}
                    subtitle={kpi.subtitulo}
                    icon={kpi.icon}
                    variant={kpi.variant}
                    loading={isLoading}
                  />
                </div>
              </AppTooltip>
            );
          })
        ) : (
          [
            { id: 'total-discordancias', title: 'Total Discordancias', value: isLoading ? '...' : '0', subtitle: 'Discrepancias detectadas', icon: 'warning', variant: 'neutral' as const },
            { id: 'estaciones-afectadas', title: 'Estaciones Afectadas', value: isLoading ? '...' : '0', subtitle: 'Sin incidencias', icon: 'apartment', variant: 'neutral' as const },
            { id: 'estacion-maxima', title: 'Estación con Más Casos', value: isLoading ? '...' : '-', subtitle: 'N/D', icon: 'apartment', variant: 'neutral' as const },
            { id: 'equipo-obd-top', title: 'Equipo OBD con Más Casos', value: isLoading ? '...' : '-', subtitle: 'N/D', icon: 'cable', variant: 'neutral' as const },
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

      {/* 5. Selector Gráfico Permanente (Barras por Estación / Donut por Categoría) */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Vista del Gráfico:</span>
            <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: chartMode === 'bar' ? '#003366' : '#f8fafc',
                  color: chartMode === 'bar' ? '#ffffff' : '#475569',
                }}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="bar_chart" style={{ fontSize: "15px" }} /><span>Por Estación</span></span></button>
              <button
                type="button"
                onClick={() => setChartMode('donut')}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  backgroundColor: chartMode === 'donut' ? '#003366' : '#f8fafc',
                  color: chartMode === 'donut' ? '#ffffff' : '#475569',
                }}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="pie_chart" style={{ fontSize: '15px' }} /><span>Por Categoría</span></span></button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            {chartMode === 'bar' ? (
              <ReportBarChart
                data={data.graficoPorEstacion}
                title="Top Estaciones con Discrepancia de Bastidor OBD"
                emptyMessage="No hay datos suficientes para graficar"
              />
            ) : (
              <ReportDonutChart
                data={donutData}
                title="Distribución por Categoría de Vehículo"
                emptyMessage="No hay datos suficientes para graficar"
              />
            )}
          </div>
        </div>
      )}

      {/* 6. Tabla de Resultados Paginada y Ordenable con el 100% de las columnas de frmGridBastidoresOBD.vb */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por matrícula, bastidor (inspección u OBD), estación, cliente, inspector..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={isLoading || isExporting || !hayDatosParaExportar}
        unidadRegistros="discordancias"
      >
        <div style={{ backgroundColor: '#eff6ff', padding: '6px 12px', fontSize: '0.8rem', color: '#1e40af', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TsIcon name="lightbulb" style={{ fontSize: '18px', color: '#f59e0b' }} />
          <span><strong>Ficha Técnica Comparativa:</strong> Haga clic en cualquier fila, en el botón de ficha o en la matrícula para ver el desglose carácter por carácter del bastidor documental vs. bastidor OBD.</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="cd-data-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px', position: 'sticky', left: 0, backgroundColor: '#f1f5f9', zIndex: 2 }}>Ficha</th>
                <th
                  onClick={() => handleSort('codInspeccion')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Nº Insp.</span>
                    <SortIndicator direction={sortColumn === 'codInspeccion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('desEstacion')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Estación</span>
                    <SortIndicator direction={sortColumn === 'desEstacion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fechaInspeccion')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Fecha</span>
                    <SortIndicator direction={sortColumn === 'fechaInspeccion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('matricula')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Matrícula</span>
                    <SortIndicator direction={sortColumn === 'matricula' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('bastidorInspeccion')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Bastidor Inspección</span>
                    <SortIndicator direction={sortColumn === 'bastidorInspeccion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('bastidorObd')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Bastidor OBD (Leído)</span>
                    <SortIndicator direction={sortColumn === 'bastidorObd' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('categoria')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>Cat.</span>
                    <SortIndicator direction={sortColumn === 'categoria' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('clasificacion')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>Clasif.</span>
                    <SortIndicator direction={sortColumn === 'clasificacion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombreCompleto')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Cliente / Razón Social</span>
                    <SortIndicator direction={sortColumn === 'nombreCompleto' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cifFactura')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>CIF Factura</span>
                    <SortIndicator direction={sortColumn === 'cifFactura' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('codInspector')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Inspector</span>
                    <SortIndicator direction={sortColumn === 'codInspector' ? sortDirection : null} />
                  </div>
                </th>
                <th style={{ padding: '10px 12px' }}>Insp. 1</th>
                <th style={{ padding: '10px 12px' }}>Insp. 2</th>
                <th style={{ padding: '10px 12px' }}>Insp. 3</th>
                <th
                  onClick={() => handleSort('inspectorResponsableValidacion')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Resp. Validación</span>
                    <SortIndicator direction={sortColumn === 'inspectorResponsableValidacion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('equipoObd')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Equipo OBD</span>
                    <SortIndicator direction={sortColumn === 'equipoObd' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('codEmpleadoBastidor')}
                  style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Empleado OBD</span>
                    <SortIndicator direction={sortColumn === 'codEmpleadoBastidor' ? sortDirection : null} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filasPaginadas.length > 0 ? (
                filasPaginadas.map((fila, idx) => (
                  <tr
                    key={`${fila.codEstacion}_${fila.codInspeccion}_${idx}`}
                    onClick={() => setFilaSeleccionada(fila)}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf5ff')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc')
                    }
                  >
                    <td style={{ padding: '8px 12px', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 1 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilaSeleccionada(fila);
                        }}
                        title="Ver comparativa carácter a carácter"
                        style={{
                          backgroundColor: '#003366',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TsIcon name="search" style={{ fontSize: '13px' }} /><span>Ver</span></span></button>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748b' }}>
                      {fila.codInspeccion}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontWeight: 600, color: '#003366' }}>{fila.codEstacion}</span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '6px' }}>
                        {fila.desEstacion.replace('I.T.V. - ', '')}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {fila.fechaInspeccionFormatted}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <AppTooltip
                        title="Matrícula del Vehículo"
                        subtitle="Clic para filtrar el grid"
                        content={`Filtrar el grid por la matrícula ${fila.matricula}. Se desplazará a la caja de búsqueda.`}
                        position="top"
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            filtrarPorValor(fila.matricula);
                          }}
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {fila.matricula}
                        </span>
                      </AppTooltip>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#003366' }}>
                      <AppTooltip
                        title="Bastidor en Ficha Técnica"
                        subtitle="Clic para filtrar el grid"
                        content={`Filtrar el grid por el bastidor ${fila.bastidorInspeccion}. Se desplazará a la caja de búsqueda.`}
                        position="top"
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            filtrarPorValor(fila.bastidorInspeccion);
                          }}
                          style={{
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {fila.bastidorInspeccion}
                        </span>
                      </AppTooltip>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#b91c1c' }}>
                      <AppTooltip
                        title="Bastidor Leído por OBD"
                        subtitle="Clic para filtrar el grid"
                        content={`Filtrar el grid por el bastidor OBD ${fila.bastidorObd}. Se desplazará a la caja de búsqueda.`}
                        position="top"
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            filtrarPorValor(fila.bastidorObd);
                          }}
                          style={{
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {fila.bastidorObd}
                        </span>
                      </AppTooltip>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <TsBadge variant="neutral">{fila.categoria}</TsBadge>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>
                      {fila.clasificacion || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      {fila.nombre || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      {fila.apellidos || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {fila.cifFactura || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 600 }}>
                      {fila.codInspector || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {fila.codInspector1 || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {fila.codInspector2 || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {fila.codInspector3 || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>
                      {fila.inspectorResponsableValidacion || '-'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {fila.equipoObd && fila.equipoObd !== '-' ? (
                        <AppTooltip
                          title="Equipo OBD de Diagnosis"
                          subtitle="Clic para filtrar el grid"
                          content={`Filtrar el grid por el equipo OBD ${fila.equipoObd}.`}
                          position="top"
                        >
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              filtrarPorValor(fila.equipoObd);
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              fontWeight: 600,
                            }}
                          >
                            {fila.equipoObd}
                          </span>
                        </AppTooltip>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {fila.codEmpleadoBastidor || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={19} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    {isLoading
                      ? 'Cargando datos...'
                      : 'No se encontraron registros de bastidores no coincidentes para los criterios seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalFilas > 0 && (
          <ReportPaginationBar
            page={page}
            pageSize={pageSize}
            totalFilas={totalFilas}
            totalPaginas={totalPaginas}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </ReportTableContainer>

      {/* 7. Modal de Ficha Técnica Comparativa Carácter por Carácter */}
      {filaSeleccionada && (
        <div
          onClick={() => setFilaSeleccionada(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: 'min(720px, 94vw)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Cabecera del modal */}
            <div
              style={{
                backgroundColor: '#003366',
                color: '#ffffff',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TsIcon name="search" style={{ fontSize: '1.25rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>
                    Comparativa de Bastidor — {filaSeleccionada.matricula}
                  </h3>
                </div>
                <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                  Inspección Nº {filaSeleccionada.codInspeccion} · {filaSeleccionada.desEstacion} ({filaSeleccionada.codEstacion})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilaSeleccionada(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '4px 8px',
                }}
              ><TsIcon name="close" style={{ fontSize: '16px' }} /></button>
            </div>

            {/* Cuerpo del modal */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              {/* Bloque comparativo de bastidores visual */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '1rem',
                }}
              >
                {renderComparativaBastidor(filaSeleccionada.bastidorInspeccion, filaSeleccionada.bastidorObd)}
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                  * Los caracteres en <span style={{ color: '#b91c1c', fontWeight: 700, backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '2px' }}>rojo</span> indican las discrepancias exactas entre la ficha y la centralita.
                </div>
              </div>

              {/* Grid de metadatos completos */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Fecha Inspección:</span>{' '}
                  <strong>{filaSeleccionada.fechaInspeccionFormatted}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Categoría / Clasificación:</span>{' '}
                  <strong>{filaSeleccionada.categoria} / {filaSeleccionada.clasificacion || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Nombre y Apellidos:</span>{' '}
                  <strong>{filaSeleccionada.nombreCompleto}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>CIF/NIF Factura:</span>{' '}
                  <strong>{filaSeleccionada.cifFactura || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Equipo OBD:</span>{' '}
                  <strong>{filaSeleccionada.equipoObd || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Empleado OBD:</span>{' '}
                  <strong>{filaSeleccionada.codEmpleadoBastidor || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Inspector Principal:</span>{' '}
                  <strong>{filaSeleccionada.codInspector || '-'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Otros Inspectores:</span>{' '}
                  <strong>
                    {[filaSeleccionada.codInspector1, filaSeleccionada.codInspector2, filaSeleccionada.codInspector3]
                      .filter((x) => x && x !== '-')
                      .join(', ') || 'Ninguno'}
                  </strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b' }}>Inspector Responsable Validación:</span>{' '}
                  <strong>{filaSeleccionada.inspectorResponsableValidacion || '-'}</strong>
                </div>
              </div>
            </div>

            {/* Pie del modal */}
            <div
              style={{
                backgroundColor: '#f1f5f9',
                padding: '0.75rem 1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <TsButton variant="secondary" onClick={() => setFilaSeleccionada(null)}>
                Cerrar
              </TsButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
