import React, { useState, useMemo, useEffect } from 'react';
import { TsButton, TsCard, TsBadge } from '@tuvsud/design-system/react';
import { ReportPageHeader } from '../components/ReportPageHeader';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { ReportDateRangeAlert } from '../components/ReportDateRangeAlert';
import { ReportTableContainer } from '../components/ReportTableContainer';
import { ReportBarChart } from '../components/ReportBarChart';
import { ReportPaginationBar } from '../components/ReportPaginationBar';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { SortIndicator } from '../../../components/common/SortIndicator';
import {
  useClientesVolumenReport,
  type SortableClientesVolumenColumn,
} from '../hooks/useClientesVolumenReport';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';
import type { ReportBarChartPoint } from '../types/informes.types';

interface ClientesVolumenReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

export const ClientesVolumenReportPage: React.FC<ClientesVolumenReportPageProps> = ({
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
    fase,
    setFase,
    limiteCuenta,
    setLimiteCuenta,
    idProyecto,
    setIdProyecto,
    tiposVehiculoSeleccionados,
    alternarTipoVehiculo,
    seleccionarTodosTipos,
    proyectos,
    tiposVehiculoCatalogo,
    exportarExcel,
  } = useClientesVolumenReport();

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
    filasFiltradasYOrdenadas,
  } = table;

  // Sumatorio de inspecciones de todas las filas filtradas actualmente
  const totalInspeccionesFiltradas = useMemo(() => {
    return (filasFiltradasYOrdenadas || []).reduce((acc, f) => acc + (f.cuenta || 0), 0);
  }, [filasFiltradasYOrdenadas]);

  const hayDatosParaExportar = data && data.filas && data.filas.length > 0;

  // Selector de Vista Gráfica: Top 10 Clientes vs Distribución por Estación
  const [vistaGrafica, setVistaGrafica] = useState<'clientes' | 'estaciones'>('clientes');

  // Estado local para edición fluida del límite numérico de inspecciones
  const [limiteLocal, setLimiteLocal] = useState<string>(String(limiteCuenta));

  useEffect(() => {
    setLimiteLocal(String(limiteCuenta));
  }, [limiteCuenta]);

  const aplicarLimite = (nuevoValor: number) => {
    const valFinal = Math.max(1, Math.min(99999, Math.floor(nuevoValor)));
    setLimiteLocal(String(valFinal));
    if (valFinal !== limiteCuenta) {
      setLimiteCuenta(valFinal);
    }
  };

  const handleLimiteBlurOrEnter = () => {
    const parsed = parseInt(limiteLocal, 10);
    if (isNaN(parsed) || parsed < 1) {
      aplicarLimite(1);
    } else {
      aplicarLimite(parsed);
    }
  };

  // Puntos para Ranking de Clientes (Top 10)
  const puntosClientesChart: ReportBarChartPoint[] = useMemo(() => {
    if (!data?.graficoTopClientes) return [];
    return data.graficoTopClientes.map((p) => ({
      id: p.id,
      label: p.label,
      valor: p.valor,
      valorFormateado: p.valorFormateado,
      tooltipSubtitle: p.subtitulo,
      color: p.color || '#0046ad',
    }));
  }, [data?.graficoTopClientes]);

  // Puntos para Gráfico de Estaciones (todas las seleccionadas con scroll)
  const puntosEstacionesChart: ReportBarChartPoint[] = useMemo(() => {
    if (!data) return [];

    const mapaDatos = new Map<string, { label: string; valor: number; valorFormateado: string; subtitulo: string; color: string }>();
    (data.graficoEstaciones || []).forEach((p) => {
      mapaDatos.set(p.id.padStart(4, '0'), p);
      mapaDatos.set(p.id, p);
    });

    const codigosSeleccionados = filters.estacionesSeleccionadas.length > 0
      ? filters.estacionesSeleccionadas
      : ESTACIONES_OFICIALES.map((e) => e.codigo);

    const lista: ReportBarChartPoint[] = codigosSeleccionados.map((cod) => {
      const codPadded = cod.padStart(4, '0');
      const item = mapaDatos.get(cod) || mapaDatos.get(codPadded);
      const estOficial = ESTACIONES_OFICIALES.find((e) => e.codigo === cod || e.codigo === codPadded);
      const nombreEst = estOficial?.descripcion || `I.T.V. - ${codPadded}`;
      const sociedad = estOficial?.sociedad || (codPadded.startsWith('09') ? 'CAL' : 'TSA');
      const color = sociedad === 'CAL' ? '#00875a' : '#0046ad';

      if (item) {
        return {
          id: codPadded,
          label: item.label,
          valor: item.valor,
          valorFormateado: item.valorFormateado,
          tooltipSubtitle: item.subtitulo,
          color: item.color || color,
        };
      }

      return {
        id: codPadded,
        label: `${codPadded} - ${nombreEst}`,
        valor: 0,
        valorFormateado: '0 insp.',
        tooltipSubtitle: `${sociedad}: 0 inspecciones de grandes clientes`,
        color,
      };
    });

    return lista.sort((a, b) => b.valor - a.valor || a.label.localeCompare(b.label));
  }, [data, filters.estacionesSeleccionadas]);

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
      {/* 0. Modales de Carga Bloqueantes */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Clientes por Volumen"
        message="Agrupando grandes cuentas y flotas comerciales en base de datos Oracle..."
      />

      <BlockingLoadingModal
        isOpen={isExporting}
        title="Generando Libro Excel"
        message="Construyendo libro Excel multi-pestaña por estación con hojas individuales y consolidado..."
      />

      {/* 1. Cabecera Oficial del Informe */}
      <ReportPageHeader
        title="Clientes por Volumen de Inspecciones"
        subtitle="Identificación y análisis de fidelización de grandes cuentas, flotas comerciales y profesionales en la red ITV."
        icon="👥"
        breadcrumbItemText="Clientes por volumen"
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
              onClick={exportarExcel}
              disabled={!hayDatosParaExportar || isExporting}
            >
              📥 Exportar a Excel
            </TsButton>
          </span>
        </AppTooltip>
      </ReportPageHeader>

      {/* 2. Alerta de Rango de Fechas */}
      <ReportDateRangeAlert
        mensaje={filters.alertaRangoFechas}
        onAjustarAUnAno={filters.ajustarAUnAno}
      />

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
        onConsultar={consultar}
        loading={isLoading}
      />

      {/* 4. Panel de Criterios Avanzados (Fase, Umbral Mínimo, Proyecto Comercial, Categorías MINER) */}
      <TsCard style={{ padding: '16px 20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {/* A. 1ª / 2ª Fase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              1ª / 2ª Fase:
            </label>
            <select
              value={fase}
              onChange={(e) => setFase(e.target.value)}
              disabled={isLoading}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer',
              }}
            >
              <option value="TODAS">-- Todas las Fases --</option>
              <option value="1">1ª Inspección Periódica</option>
              <option value="2">2ª Inspección Reiterada</option>
            </select>
          </div>

          {/* B. Límite Mínimo de Inspecciones (Equivalente al InputBox legacy 'Cuenta volumen por cliente') */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Límite mínimo de inspecciones:
              </label>
              <AppTooltip
                title="Límite Mínimo de Inspecciones (Umbral de Flota)"
                subtitle="Equivalente al diálogo de la aplicación de escritorio"
                content="Solo incluye en el informe y en el grid a clientes cuyo volumen de inspecciones en la estación sea mayor o igual a este número. Por defecto 1 (todos los clientes). Introduzca 5, 10 o 20 para aislar grandes flotas y empresas de renting."
              >
                <span style={{ cursor: 'help', fontSize: '12px', color: '#0046ad' }}>ℹ️</span>
              </AppTooltip>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={limiteLocal}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, '');
                  setLimiteLocal(cleaned);
                }}
                onBlur={handleLimiteBlurOrEnter}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLimiteBlurOrEnter();
                  }
                }}
                disabled={isLoading}
                title="Escriba un número entero positivo (mínimo 1) y pulse Enter"
                style={{
                  width: '64px',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '4px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0046ad',
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 5, 10, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => aplicarLimite(preset)}
                    disabled={isLoading}
                    title={preset === 1 ? 'Mostrar todos los clientes (mínimo 1 inspección)' : `Filtrar clientes con al menos ${preset} inspecciones`}
                    style={{
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '4px',
                      border: limiteCuenta === preset ? '1.5px solid #0046ad' : '1px solid #cbd5e1',
                      backgroundColor: limiteCuenta === preset ? '#e0f2fe' : '#ffffff',
                      color: limiteCuenta === preset ? '#0046ad' : '#475569',
                      fontSize: '11.5px',
                      fontWeight: limiteCuenta === preset ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset === 1 ? 'Todos' : `>= ${preset}`}
                  </button>
                ))}
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Mostrando clientes con &gt;= {limiteCuenta} insp. en estación
            </span>
          </div>

          {/* C. Proyecto Comercial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 200px', minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              Proyecto Comercial:
            </label>
            <select
              value={idProyecto ?? ''}
              onChange={(e) => setIdProyecto(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              disabled={isLoading}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <option value="">-- Todos los Proyectos Comerciales --</option>
              {proyectos.map((p) => (
                <option key={p.idProyecto} value={p.idProyecto}>
                  {p.desProyecto}
                </option>
              ))}
            </select>
          </div>

          {/* D. Tipo de Vehículo (Clasificación MINER) - Réplica idéntica de la tabla de escritorio mfgTipoVehiculo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '2 1 360px', minWidth: '320px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Tipo de vehículo (Clasif. MINER):
              </label>
              <button
                type="button"
                onClick={seleccionarTodosTipos}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0046ad',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {tiposVehiculoSeleccionados.length === tiposVehiculoCatalogo.length ? 'Desmarcar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div
              style={{
                maxHeight: '130px',
                overflowY: 'auto',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#94a3b8', color: '#ffffff', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '4px 8px', textAlign: 'left', width: '45px', fontWeight: 600 }}>Cod.</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>Descripcion</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', width: '40px', fontWeight: 600 }}>Sel.</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposVehiculoCatalogo.map((cat, idx) => {
                    const seleccionado = tiposVehiculoSeleccionados.includes(cat.codigo);
                    return (
                      <tr
                        key={cat.codigo}
                        onClick={() => alternarTipoVehiculo(cat.codigo)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: seleccionado ? '#e0f2fe' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc'),
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <td style={{ padding: '4px 8px', fontWeight: 700, color: seleccionado ? '#0046ad' : '#334155' }}>
                          {cat.codigo}
                        </td>
                        <td style={{ padding: '4px 8px', color: '#1e293b' }}>
                          {cat.descripcion}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={seleccionado}
                            onChange={() => {}} // controlado por onClick de la fila
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Leyenda y Explicación Operativa del Límite de Inspecciones */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#f0f7ff',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            fontSize: '12.5px',
            lineHeight: 1.5,
            color: '#1e3a8a',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>💡</span>
          <div>
            <strong>Comportamiento del Límite de Inspecciones:</strong> Con límite <strong>1</strong> (por defecto) el informe incluye a <em>todos</em> los clientes particulares y autónomos de la red. Al seleccionar <strong>&gt;= 5</strong>, <strong>&gt;= 10</strong> o <strong>&gt;= 20</strong>, se descartan los particulares y se aíslan exclusivamente las <em>grandes cuentas comerciales, empresas de renting y flotas de transporte</em>. <strong>Al cambiar este valor, los 4 KPIs ejecutivos, las gráficas comparativas y la tabla se recalculan y actualizan automáticamente en tiempo real</strong> para reflejar los datos consolidados de ese umbral sobre la base de datos Oracle.
          </div>
        </div>
      </TsCard>

      {/* 5. Alerta de Error si ocurre */}
      {error && (
        <TsCard style={{ padding: '16px', borderLeft: '4px solid #d32f2f', backgroundColor: '#fef2f2' }}>
          <div style={{ color: '#b91c1c', fontWeight: 600 }}>⚠️ {error}</div>
        </TsCard>
      )}

      {/* 6. Cuatro KPIs Corporativos Ejecutivos (Tarjetas Informativas sin Links Confusos) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {(data?.kpis || []).map((kpi) => (
          <AppTooltip
            key={kpi.id}
            title={kpi.titulo}
            subtitle={kpi.subtitulo}
            content={`Indicador ejecutivo acumulado: ${kpi.valor}.`}
            position="bottom"
          >
            <TsCard
              style={{
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    {kpi.titulo}
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#0046ad', marginTop: '4px' }}>
                    {kpi.valor}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {kpi.subtitulo}
                  </div>
                </div>
                <span style={{ fontSize: '26px' }}>{kpi.icon}</span>
              </div>
            </TsCard>
          </AppTooltip>
        ))}
      </div>

      {/* 7. Gráficos Analíticos (Sin Doble Scroll y Leyenda Solo en Estaciones) */}
      {hayDatosParaExportar && (
        <TsCard style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              {vistaGrafica === 'clientes'
                ? '🏆 Top 10 Clientes con Mayor Volumen'
                : '🏢 Distribución de Inspecciones por Estación'}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <TsButton
                variant={vistaGrafica === 'clientes' ? 'primary' : 'secondary'}
                onClick={() => setVistaGrafica('clientes')}
              >
                🏆 Top Clientes
              </TsButton>
              <TsButton
                variant={vistaGrafica === 'estaciones' ? 'primary' : 'secondary'}
                onClick={() => setVistaGrafica('estaciones')}
              >
                🏢 Por Estación
              </TsButton>
            </div>
          </div>

          <ReportBarChart
            title={vistaGrafica === 'clientes' ? 'Top Clientes' : 'Estaciones'}
            data={vistaGrafica === 'clientes' ? puntosClientesChart : puntosEstacionesChart}
            loading={isLoading}
            height={360}
            badgeUnit={vistaGrafica === 'clientes' ? 'clientes' : 'estaciones'}
            showLegend={vistaGrafica === 'estaciones'}
          />
        </TsCard>
      )}

      {/* 9. Tabla de Datos Paginada - Réplica Oficial de la Aplicación de Escritorio (13 columnas) */}
      <ReportTableContainer
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por CIF, cliente, población, teléfono o núm. inspecciones..."
        totalFilas={totalFilas}
        filasVisibles={filasPaginadas.length}
        onExportExcel={exportarExcel}
        isExporting={isExporting}
        exportDisabled={!hayDatosParaExportar}
        unidadRegistros="líneas de desglose"
        totalSumTexto={totalInspeccionesFiltradas > 0 ? `${totalInspeccionesFiltradas.toLocaleString('es-ES')} inspecciones acumuladas` : undefined}
      >
        <div style={{ overflowX: 'auto', maxHeight: '640px' }}>
          <table
            className="cd-data-table"
            style={{
              width: '100%',
              minWidth: '1740px',
              borderCollapse: 'collapse',
              fontSize: '13px',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '100px' }} /> {/* 1. Estación */}
              <col style={{ width: '120px' }} /> {/* 2. CIF Factura */}
              <col style={{ width: '120px' }} /> {/* 3. CIF Titular */}
              <col style={{ width: '250px' }} /> {/* 4. Cliente / Razón Social */}
              <col style={{ width: '220px' }} /> {/* 5. Domicilio */}
              <col style={{ width: '75px' }} />  {/* 6. C.P. */}
              <col style={{ width: '150px' }} /> {/* 7. Población */}
              <col style={{ width: '130px' }} /> {/* 8. Provincia */}
              <col style={{ width: '110px' }} /> {/* 9. Teléfono */}
              <col style={{ width: '110px' }} /> {/* 10. Teléfono 2 */}
              <col style={{ width: '110px' }} /> {/* 11. Resultado */}
              <col style={{ width: '120px' }} /> {/* 12. Inspecciones */}
              <col style={{ width: '125px' }} /> {/* 13. Total Cliente */}
            </colgroup>
            <thead
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#003366',
                color: '#ffffff',
                zIndex: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <tr>
                <th
                  onClick={() => handleSort('codEstacion')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Estación</span>
                    <SortIndicator direction={sortColumn === 'codEstacion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cifFactura')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>CIF Factura</span>
                    <SortIndicator direction={sortColumn === 'cifFactura' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cifTitular')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>CIF Titular</span>
                    <SortIndicator direction={sortColumn === 'cifTitular' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombreCliente')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Cliente / Razón Social</span>
                    <SortIndicator direction={sortColumn === 'nombreCliente' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('domicilio')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Domicilio</span>
                    <SortIndicator direction={sortColumn === 'domicilio' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('codigoPostal')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>C.P.</span>
                    <SortIndicator direction={sortColumn === 'codigoPostal' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('poblacion')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Población</span>
                    <SortIndicator direction={sortColumn === 'poblacion' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('provincia')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Provincia</span>
                    <SortIndicator direction={sortColumn === 'provincia' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('telefono')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Teléfono</span>
                    <SortIndicator direction={sortColumn === 'telefono' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('telefono2')}
                  style={{ padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Teléfono 2</span>
                    <SortIndicator direction={sortColumn === 'telefono2' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('resultado')}
                  style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>Resultado</span>
                    <SortIndicator direction={sortColumn === 'resultado' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cuenta')}
                  style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <span>Inspecciones</span>
                    <SortIndicator direction={sortColumn === 'cuenta' ? sortDirection : null} />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cuentaCif')}
                  style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    <span>Total Cliente</span>
                    <SortIndicator direction={sortColumn === 'cuentaCif' ? sortDirection : null} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    {isLoading
                      ? 'Consultando base de datos...'
                      : 'No se encontraron clientes que cumplan los criterios seleccionados.'}
                  </td>
                </tr>
              ) : (
                filasPaginadas.map((fila, idx) => {
                  const esCal = fila.claveSociedad === 'CAL';
                  const esFav = fila.resultado === 'FAV';

                  return (
                    <tr
                      key={`${fila.codEstacion}-${fila.cifTitular}-${fila.cifFactura}-${fila.resultado}-${idx}`}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLTableRowElement>) => {
                        e.currentTarget.style.backgroundColor = '#edf5ff';
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLTableRowElement>) => {
                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                      }}
                    >
                      {/* 1. Estación */}
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <AppTooltip content={`${fila.codEstacion} - ${fila.desEstacion} (${fila.claveSociedad})`}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: esCal ? '#d1fae5' : '#e0f2fe',
                              color: esCal ? '#065f46' : '#0046ad',
                            }}
                          >
                            {fila.codEstacion}
                          </span>
                        </AppTooltip>
                      </td>

                      {/* 2. CIF Factura */}
                      <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {fila.cifFactura || '-'}
                      </td>

                      {/* 3. CIF Titular (Sin links según solicitud) */}
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {fila.cifTitular || '-'}
                      </td>

                      {/* 4. Nombre Cliente / Razón Social */}
                      <td style={{ padding: '10px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <AppTooltip content={fila.nombreCliente || 'Sin nombre registrado'}>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>
                            {fila.nombreCliente || '-'}
                          </span>
                        </AppTooltip>
                      </td>

                      {/* 5. Domicilio */}
                      <td style={{ padding: '10px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                        <AppTooltip content={fila.domicilio || '-'}>
                          <span>{fila.domicilio || '-'}</span>
                        </AppTooltip>
                      </td>

                      {/* 6. C.P. */}
                      <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {fila.codigoPostal || '-'}
                      </td>

                      {/* 7. Población */}
                      <td style={{ padding: '10px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>
                        <AppTooltip content={fila.poblacion || '-'}>
                          <span>{fila.poblacion || '-'}</span>
                        </AppTooltip>
                      </td>

                      {/* 8. Provincia */}
                      <td style={{ padding: '10px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>
                        <AppTooltip content={fila.provincia || '-'}>
                          <span>{fila.provincia || '-'}</span>
                        </AppTooltip>
                      </td>

                      {/* 9. Teléfono */}
                      <td style={{ padding: '10px 12px', color: '#475569', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {fila.telefono || '-'}
                      </td>

                      {/* 10. Teléfono 2 */}
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {fila.telefono2 || '-'}
                      </td>

                      {/* 11. Resultado */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <TsBadge
                          variant={esFav ? 'success' : 'danger'}
                          style={{ fontSize: '11px', fontWeight: 700 }}
                        >
                          {esFav ? 'FAV' : 'DESFAV'}
                        </TsBadge>
                      </td>

                      {/* 12. Inspecciones (Cuenta) */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                        {fila.cuenta.toLocaleString('es-ES')}
                      </td>

                      {/* 13. Total Cliente (CuentaCif) */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0046ad', whiteSpace: 'nowrap' }}>
                        {fila.cuentaCif.toLocaleString('es-ES')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filasFiltradasYOrdenadas.length > 0 && (
              <tfoot
                style={{
                  position: 'sticky',
                  bottom: 0,
                  backgroundColor: '#f1f5f9',
                  borderTop: '2px solid #0046ad',
                  fontWeight: 700,
                  zIndex: 2,
                  boxShadow: '0 -2px 4px rgba(0,0,0,0.06)',
                }}
              >
                <tr>
                  <td
                    colSpan={11}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#1e293b',
                      fontSize: '12.5px',
                    }}
                  >
                    TOTALES FILTRADOS ({filasFiltradasYOrdenadas.length.toLocaleString('es-ES')} líneas):
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      color: '#0046ad',
                      fontSize: '14px',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {totalInspeccionesFiltradas.toLocaleString('es-ES')}
                  </td>
                  <td style={{ padding: '10px 12px' }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Barra de Paginación Homogénea */}
        <ReportPaginationBar
          page={page}
          pageSize={pageSize}
          totalFilas={totalFilas}
          totalPaginas={totalPaginas}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[50, 100, 200, 500, 1000]}
          unidadRegistros="registros"
        />
      </ReportTableContainer>

      {/* 11. Modal o Alerta de Error de Exportación */}
      {exportError && (
        <TsCard style={{ padding: '16px', borderLeft: '4px solid #d32f2f', backgroundColor: '#fef2f2' }}>
          <div style={{ color: '#b91c1c', fontWeight: 600 }}>⚠️ {exportError}</div>
        </TsCard>
      )}
    </div>
  );
};

export default ClientesVolumenReportPage;
