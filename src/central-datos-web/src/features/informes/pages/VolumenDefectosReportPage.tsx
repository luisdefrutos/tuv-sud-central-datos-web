import React, { useState, useMemo } from 'react';
import { TsButton, TsCard, TsBadge, TsIcon } from '@tuvsud/design-system/react';
import { ReportPageHeader } from '../components/ReportPageHeader';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportDateRangeAlert } from '../components/ReportDateRangeAlert';
import { ReportTableContainer } from '../components/ReportTableContainer';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportDonutChart } from '../components/ReportDonutChart';
import { ReportPaginationBar } from '../components/ReportPaginationBar';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { SortIndicator } from '../../../components/common/SortIndicator';
import {
  useVolumenDefectosReport,
  type SortableVolumenDefectosColumn,
  CATEGORIAS_DEFECTOS_MAP,
} from '../hooks/useVolumenDefectosReport';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import type { ReportBarChartPoint } from '../types/informes.types';

interface VolumenDefectosReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const VolumenDefectosReportPage: React.FC<VolumenDefectosReportPageProps> = ({
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
    consultar,
    exportarExcel,
    bloques,
    elementos,
    bloqueSeleccionado,
    setBloqueSeleccionado,
    defectoSeleccionado,
    setDefectoSeleccionado,
  } = useVolumenDefectosReport();

  const {
    filasPaginadas,
    totalFilas,
    totalPaginas,
    page,
    pageSize,
    setPage,
    setPageSize,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
  } = table;

  const hayDatosParaExportar = data && data.filas && data.filas.length > 0;

  // Selector de Vista Gráfica (Barras de Estaciones vs Donut por Categoría)
  const [vistaGrafica, setVistaGrafica] = useState<'estaciones' | 'categorias'>('estaciones');

  // Puntos para ReportBarChart (Ranking por Estación: incluye todas las estaciones con scroll continuo)
  const puntosEstacionesChart: ReportBarChartPoint[] = useMemo(() => {
    if (!data) return [];

    // Mapa de estaciones devueltas por la consulta con defectos registrados
    const estacionesConDatosMap = new Map<string, { label: string; valor: number; valorFormateado: string; subtitulo: string; color: string }>();
    (data.graficoEstaciones || []).forEach((p) => {
      const codPadded = p.id.padStart(4, '0');
      estacionesConDatosMap.set(codPadded, p);
      estacionesConDatosMap.set(p.id, p);
    });

    // Lista de estaciones seleccionadas en los filtros (si no hay ninguna explícita, se toman todas las permitidas)
    const codigosSeleccionados = filters.estacionesSeleccionadas.length > 0
      ? filters.estacionesSeleccionadas
      : ESTACIONES_OFICIALES.map((e) => e.codigo);

    // Mapear todas las estaciones para que salgan absolutamente todas las seleccionadas
    const listaCompleta: ReportBarChartPoint[] = codigosSeleccionados.map((cod) => {
      const codPadded = cod.padStart(4, '0');
      const datosEst = estacionesConDatosMap.get(cod) || estacionesConDatosMap.get(codPadded);
      const estOficial = ESTACIONES_OFICIALES.find((e) => e.codigo === cod || e.codigo === codPadded);
      const nombreEst = estOficial?.descripcion || `I.T.V. - ${codPadded}`;
      const sociedad = estOficial?.sociedad || (codPadded.startsWith('09') ? 'CAL' : 'TSA');
      const color = sociedad === 'CAL' ? '#00875a' : '#0046ad';

      if (datosEst) {
        return {
          id: codPadded,
          label: datosEst.label,
          valor: datosEst.valor,
          valorFormateado: datosEst.valorFormateado,
          tooltipSubtitle: datosEst.subtitulo,
          color: datosEst.color || color,
        };
      }

      return {
        id: codPadded,
        label: `${codPadded} - ${nombreEst}`,
        valor: 0,
        valorFormateado: '0 defectos (0,0%)',
        tooltipSubtitle: `${sociedad}: 0 defectos detectados en el periodo`,
        color,
      };
    });

    // Ordenar descendente por número de defectos y alfabético en empates
    return listaCompleta.sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));
  }, [data, filters.estacionesSeleccionadas]);

  // Puntos para ReportDonutChart (Categorías de Vehículo)
  const puntosDonutChart: ReportBarChartPoint[] = useMemo(() => {
    return (data?.graficoCategorias || []).map((p) => ({
      id: p.id,
      label: p.label,
      valor: p.valor,
      valorFormateado: p.valorFormateado,
      tooltipSubtitle: p.subtitulo,
      color: p.color,
    }));
  }, [data?.graficoCategorias]);

  // Filtrado interactivo con navegación suave y halo focal hacia el buscador
  const filtrarPorValor = (valor?: string | null) => {
    const termino = String(valor ?? '').trim();
    // Si ya tiene este filtro puesto, al volver a pinchar se limpia (toggle intuitivo)
    const nuevoTermino = searchTerm.trim().toLowerCase() === termino.toLowerCase() ? '' : termino;
    setSearchTerm(nuevoTermino);
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
        title="Consultando Volumen de Defectos"
        message="Analizando la concentración de defectos por tipología, gravedad y categoría de vehículo..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando el libro Excel oficial de volumen de defectos detectados..."
      />

      {/* 1. Cabecera Oficial del Informe */}
      <ReportPageHeader
        title="Volumen de Defectos Detectados"
        subtitle="Auditoría técnica de tipología y frecuencia de defectos en inspecciones periódicas por grupo de vehículo y gravedad."
        icon="warning"
        breadcrumbItemText="Volumen de defectos"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          title="Exportar a Excel Oficial"
          subtitle="Libro .xlsx consolidado y multi-estación"
          content="Descarga el libro Excel idéntico al de la aplicación de escritorio, con una pestaña de totales y hojas individuales por estación."
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
        onConsultar={consultar}
        loading={isLoading}
      />

      {/* Filtros específicos de Bloque y Defecto/Elemento */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          backgroundColor: '#ffffff',
          padding: '0.65rem 1rem',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#003366' }}>
            Bloque (Capítulo):
          </label>
          <select
            value={bloqueSeleccionado}
            onChange={(e) => setBloqueSeleccionado(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              minWidth: '220px',
            }}
          >
            <option value="">-- Todos los Bloques --</option>
            {bloques.map((b) => (
              <option key={b.codigo} value={b.codigo}>
                {b.descripcion}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#003366' }}>
            Elemento / Defecto:
          </label>
          <select
            value={defectoSeleccionado}
            onChange={(e) => setDefectoSeleccionado(e.target.value)}
            disabled={!bloqueSeleccionado || bloqueSeleccionado === 'TODOS'}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              fontSize: '0.82rem',
              backgroundColor: !bloqueSeleccionado ? '#f1f5f9' : '#ffffff',
              color: '#1e293b',
              minWidth: '240px',
            }}
          >
            <option value="">-- Todos los Elementos --</option>
            {elementos.map((el) => (
              <option key={el.codigo} value={el.codigo}>
                {el.descripcion}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Banner de alerta de fechas */}
      <ReportDateRangeAlert
        mensaje={filters.alertaRangoFechas}
        onAjustarAUnAno={filters.ajustarAUnAno}
      />

      {/* 4. Tarjetas de KPIs Ejecutivos Dinámicos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {isLoading ? (
          <>
            <TsCard style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>Cargando KPIs...</TsCard>
            <TsCard style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>Cargando KPIs...</TsCard>
            <TsCard style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>Cargando KPIs...</TsCard>
            <TsCard style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>Cargando KPIs...</TsCard>
          </>
        ) : (
          data?.kpis.map((kpi) => {
            let tooltipContent = 'Clic para interactuar con la tabla';
            let onClickAction = () => {};

            if (kpi.id === 'total-defectos') {
              tooltipContent = 'Clic para restablecer los filtros y mostrar todos los defectos detectados en la tabla.';
              onClickAction = () => {
                setSearchTerm('');
                filtrarPorValor('');
              };
            } else if (kpi.id === 'defectos-graves') {
              tooltipContent = 'Clic para filtrar en la tabla únicamente los defectos con rechazo reglamentario (Graves y Muy Graves).';
              onClickAction = () => filtrarPorValor('Rechazo');
            } else if (kpi.id === 'grupo-lider') {
              tooltipContent = `Clic para filtrar en la tabla por la categoría líder: ${kpi.valor}.`;
              onClickAction = () => {
                const match = kpi.valor.match(/\((.*?)\)/);
                const catCod = match ? match[1] : kpi.valor.split(' ')[0];
                filtrarPorValor(catCod);
              };
            } else if (kpi.id === 'defecto-top') {
              tooltipContent = `Clic para filtrar en la tabla por el código del defecto top: ${kpi.valor}.`;
              onClickAction = () => filtrarPorValor(kpi.valor);
            }

            return (
              <AppTooltip
                key={kpi.id}
                title={kpi.titulo}
                subtitle={kpi.subtitulo}
                content={tooltipContent}
                position="bottom"
              >
                <div
                  onClick={onClickAction}
                  style={{
                    padding: '1.15rem 1.25rem',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 51, 102, 0.1)';
                    e.currentTarget.style.borderColor = '#0046ad';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>{kpi.icon}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                      {kpi.titulo}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#003366', fontVariantNumeric: 'tabular-nums' }}>
                    {kpi.valor}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    {kpi.subtitulo}
                  </div>
                </div>
              </AppTooltip>
            );
          })
        )}
      </div>

      {/* 5. Selector de Vista Gráfica y Gráficos */}
      {data && data.filas && data.filas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="bar_chart" style={{ fontSize: '15px' }} /><span>Ranking por Estación</span></span></button>
              <button
                type="button"
                onClick={() => setVistaGrafica('categorias')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: vistaGrafica === 'categorias' ? '#003366' : '#cbd5e1',
                  backgroundColor: vistaGrafica === 'categorias' ? '#003366' : '#ffffff',
                  color: vistaGrafica === 'categorias' ? '#ffffff' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: vistaGrafica === 'categorias' ? '0 2px 6px rgba(0, 51, 102, 0.2)' : 'none',
                }}
              ><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="pie_chart" style={{ fontSize: '15px' }} /><span>Reparto por Categoría</span></span></button>
            </div>
          </div>

          {vistaGrafica === 'estaciones' ? (
            <ReportBarChart
              title="Ranking de Estaciones por Volumen de Defectos"
              subtitle="Concentración de defectos detectados por centro ITV (Azul: TSA, Verde: CAL)"
              data={puntosEstacionesChart}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} defectos`}
            />
          ) : (
            <ReportDonutChart
              title="Distribución de Defectos por Categoría de Vehículo"
              subtitle="Cuota de defectos detectados según tipo de vehículo homologado"
              data={puntosDonutChart}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} defectos`}
            />
          )}
        </div>
      )}

      {/* 6. Grid Paginado con Columnas de Defectos y Scroll Vertical */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por código (01.02.03), gravedad (G, MG, L), grupo (M1), descripción o estación..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={isLoading || !hayDatosParaExportar}
        unidadRegistros="defectos tipificados"
      >
        <div
          className="cd-touch-scroll"
          style={{
            width: '100%',
            maxHeight: '620px',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          <table className="cd-data-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              textAlign: 'left',
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 3,
                backgroundColor: '#003366',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              <tr style={{ backgroundColor: '#003366', color: '#ffffff' }}>
              <th
                onClick={() => handleSort('codEstacion')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', minWidth: '120px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Estación</span>
                  <SortIndicator direction={sortColumn === 'codEstacion' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('grupoCategoria')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', minWidth: '110px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Grupo Cat.</span>
                  <SortIndicator direction={sortColumn === 'grupoCategoria' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('codigoCompleto')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', minWidth: '95px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Cód. Defecto</span>
                  <SortIndicator direction={sortColumn === 'codigoCompleto' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('gravedad')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', minWidth: '85px', textAlign: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span>Gravedad</span>
                  <SortIndicator direction={sortColumn === 'gravedad' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('descripcion')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', minWidth: '280px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Descripción Oficial del Defecto</span>
                  <SortIndicator direction={sortColumn === 'descripcion' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('numDefectos')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', textAlign: 'right', fontWeight: 700, minWidth: '100px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>Casos</span>
                  <SortIndicator direction={sortColumn === 'numDefectos' ? sortDirection : null} />
                </div>
              </th>
              <th
                onClick={() => handleSort('pctSobreTotal')}
                style={{ padding: '10px 12px', cursor: 'pointer', userSelect: 'none', textAlign: 'right', minWidth: '80px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <span>% Total</span>
                  <SortIndicator direction={sortColumn === 'pctSobreTotal' ? sortDirection : null} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="hourglass_empty" style={{ fontSize: '14px' }} /><span>Cargando datos de volumen de defectos...</span></span>
                </td>
              </tr>
            ) : filasPaginadas.length > 0 ? (
              filasPaginadas.map((fila, idx) => (
                <tr
                  key={`${fila.codEstacion}_${fila.codigoCompleto}_${idx}`}
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
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#003366' }}>
                    <AppTooltip
                      title={`Estación: ${fila.desEstacion}`}
                      subtitle={`Código: ${fila.codEstacion} | Sociedad: ${fila.claveSociedad}`}
                      content="Clic para filtrar el grid por esta estación."
                      position="top"
                    >
                      <span
                        onClick={() => filtrarPorValor(fila.codEstacion)}
                        style={{ cursor: 'pointer', color: '#0046ad' }}
                      >
                        {fila.codEstacion} - {fila.desEstacion}
                      </span>
                    </AppTooltip>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {(() => {
                      const catInfo = CATEGORIAS_DEFECTOS_MAP[fila.grupoCategoria];
                      const codCat = fila.grupoCategoria.replace('Grupo_', '');
                      return (
                        <AppTooltip
                          title={`Categoría: ${catInfo?.desc || fila.grupoCategoria}`}
                          subtitle={`Código ITV: ${codCat}`}
                          content="Clic para filtrar la tabla por esta categoría de vehículo."
                          position="top"
                        >
                          <span
                            onClick={() => filtrarPorValor(codCat)}
                            style={{
                              cursor: 'pointer',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              fontWeight: 700,
                              color: '#1e293b',
                              border: '1px solid #cbd5e1',
                              display: 'inline-block',
                              fontSize: '0.8rem',
                            }}
                          >
                            {codCat}
                          </span>
                        </AppTooltip>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                    <AppTooltip
                      title={`Defecto Tipificado: ${fila.codigoCompleto}`}
                      subtitle={`Bloque ${fila.bloque} · Defecto ${fila.defecto} · Subdefecto ${fila.subdefecto}`}
                      content="Clic para filtrar la tabla por este código de defecto."
                      position="top"
                    >
                      <span
                        onClick={() => filtrarPorValor(fila.codigoCompleto)}
                        style={{ cursor: 'pointer', color: '#0f172a' }}
                      >
                        {fila.codigoCompleto}
                      </span>
                    </AppTooltip>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <AppTooltip
                      title={fila.gravedad === 'MG' ? 'Muy Grave (MG)' : fila.gravedad === 'G' ? 'Grave (G)' : 'Leve (L)'}
                      subtitle={fila.gravedad === 'L' ? 'Sin rechazo (Inspección Favorable)' : 'Con rechazo reglamentario (Inspección Desfavorable o Negativa)'}
                      content="Clic para filtrar la tabla por esta gravedad."
                      position="top"
                    >
                      <span
                        onClick={() => filtrarPorValor(fila.gravedad === 'MG' ? 'MG' : fila.gravedad === 'G' ? 'G' : 'L')}
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                      >
                        <TsBadge
                          size="small"
                          variant={fila.gravedad === 'MG' ? 'danger' : fila.gravedad === 'G' ? 'warning' : 'neutral'}
                        >
                          {fila.gravedad === 'MG' ? 'Muy Grave' : fila.gravedad === 'G' ? 'Grave' : 'Leve'}
                        </TsBadge>
                      </span>
                    </AppTooltip>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>
                    {fila.descripcion}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#003366' }}>
                    {fila.numDefectos.toLocaleString('es-ES')}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>
                    {fila.pctSobreTotal.toFixed(2)} %
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No se encontraron defectos en el rango de fechas y filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* 7. Barra de Paginación Oficial Homogénea */}
        <ReportPaginationBar
          page={page}
          pageSize={pageSize}
          totalFilas={totalFilas}
          totalPaginas={totalPaginas}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[50, 100, 200, 500, 1000]}
          unidadRegistros="defectos tipificados"
        />
      </ReportTableContainer>
    </div>
  );
};
export default VolumenDefectosReportPage;
