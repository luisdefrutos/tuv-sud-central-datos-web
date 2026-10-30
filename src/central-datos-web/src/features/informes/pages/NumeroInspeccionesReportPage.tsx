import React, { useState } from 'react';
import { TsButton, TsAlert, TsBreadcrumb, TsBreadcrumbItem, TsBadge } from '@tuvsud/design-system/react';
import { useNumeroInspeccionesReport, type SortableNumeroInspeccionesColumn } from '../hooks/useNumeroInspeccionesReport';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportKpiCard } from '../../../components/common/ReportKpiCard';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportDonutChart } from '../components/ReportDonutChart';
import { ReportTableContainer } from '../components/ReportTableContainer';
import { CrystalReportNumeroInspeccionesModal } from '../components/CrystalReportNumeroInspeccionesModal';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { SortIndicator } from '../../../components/common/SortIndicator';

export interface NumeroInspeccionesReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const NumeroInspeccionesReportPage: React.FC<NumeroInspeccionesReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    fechaInicio,
    fechaFin,
    sociedad,
    estacionesSeleccionadas,
    estacionesPermitidas,
    alertaRangoFechas,
    setSociedad,
    setEstacionesSeleccionadas,
    handleFechaInicioChange,
    handleFechaFinChange,
    cargarInforme,

    data,
    isLoading,
    error,
    setError,

    isExporting,
    exportError,
    handleExportarExcel,

    searchTerm,
    setSearchTerm,
    sortColumn,
    sortDirection,
    handleSort,
    filasFiltradasYOrdenadas,
    kpisDinamicos,
    graficoBarrasDinamico,
    graficoCuotaDinamico,

    chartMode,
    setChartMode,
  } = useNumeroInspeccionesReport();

  const [isCrystalReportOpen, setIsCrystalReportOpen] = useState(false);

  // Cálculos de sumas totales para la fila final de la tabla web
  const totalF1Fav = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.favorables1, 0);
  const totalF1Rech = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.rechazadas1, 0);
  const totalF1Tot = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalFase1, 0);
  const totalF1Pct = totalF1Tot > 0 ? (totalF1Rech / totalF1Tot) * 100 : 0;

  const totalF2Fav = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.favorables2, 0);
  const totalF2Rech = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.rechazadas2, 0);
  const totalF2Tot = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalFase2, 0);
  const totalF2Pct = totalF2Tot > 0 ? (totalF2Rech / totalF2Tot) * 100 : 0;

  const totalGlobalFav = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalFavorables, 0);
  const totalGlobalRech = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalRechazadas, 0);
  const totalGlobalInsp = filasFiltradasYOrdenadas.reduce((acc, f) => acc + f.totalInspecciones, 0);
  const totalGlobalPct = totalGlobalInsp > 0 ? (totalGlobalRech / totalGlobalInsp) * 100 : 0;

  const hayDatosParaExportar = filasFiltradasYOrdenadas.length > 0;

  const renderSortTh = (
    column: SortableNumeroInspeccionesColumn,
    label: string,
    extraStyle?: React.CSSProperties
  ) => {
    const isSorted = sortColumn === column;
    const direction = isSorted ? sortDirection : null;
    return (
      <th
        onClick={() => handleSort(column)}
        style={{
          padding: '6px 8px',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isSorted ? '#e2e8f0' : undefined,
          transition: 'background-color 0.15s ease',
          textAlign: 'right',
          ...extraStyle,
        }}
        title={`Ordenar por ${label}`}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
            gap: '2px',
          }}
        >
          <span>{label}</span>
          <SortIndicator direction={direction} />
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 0. Modales de carga bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Inspecciones Centralizadas"
        message="Por favor, espere mientras se agregan las inspecciones favorables y rechazadas en Oracle..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Informe Excel"
        message="Estructurando y descargando el archivo oficial de inspecciones con codificación UTF-8..."
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
          <TsBreadcrumbItem active>Número de Inspecciones</TsBreadcrumbItem>
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

      {/* 2. Cabecera Ejecutiva del Módulo */}
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
            <span style={{ fontSize: '1.75rem' }}>📋</span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              Informe Número de Inspecciones
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
            Volumen consolidado y desglose de inspecciones favorables y rechazadas en Fase 1 y Fase 2 por estación.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <TsButton
            variant="secondary"
            size="medium"
            onClick={() => setIsCrystalReportOpen(true)}
            disabled={isLoading || !hayDatosParaExportar}
            style={{ fontWeight: 600 }}
          >
            🖨️ Imprimir (Crystal Report)
          </TsButton>
          <TsButton
            variant="success"
            size="medium"
            onClick={handleExportarExcel}
            disabled={isLoading || isExporting || !hayDatosParaExportar}
            loading={isExporting}
            style={{ fontWeight: 600 }}
          >
            {isExporting ? 'Exportando...' : '📥 Exportar a Excel'}
          </TsButton>
          <TsButton
            variant="secondary"
            size="medium"
            onClick={cargarInforme}
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
            <TsButton variant="secondary" size="small" onClick={() => { setError(null); cargarInforme(); }}>
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
          onTsAfterHide={() => {}}
          heading="Exportación no disponible"
        >
          <span>⚠️ {exportError}</span>
        </TsAlert>
      )}

      {/* 4. Barra Unificada de Filtros */}
      <ReportFiltersBar
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        sociedad={sociedad}
        estacionesSeleccionadas={estacionesSeleccionadas}
        estacionesPermitidas={estacionesPermitidas}
        onFechaInicioChange={handleFechaInicioChange}
        onFechaFinChange={handleFechaFinChange}
        onSociedadChange={setSociedad}
        onEstacionesChange={setEstacionesSeleccionadas}
        onConsultar={cargarInforme}
        loading={isLoading}
      />

      {/* 5. Tarjetas KPI Ejecutivas Sincronizadas en Memoria */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '1rem',
        }}
      >
        {isLoading && !data ? (
          <>
            <ReportKpiCard title="Total Inspecciones" value="---" loading />
            <ReportKpiCard title="1ª Inspección (Fase 1)" value="---" loading />
            <ReportKpiCard title="2ª Inspección (Fase 2)" value="---" loading />
            <ReportKpiCard title="% Rechazo Global" value="---" loading />
          </>
        ) : (
          kpisDinamicos.map((kpi) => (
            <ReportKpiCard
              key={kpi.id}
              title={kpi.titulo}
              value={kpi.valor}
              subtitle={kpi.subtitulo}
              variant={kpi.variant}
              icon={kpi.icon}
              loading={isLoading}
            />
          ))
        )}
      </div>

      {/* 6. Selector de Visualización y Gráfico (Barras Ranking / Donut Mix) */}
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
              🍩 Circular (Mix Red)
            </button>
          </div>
        </div>

        {chartMode === 'bar' ? (
          <ReportBarChart
            title="Ranking de Inspecciones por Estación ITV"
            subtitle="Volumen consolidado de inspecciones (Fase 1 y Fase 2)"
            data={graficoBarrasDinamico}
            loading={isLoading}
            emptyMessage="No hay estaciones seleccionadas para mostrar en el gráfico de ranking."
            valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
          />
        ) : (
          <ReportDonutChart
            title="Distribución de Inspecciones por Estación"
            subtitle="Porcentaje de cuota sobre el total de inspecciones de la red analizada"
            data={graficoCuotaDinamico}
            loading={isLoading}
            emptyMessage="No hay estaciones seleccionadas para mostrar en el gráfico circular."
            valueFormatter={(val) => `${val.toLocaleString('es-ES')} insp.`}
          />
        )}
      </div>

      {/* 7. Tabla Detallada con Búsqueda en Memoria y Exportación a Excel */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por estación, código o empresa..."
        totalFilas={data?.filas.length ?? 0}
        filasVisibles={filasFiltradasYOrdenadas.length}
        onExportExcel={handleExportarExcel}
        onOpenCrystalReport={() => setIsCrystalReportOpen(true)}
        isExporting={isExporting}
        exportDisabled={!hayDatosParaExportar}
      >
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table
            style={{
              width: '100%',
              minWidth: '980px',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              textAlign: 'right',
            }}
          >
            <thead>
              {/* Fila 1 de Grupos */}
              <tr style={{ backgroundColor: '#0046ad', color: '#ffffff', borderBottom: '1px solid #003580' }}>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontWeight: 700,
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                  rowSpan={2}
                >
                  Estación / ITV
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                  colSpan={4}
                >
                  Fase 1 (1ª Inspección)
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                  colSpan={4}
                >
                  Fase 2 (2ª Inspección)
                </th>
                <th
                  style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    fontWeight: 700,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                  colSpan={4}
                >
                  Totales de Inspección
                </th>
              </tr>
              {/* Fila 2 de Subcolumnas */}
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', fontSize: '0.78rem', color: '#1e293b' }}>
                {/* Fase 1 */}
                {renderSortTh('favorables1', 'Fav.')}
                {renderSortTh('rechazadas1', 'Rech.')}
                {renderSortTh('totalFase1', 'Total F1', { fontWeight: 700 })}
                {renderSortTh('porcentajeRechazoFase1', '% Rech.', { borderRight: '1px solid #cbd5e1' })}

                {/* Fase 2 */}
                {renderSortTh('favorables2', 'Fav.')}
                {renderSortTh('rechazadas2', 'Rech.')}
                {renderSortTh('totalFase2', 'Total F2', { fontWeight: 700 })}
                {renderSortTh('porcentajeRechazoFase2', '% Rech.', { borderRight: '1px solid #cbd5e1' })}

                {/* Totales */}
                {renderSortTh('totalFavorables', 'Total Fav.')}
                {renderSortTh('totalRechazadas', 'Total Rech.')}
                {renderSortTh('totalInspecciones', 'Total Insp.', { fontWeight: 700, color: '#0046ad' })}
                {renderSortTh('porcentajeRechazoGlobal', '% Rechazo', { fontWeight: 700 })}
              </tr>
            </thead>
            <tbody>
              {filasFiltradasYOrdenadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '0.88rem',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    {isLoading
                      ? 'Cargando datos de inspección...'
                      : estacionesSeleccionadas.length === 0
                      ? '⚠️ No hay ninguna estación seleccionada. Por favor, marque al menos una estación en el selector de filtros para visualizar el informe.'
                      : 'No se encontraron inspecciones coincidentes con los filtros seleccionados.'}
                  </td>
                </tr>
              ) : (
                filasFiltradasYOrdenadas.map((fila) => (
                  <tr
                    key={fila.codEstacion}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '8px 10px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            backgroundColor: fila.claveSociedad === 'CAL' ? '#e6f4ea' : '#e0f2fe',
                            color: fila.claveSociedad === 'CAL' ? '#00875a' : '#0046ad',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                          }}
                        >
                          {fila.codEstacion}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{fila.desEstacion}</span>
                      </div>
                    </td>

                    {/* Fase 1 */}
                    <td style={{ padding: '8px 10px', color: '#16a34a' }}>{fila.favorables1Formatted}</td>
                    <td style={{ padding: '8px 10px', color: '#dc2626' }}>{fila.rechazadas1Formatted}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fila.totalFase1Formatted}</td>
                    <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                      {fila.porcentajeRechazoFase1Formatted}
                    </td>

                    {/* Fase 2 */}
                    <td style={{ padding: '8px 10px', color: '#16a34a' }}>{fila.favorables2Formatted}</td>
                    <td style={{ padding: '8px 10px', color: '#dc2626' }}>{fila.rechazadas2Formatted}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fila.totalFase2Formatted}</td>
                    <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                      {fila.porcentajeRechazoFase2Formatted}
                    </td>

                    {/* Totales */}
                    <td style={{ padding: '8px 10px', color: '#16a34a', fontWeight: 600 }}>
                      {fila.totalFavorablesFormatted}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#dc2626', fontWeight: 600 }}>
                      {fila.totalRechazadasFormatted}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0046ad' }}>
                      {fila.totalInspeccionesFormatted}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {fila.porcentajeRechazoGlobalFormatted}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Pie de Tabla con Totales (solo se muestra cuando hay estaciones visibles) */}
            {filasFiltradasYOrdenadas.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderTop: '2px solid #0046ad',
                    borderBottom: '2px solid #0046ad',
                    fontWeight: 700,
                  }}
                >
                  <td style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #cbd5e1' }}>
                    TOTALES (Red analizada)
                  </td>
                  {/* Fase 1 */}
                  <td style={{ padding: '10px', color: '#16a34a' }}>{totalF1Fav.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px', color: '#dc2626' }}>{totalF1Rech.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px' }}>{totalF1Tot.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px', borderRight: '1px solid #cbd5e1' }}>
                    {totalF1Pct.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                  </td>

                  {/* Fase 2 */}
                  <td style={{ padding: '10px', color: '#16a34a' }}>{totalF2Fav.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px', color: '#dc2626' }}>{totalF2Rech.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px' }}>{totalF2Tot.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px', borderRight: '1px solid #cbd5e1' }}>
                    {totalF2Pct.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                  </td>

                  {/* Totales */}
                  <td style={{ padding: '10px', color: '#16a34a' }}>{totalGlobalFav.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px', color: '#dc2626' }}>{totalGlobalRech.toLocaleString('es-ES')}</td>
                  <td style={{ padding: '10px', color: '#0046ad', fontSize: '0.9rem' }}>
                    {totalGlobalInsp.toLocaleString('es-ES')}
                  </td>
                  <td style={{ padding: '10px', color: '#0046ad', fontSize: '0.9rem' }}>
                    {totalGlobalPct.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </ReportTableContainer>

      {/* Modal Réplica Oficial Crystal Report (rptInspFavorablesRechazadas) */}
      <CrystalReportNumeroInspeccionesModal
        isOpen={isCrystalReportOpen}
        onClose={() => setIsCrystalReportOpen(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        filas={filasFiltradasYOrdenadas}
      />
    </div>
  );
};
