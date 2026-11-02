import React, { useState, useEffect, useMemo } from 'react';
import {
  TsButton,
  TsAlert,
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsBadge,
} from '@tuvsud/design-system/react';
import { useDefectoObdReport } from '../hooks/useDefectoObdReport';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportDonutChart } from '../components/ReportDonutChart';
import { ReportTableContainer } from '../components/ReportTableContainer';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { SortIndicator } from '../../../components/common/SortIndicator';
import { AppTooltip } from '../../../components/common/AppTooltip';
import type { SortableDefectoObdColumn, FilaDefectoObd } from '../types/informes.types';

export interface DefectoObdReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const DefectoObdReportPage: React.FC<DefectoObdReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    fase,
    setFase,
    data,
    isLoading,
    error,
    alertaRangoFechas,
    isExporting,
    exportError,
    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    chartMode,
    setChartMode,
    filaSeleccionada,
    setFilaSeleccionada,
    filasFiltradasYOrdenadas,
    handleFechaInicioChange,
    handleFechaFinChange,
    ajustarAUnAno,
    setSociedad,
    setEstacionesSeleccionadas,
    fetchReport,
    handleSort,
    exportarExcel,
  } = useDefectoObdReport();

  // Modal de Detalle Técnico de Inspección
  const [modalDetalleOpen, setModalDetalleOpen] = useState<boolean>(false);

  // Estados de Paginación de la Tabla
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Reiniciar a la primera página cuando cambian los filtros, la búsqueda o el orden
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortColumn, sortDirection, data]);

  const totalFilas = filasFiltradasYOrdenadas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFilas / pageSize));
  const pageActual = Math.min(currentPage, totalPaginas);
  const inicioIndice = (pageActual - 1) * pageSize;
  const finIndice = Math.min(inicioIndice + pageSize, totalFilas);

  const filasPaginadas = useMemo(() => {
    return filasFiltradasYOrdenadas.slice(inicioIndice, finIndice);
  }, [filasFiltradasYOrdenadas, inicioIndice, finIndice]);

  const handleVerDetalle = (fila: FilaDefectoObd) => {
    setFilaSeleccionada(fila);
    setModalDetalleOpen(true);
  };

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
          <TsBreadcrumbItem active>Informe inspecciones con defecto OBD</TsBreadcrumbItem>
        </TsBreadcrumb>

        {onNavigateToInformes && (
          <TsButton
            variant="secondary"
            size="small"
            onClick={onNavigateToInformes}
            style={{ fontSize: '0.82rem' }}
          >
            ← Volver a Informes
          </TsButton>
        )}
      </div>

      {/* 2. Cabecera Corporativa de la Vista */}
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
            <span style={{ fontSize: '1.75rem' }}>🔌</span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              Informe de Inspecciones con Defecto OBD
            </h1>
          </div>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              color: '#64748b',
              fontSize: '0.86rem',
              lineHeight: 1.4,
            }}
          >
            Control y auditoría técnica de inspecciones periódicas con defectos de lectura o emisión OBD (Bloque 15) en la red ITV
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <AppTooltip content="Descarga el libro oficial Excel (.xlsx) con pestañas individuales por cada estación (DEFECTOS_OBD_XXXX)" position="bottom">
            <span>
              <TsButton
                variant="primary"
                size="medium"
                onClick={exportarExcel}
                disabled={isLoading || isExporting || !data || data.filas.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isExporting ? '⏳ Generando Excel...' : '📊 Exportar a Excel'}
              </TsButton>
            </span>
          </AppTooltip>
        </div>
      </div>

      {/* 3. Barra Unificada de Filtros */}
      <ReportFiltersBar
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        sociedad={sociedad}
        estacionesSeleccionadas={estacionesSeleccionadas}
        fase={fase}
        onFaseChange={setFase}
        onFechaInicioChange={handleFechaInicioChange}
        onFechaFinChange={handleFechaFinChange}
        onSociedadChange={setSociedad}
        onEstacionesChange={setEstacionesSeleccionadas}
        onConsultar={() => fetchReport()}
        loading={isLoading}
      />

      {/* 4. Alertas de Validación Reactiva o Errores de Red */}
      {alertaRangoFechas && (
        <TsAlert
          variant="warning"
          open
          heading="Validación de Rango de Fechas"
          style={{ fontSize: '0.88rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
            <span>⚠️ {alertaRangoFechas}</span>
            <button
              type="button"
              onClick={ajustarAUnAno}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0046ad',
                cursor: 'pointer',
              }}
            >
              Ajustar a 1 año
            </button>
          </div>
        </TsAlert>
      )}

      {error && !alertaRangoFechas && (
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

      {/* 5. Tarjetas KPIs Ejecutivas */}
      {data && data.kpis && data.kpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {data.kpis.map((kpi, index) => (
            <ReportKpiCard
              key={`${kpi.titulo}_${index}`}
              title={kpi.titulo}
              value={kpi.valor}
              subtitle={kpi.subtitulo}
              icon={kpi.icon}
              variant={kpi.variant}
            />
          ))}
        </div>
      )}

      {/* 6. Selector de Visualización Gráfica */}
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Vista del Gráfico:</span>
            <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
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
                📊 Ranking por Estación
              </button>
              <button
                type="button"
                onClick={() => setChartMode('tipologia')}
                style={{
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: chartMode === 'tipologia' ? 700 : 500,
                  backgroundColor: chartMode === 'tipologia' ? '#0046ad' : '#ffffff',
                  color: chartMode === 'tipologia' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🍩 Tipología de Defecto OBD
              </button>
              <button
                type="button"
                onClick={() => setChartMode('combustible')}
                style={{
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: chartMode === 'combustible' ? 700 : 500,
                  backgroundColor: chartMode === 'combustible' ? '#0046ad' : '#ffffff',
                  color: chartMode === 'combustible' ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ⛽ Distribución Combustible
              </button>
            </div>
          </div>

          {/* Gráfico Activo */}
          {chartMode === 'estaciones' && (
            <ReportBarChart
              title="Ranking de Estaciones con Defectos OBD"
              subtitle="Volumen de incidencias y lecturas OBD anómalas detectadas por centro ITV (Diésel y Gasolina)"
              data={data.graficoEstaciones}
            />
          )}

          {chartMode === 'tipologia' && (
            <ReportDonutChart
              title="Distribución por Tipología de Defecto OBD"
              subtitle="Cuota de incidencias según tipología reglamentaria oficial del manual ITV (MIL, conector, códigos DTC)"
              data={data.graficoTipologia}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} def.`}
            />
          )}

          {chartMode === 'combustible' && (
            <ReportDonutChart
              title="Distribución por Combustible / Motorización"
              subtitle="Proporción de vehículos Diésel (Código 15.03) vs Gasolina (Código 15.02) con anomalías OBD"
              data={data.graficoCombustible}
              valueFormatter={(val) => `${val.toLocaleString('es-ES')} def.`}
            />
          )}
        </div>
      )}

      {/* 7. Tabla Detallada de Inspecciones */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por matrícula, estación, vehículo o código de defecto..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={isLoading || isExporting || !data || data.filas.length === 0}
        unidadRegistros="registros"
      >
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table
            className="cd-table"
            style={{
              width: '100%',
              minWidth: '1210px',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
            }}
          >
            <colgroup>
              <col style={{ width: '105px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '85px' }} />
              <col style={{ width: '125px' }} />
              <col style={{ width: '155px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '110px' }} />
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
                  onClick={() => handleSort('marca')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Vehículo <SortIndicator direction={sortColumn === 'marca' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('tipoCombustible')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Motor <SortIndicator direction={sortColumn === 'tipoCombustible' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('codigoDefectoCompleto')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Código Defecto <SortIndicator direction={sortColumn === 'codigoDefectoCompleto' ? sortDirection : null} />
                </th>
                <th
                  onClick={() => handleSort('gravedadDefecto')}
                  style={{ padding: '0.65rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Gravedad <SortIndicator direction={sortColumn === 'gravedadDefecto' ? sortDirection : null} />
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
                  <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    {isLoading
                      ? 'Cargando inspecciones con defecto OBD...'
                      : alertaRangoFechas
                        ? 'Indique un rango de fechas válido (máximo 1 año) para realizar la consulta.'
                        : 'No se encontraron defectos OBD para los criterios seleccionados.'}
                  </td>
                </tr>
              ) : (
                filasPaginadas.map((f, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={`${f.codInspeccion}_${f.codigoDefectoCompleto}_${idx}`}
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
                            {f.desEstacion.replace('I.T.V. - ', '')}
                          </span>
                        </div>
                      </AppTooltip>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>
                      <AppTooltip content={`${f.marca} ${f.modelo}`} position="top">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          <span style={{ fontWeight: 600 }}>{f.marca}</span> {f.modelo}
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
                          backgroundColor: f.tipoCombustible === 'Diésel' ? '#e0f2fe' : '#fef3c7',
                          color: f.tipoCombustible === 'Diésel' ? '#0369a1' : '#b45309',
                        }}
                      >
                        {f.tipoCombustible}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <AppTooltip content={f.descripcionDefecto} position="top">
                        <code
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 700,
                            cursor: 'help',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {f.codigoDefectoCompleto}
                        </code>
                      </AppTooltip>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <TsBadge
                        size="sm"
                        variant={f.gravedadDefecto.includes('Grave') ? 'danger' : 'info'}
                      >
                        {f.gravedadDefecto}
                      </TsBadge>
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
                          onClick={() => handleVerDetalle(f)}
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

        {/* 7.1 Barra de Paginación Reactiva */}
        {totalFilas > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '0.75rem 1rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.84rem',
              color: '#475569',
            }}
          >
            {/* Información de registros visibles */}
            <div>
              Mostrando <strong style={{ color: '#0f172a' }}>{inicioIndice + 1}</strong> a{' '}
              <strong style={{ color: '#0f172a' }}>{finIndice}</strong> de{' '}
              <strong style={{ color: '#0046ad' }}>{totalFilas.toLocaleString('es-ES')}</strong> registros
            </div>

            {/* Controles de Navegación de Página */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={pageActual <= 1}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: pageActual <= 1 ? '#f1f5f9' : '#ffffff',
                  color: pageActual <= 1 ? '#94a3b8' : '#0046ad',
                  cursor: pageActual <= 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                « Primera
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pageActual <= 1}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: pageActual <= 1 ? '#f1f5f9' : '#ffffff',
                  color: pageActual <= 1 ? '#94a3b8' : '#0046ad',
                  cursor: pageActual <= 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                ‹ Anterior
              </button>

              <span style={{ margin: '0 6px', fontWeight: 600, color: '#1e293b' }}>
                Página {pageActual} de {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPaginas, p + 1))}
                disabled={pageActual >= totalPaginas}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: pageActual >= totalPaginas ? '#f1f5f9' : '#ffffff',
                  color: pageActual >= totalPaginas ? '#94a3b8' : '#0046ad',
                  cursor: pageActual >= totalPaginas ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                Siguiente ›
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPaginas)}
                disabled={pageActual >= totalPaginas}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: pageActual >= totalPaginas ? '#f1f5f9' : '#ffffff',
                  color: pageActual >= totalPaginas ? '#94a3b8' : '#0046ad',
                  cursor: pageActual >= totalPaginas ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                Última »
              </button>
            </div>

            {/* Selector de Tamaño de Página (Combo 50, 100, 200, 500) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Registros por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        )}
      </ReportTableContainer>

      {/* 8. Modal de Ficha Técnica Detallada */}
      {modalDetalleOpen && filaSeleccionada && (
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
          onClick={() => setModalDetalleOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '680px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#002b49', fontSize: '1.2rem', fontWeight: 700 }}>
                  Ficha Técnica — Inspección {filaSeleccionada.codInspeccion}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Estación: {filaSeleccionada.desEstacion} ({filaSeleccionada.codEstacion})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDetalleOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Matrícula:</span>
                <strong style={{ color: '#002b49', fontSize: '1rem' }}>{filaSeleccionada.matricula}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Fecha Inspección:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.fechaInspeccionFormatted}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Vehículo:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.marca} {filaSeleccionada.modelo}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Tipo Motor:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.tipoMotor}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Combustible / Motorización:</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: filaSeleccionada.tipoCombustible === 'Diésel' ? '#e0f2fe' : '#fef3c7',
                    color: filaSeleccionada.tipoCombustible === 'Diésel' ? '#0369a1' : '#b45309',
                  }}
                >
                  {filaSeleccionada.tipoCombustible}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Nivel Emisiones:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.desNivelEmisiones}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Clasificación:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.clasificacion || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Contraseña Homologación:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.cHomologacion || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>MMA (Masa Máx. Autorizada):</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.mma ? `${filaSeleccionada.mma.toLocaleString('es-ES')} kg` : '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Kilometraje:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.kilometraje ? `${Number(filaSeleccionada.kilometraje).toLocaleString('es-ES')} km` : '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Fase y Resultado:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.fase} — {filaSeleccionada.textoResultado}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Sociedad:</span>
                <strong style={{ color: '#1e293b' }}>{filaSeleccionada.nombreEmpresa} ({filaSeleccionada.claveSociedad})</strong>
              </div>
            </div>

            {/* Bloque Destacado del Defecto OBD */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem',
                borderRadius: '6px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.85rem' }}>
                  Defecto Reglamentario Registrado: {filaSeleccionada.codigoDefectoCompleto}
                </span>
                <TsBadge size="sm" variant={filaSeleccionada.gravedadDefecto.includes('Grave') ? 'danger' : 'info'}>
                  {filaSeleccionada.gravedadDefecto}
                </TsBadge>
              </div>
              <p style={{ margin: 0, color: '#7f1d1d', fontSize: '0.82rem', lineHeight: 1.4 }}>
                {filaSeleccionada.descripcionDefecto}
              </p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#991b1b' }}>
                Bloque: {filaSeleccionada.bloque} | Defecto: {filaSeleccionada.defecto} | Subdefecto: {filaSeleccionada.subdefecto} | Número: {filaSeleccionada.numero}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <TsButton variant="secondary" size="medium" onClick={() => setModalDetalleOpen(false)}>
                Cerrar Ficha
              </TsButton>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modales de Carga Bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Inspecciones con Defecto OBD"
        message="Analizando registros reglamentarios del Bloque 15 en las estaciones seleccionadas..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Oficial Excel"
        message="Estructurando y descargando el archivo oficial de inspecciones con defectos OBD..."
      />
    </div>
  );
};
