import React, { useState, useMemo } from 'react';
import { TsButton, TsAlert } from '@tuvsud/design-system/react';
import { useInspRangoHorarioReport } from '../hooks/useInspRangoHorarioReport';
import { ReportPageHeader } from '../components/ReportPageHeader';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportDateRangeAlert } from '../components/ReportDateRangeAlert';
import { ReportHeatmapChart } from '../components/ReportHeatmapChart';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportDonutChart } from '../components/ReportDonutChart';
import { ReportTableContainer } from '../components/ReportTableContainer';
import { ReportPaginationBar } from '../components/ReportPaginationBar';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { SortIndicator } from '../../../components/common/SortIndicator';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import type { SortableInspRangoHorarioColumn } from '../hooks/useInspRangoHorarioReport';
import type { ReportBarChartPoint } from '../types/informes.types';

export interface InspRangoHorarioReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const InspRangoHorarioReportPage: React.FC<InspRangoHorarioReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    filters,
    table,
    fase,
    setFase,
    exportarExcel,
    recargar,
  } = useInspRangoHorarioReport();

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

  // Estados de vista gráfica condicional (Heatmap vs Distribución por Estaciones)
  const [vistaGrafica, setVistaGrafica] = useState<'heatmap' | 'estaciones'>('heatmap');
  const [subModoEstaciones, setSubModoEstaciones] = useState<'bar' | 'donut'>('bar');

  const puntosGraficoEstaciones: ReportBarChartPoint[] = useMemo(() => {
    return (data?.graficoEstaciones || []).map((e) => {
      const cod = (e.codEstacion || '').trim().padStart(4, '0');
      const esCal = e.sociedad === 'CAL' || cod.startsWith('09') || ['0902', '0903', '0906', '0908'].includes(cod);
      const soc = esCal ? 'CAL' : 'TSA';
      return {
        id: e.codEstacion,
        label: `${e.codEstacion} - ${e.desEstacion}`,
        valor: e.totalInspecciones,
        valorFormateado: `${e.totalInspecciones.toLocaleString('es-ES')} insp. (${e.pctSobreTotal})`,
        tooltipSubtitle: `${e.totalInspecciones.toLocaleString('es-ES')} inspecciones (${e.pctSobreTotal})`,
        sociedad: soc,
        color: soc === 'CAL' ? '#00875a' : '#0046ad',
      };
    });
  }, [data?.graficoEstaciones]);

  const hayMultiplesEstaciones = (data?.graficoEstaciones?.length ?? 0) > 1;

  // Franja horaria destacada visualmente en el grid (por búsqueda "10h" o al ordenar por esa columna)
  const horaDestacada = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const m = raw.match(/^(?:hora\s*|h)?(0?[6-9]|1[0-9]|2[0-1])(?:\s*h|:00)?/i);
    if (m && (raw.includes('h') || raw.includes(':') || raw.startsWith('hora'))) {
      return m[1].padStart(2, '0');
    }
    if (sortColumn && sortColumn.startsWith('h')) {
      return sortColumn.slice(1);
    }
    return null;
  }, [searchTerm, sortColumn]);

  // Día de la semana destacado en el heatmap si el usuario busca por día
  const diaDestacado = useMemo(() => {
    const raw = searchTerm.trim().toLowerCase();
    const dias = ['lunes', 'martes', 'miércoles', 'miercoles', 'jueves', 'viernes', 'sábado', 'sabado'];
    const found = dias.find((d) => raw.includes(d));
    if (!found) return null;
    if (found.startsWith('mier')) return 'Miércoles';
    if (found.startsWith('sab')) return 'Sábado';
    return found.charAt(0).toUpperCase() + found.slice(1);
  }, [searchTerm]);

  // Filtrado interactivo con navegación suave y halo de foco hacia el buscador
  const filtrarPorValor = (valor?: string | null) => {
    const termino = String(valor ?? '').trim();
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: 'clamp(0.75rem, 2vw, 1.5rem)',
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      {/* 0. Modales de carga bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Inspecciones por Rango Horario"
        message="Calculando distribución por franja horaria (06 a 21 h) y matriz de calor semanal..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando el libro Excel oficial de inspecciones por rango horario..."
      />

      {/* 1. Cabecera Oficial del Informe */}
      <ReportPageHeader
        title="Inspecciones por Rango Horario"
        subtitle="Análisis de distribución de afluencia e inspecciones realizadas por franja horaria (06:00 a 21:00 h) y mapa térmico semanal."
        icon="⏰"
        breadcrumbItemText="Inspecciones por rango horario"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          title="Exportar a Excel Oficial"
          subtitle="Libro .xlsx consolidado y multi-estación"
          content="Descarga el libro Excel idéntico al de la aplicación de escritorio, con sumatorios por fila y columna por estación."
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
        onFechaInicioChange={filters.handleFechaInicioChange}
        onFechaFinChange={filters.handleFechaFinChange}
        onSociedadChange={filters.setSociedad}
        onEstacionesChange={filters.setEstacionesSeleccionadas}
        onConsultar={recargar}
        loading={isLoading}
      />

      {/* Selector de Fase (Opcional - Todas / Primera / Segunda) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '0.6rem 1rem',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '0.85rem',
        }}
      >
        <span style={{ fontWeight: 600, color: '#003366' }}>Fase de Inspección:</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: '', label: 'Todas las Fases' },
            { id: '1', label: '1ª Inspección (Periódicas)' },
            { id: '2', label: '2ª Inspección (Reiteradas)' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFase(f.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: fase === f.id ? '#003366' : '#cbd5e1',
                backgroundColor: fase === f.id ? '#003366' : '#ffffff',
                color: fase === f.id ? '#ffffff' : '#475569',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Alertas de Validación */}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          width: '100%',
        }}
      >
        {data && data.kpis && data.kpis.length > 0 ? (
          data.kpis.map((kpi, index) => {
            let tooltipContent = kpi.subtitulo;
            let esClicable = false;
            if (kpi.id === 'total-inspecciones') {
              tooltipContent = 'Haga clic para restablecer el buscador y ver todas las jornadas.';
              esClicable = true;
            } else if (kpi.id === 'dia-pico') {
              tooltipContent = `Haga clic para filtrar el grid por el día ${kpi.valor}.`;
              esClicable = true;
            } else if (kpi.id === 'hora-punta' && data.horaPunta && data.horaPunta !== '-') {
              tooltipContent = `Haga clic para filtrar las jornadas con carga en la hora punta (${data.horaPunta.slice(0, 2)}h).`;
              esClicable = true;
            } else if (kpi.id === 'estacion-demanda') {
              tooltipContent = `Haga clic para filtrar el grid por la estación con mayor demanda (${kpi.valor}).`;
              esClicable = true;
            }

            return (
              <AppTooltip
                key={`${kpi.id}_${index}`}
                title={kpi.titulo}
                subtitle="Indicador ejecutivo"
                content={tooltipContent}
                position="top"
              >
                <div
                  onClick={() => {
                    if (kpi.id === 'total-inspecciones') {
                      filtrarPorValor('');
                    } else if (kpi.id === 'dia-pico') {
                      filtrarPorValor(kpi.valor);
                    } else if (kpi.id === 'hora-punta' && data.horaPunta && data.horaPunta !== '-') {
                      const hora = data.horaPunta.slice(0, 2);
                      filtrarPorValor(`${hora}h`);
                    } else if (kpi.id === 'estacion-demanda') {
                      filtrarPorValor(kpi.valor);
                    }
                  }}
                  style={{
                    cursor: esClicable ? 'pointer' : 'default',
                    borderRadius: '8px',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (esClicable) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 43, 73, 0.12)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
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
            { id: 'total-inspecciones', title: 'Total Inspecciones', value: isLoading ? '...' : '0', subtitle: 'Jornadas analizadas', icon: '📊', variant: 'neutral' as const },
            { id: 'hora-punta', title: 'Hora Punta de Demanda', value: isLoading ? '...' : '-', subtitle: 'Cálculo en curso', icon: '⏰', variant: 'warning' as const },
            { id: 'dia-pico', title: 'Día con Mayor Afluencia', value: isLoading ? '...' : '-', subtitle: 'Cálculo en curso', icon: '📅', variant: 'neutral' as const },
            { id: 'promedio-hora', title: 'Promedio Insp. / Hora', value: isLoading ? '...' : '0', subtitle: 'Por hora activa', icon: '⚡', variant: 'success' as const },
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

      {/* 5. Selector de Vista Gráfica Condicional y Gráficos */}
      {data && data.heatmap && data.heatmap.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Selector condicional: Solo si hay más de 1 estación analizada */}
          {hayMultiplesEstaciones && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '4px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setVistaGrafica('heatmap')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: vistaGrafica === 'heatmap' ? '#003366' : '#cbd5e1',
                    backgroundColor: vistaGrafica === 'heatmap' ? '#003366' : '#ffffff',
                    color: vistaGrafica === 'heatmap' ? '#ffffff' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: vistaGrafica === 'heatmap' ? '0 2px 6px rgba(0, 51, 102, 0.2)' : 'none',
                  }}
                >
                  📅 Matriz Térmica Horaria (Heatmap)
                </button>
                <button
                  type="button"
                  onClick={() => setVistaGrafica('estaciones')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: vistaGrafica === 'estaciones' ? '#003366' : '#cbd5e1',
                    backgroundColor: vistaGrafica === 'estaciones' ? '#003366' : '#ffffff',
                    color: vistaGrafica === 'estaciones' ? '#ffffff' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: vistaGrafica === 'estaciones' ? '0 2px 6px rgba(0, 51, 102, 0.2)' : 'none',
                  }}
                >
                  📊 Distribución por Estaciones ({data.graficoEstaciones?.length})
                </button>
              </div>

              {vistaGrafica === 'estaciones' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSubModoEstaciones('bar')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: subModoEstaciones === 'bar' ? 700 : 500,
                      backgroundColor: subModoEstaciones === 'bar' ? '#0046ad' : '#ffffff',
                      color: subModoEstaciones === 'bar' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    📊 Barras
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubModoEstaciones('donut')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: subModoEstaciones === 'donut' ? 700 : 500,
                      backgroundColor: subModoEstaciones === 'donut' ? '#0046ad' : '#ffffff',
                      color: subModoEstaciones === 'donut' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    🍩 Donut
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Renderizado de la vista gráfica activa */}
          {vistaGrafica === 'heatmap' || !hayMultiplesEstaciones ? (
            <ReportHeatmapChart
              heatmapData={data.heatmap}
              totalInspecciones={data.totalInspecciones}
              selectedHora={horaDestacada}
              selectedDia={diaDestacado}
              onSelectDia={(dia) => filtrarPorValor(dia)}
              onSelectHora={(hora) => filtrarPorValor(`${hora}h`)}
              onSelectCelda={(dia, hora) => filtrarPorValor(`${dia} ${hora}h`)}
            />
          ) : subModoEstaciones === 'bar' ? (
            <ReportBarChart
              title="Volumen Total de Inspecciones por Estación ITV"
              subtitle="Distribución de demanda total en el periodo analizado"
              data={puntosGraficoEstaciones}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            />
          ) : (
            <ReportDonutChart
              title="Cuota Porcentual de Inspecciones por Estación"
              subtitle="Reparto de demanda entre los centros de la red seleccionada"
              data={puntosGraficoEstaciones}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
            />
          )}
        </div>
      )}

      {/* 6. Grid Paginado con Columnas de Franjas Horarias */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por fecha (16/06/2026), día (Martes), franja (ej. 10h, 10:00, 10h > 5) o total..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={isLoading || !hayDatosParaExportar}
        unidadRegistros="días analizados"
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#003366', color: '#ffffff' }}>
              <th
                onClick={() => handleSort('fecha')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', position: 'sticky', left: 0, backgroundColor: '#003366', zIndex: 2 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Fecha</span>
                  <SortIndicator direction={sortColumn === 'fecha' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('diaSemana')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Día</span>
                  <SortIndicator direction={sortColumn === 'diaSemana' ? sortDirection : null} />
                </div>
              </th>
              {['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'].map((h) => {
                const colKey = `h${h}` as SortableInspRangoHorarioColumn;
                const estaColumnaDestacada = horaDestacada === h;
                return (
                  <th
                    key={h}
                    onClick={() => handleSort(colKey)}
                    style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      minWidth: '46px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      backgroundColor: estaColumnaDestacada ? '#0284c7' : '#003366',
                      borderLeft: estaColumnaDestacada ? '2px solid #0284c7' : undefined,
                      borderRight: estaColumnaDestacada ? '2px solid #0284c7' : undefined,
                      boxShadow: estaColumnaDestacada ? 'inset 0 3px 0 #38bdf8, 0 2px 6px rgba(2, 132, 199, 0.4)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title={`Haga clic para ordenar por volumen de inspecciones a las ${h}:00 h`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span style={{ color: estaColumnaDestacada ? '#ffffff' : '#ffffff', fontWeight: estaColumnaDestacada ? 900 : 600 }}>
                        {h}h
                      </span>
                      <SortIndicator direction={sortColumn === colKey ? sortDirection : null} />
                    </div>
                  </th>
                );
              })}
              <th
                onClick={() => handleSort('totalFila')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', textAlign: 'right', fontWeight: 700 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Total</span>
                  <SortIndicator direction={sortColumn === 'totalFila' ? sortDirection : null} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={19} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  ⏳ Cargando datos de inspecciones por rango horario...
                </td>
              </tr>
            ) : filasPaginadas.length > 0 ? (
              filasPaginadas.map((fila, idx) => (
                <tr
                  key={`${fila.fechaFormatted}_${idx}`}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf5ff')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc')
                  }
                >
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#003366', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', zIndex: 1 }}>
                    {fila.fechaFormatted}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <AppTooltip
                      title={`Día: ${fila.diaSemana}`}
                      subtitle="Clic para filtrar por este día de la semana"
                      content={`Filtrar el grid para ver todos los ${fila.diaSemana}.`}
                      position="top"
                    >
                      <span
                        onClick={() => filtrarPorValor(fila.diaSemana)}
                        style={{
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          fontWeight: 600,
                          color: '#334155',
                        }}
                      >
                        {fila.diaSemana}
                      </span>
                    </AppTooltip>
                  </td>
                  {[
                    fila.h06, fila.h07, fila.h08, fila.h09, fila.h10, fila.h11, fila.h12, fila.h13,
                    fila.h14, fila.h15, fila.h16, fila.h17, fila.h18, fila.h19, fila.h20, fila.h21,
                  ].map((val, hIdx) => {
                    const hStr = (hIdx + 6).toString().padStart(2, '0');
                    const estaColumnaDestacada = horaDestacada === hStr;
                    return (
                      <td
                        key={hIdx}
                        style={{
                          padding: '8px 4px',
                          textAlign: 'center',
                          color: val === 0 ? (estaColumnaDestacada ? '#64748b' : '#94a3b8') : estaColumnaDestacada ? '#002b49' : '#0f172a',
                          fontWeight: estaColumnaDestacada ? 800 : val > 0 ? 600 : 400,
                          backgroundColor: estaColumnaDestacada
                            ? '#e0f2fe'
                            : val > 50
                            ? 'rgba(0, 114, 206, 0.08)'
                            : 'transparent',
                          borderLeft: estaColumnaDestacada ? '2px solid #0284c7' : undefined,
                          borderRight: estaColumnaDestacada ? '2px solid #0284c7' : undefined,
                        }}
                      >
                        {val > 0 ? val : '-'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#003366', fontSize: '0.88rem' }}>
                    {fila.totalFila.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={19} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No se encontraron inspecciones en el rango de fechas y filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <ReportPaginationBar
            page={page}
            pageSize={pageSize}
            totalFilas={totalFilas}
            totalPaginas={totalPaginas}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            unidadRegistros="días analizados"
          />
        )}
      </ReportTableContainer>
    </div>
  );
};
