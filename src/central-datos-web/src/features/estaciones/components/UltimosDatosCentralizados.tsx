import {
  TsAlert,
  TsBadge,
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsButton,
  TsCard,
  TsInput,
  TsSpinner,
} from '@tuvsud/design-system/react';
import { useUltimosDatos } from '../hooks/useUltimosDatos';
import type { ColumnaOrden } from '../types/estaciones.types';
import { SOCIEDADES } from '../../../constants/companies.constants';
import { UI_CONSTANTS } from '../../../constants/ui.constants';

interface SortIndicatorProps {
  direction: 'asc' | 'desc' | null;
}

function SortIndicator({ direction }: SortIndicatorProps) {
  const isAsc = direction === 'asc';
  const isDesc = direction === 'desc';

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '7px',
        lineHeight: 0,
        flexShrink: 0,
        gap: '2px',
      }}
      aria-hidden="true"
    >
      {/* Flecha Arriba ▲ (Ascendente) */}
      <svg
        width="11"
        height="7"
        viewBox="0 0 11 7"
        fill="currentColor"
        style={{
          color: isAsc ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
          filter: isAsc ? 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' : 'none',
          transition: 'color 0.15s ease, filter 0.15s ease',
        }}
      >
        <path d="M5.5 0.5L11 6.5H0L5.5 0.5Z" />
      </svg>
      {/* Flecha Abajo ▼ (Descendente) */}
      <svg
        width="11"
        height="7"
        viewBox="0 0 11 7"
        fill="currentColor"
        style={{
          color: isDesc ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
          filter: isDesc ? 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' : 'none',
          transition: 'color 0.15s ease, filter 0.15s ease',
        }}
      >
        <path d="M5.5 6.5L0 0.5H11L5.5 6.5Z" />
      </svg>
    </span>
  );
}

interface UltimosDatosCentralizadosProps {
  onNavigateHome?: () => void;
}

export function UltimosDatosCentralizados({ onNavigateHome }: UltimosDatosCentralizadosProps = {}) {
  // Lógica, estados y exportación autónoma desacoplados limpiamente en el Custom Hook
  const {
    data,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtroSociedad,
    setFiltroSociedad,
    ordenColumna,
    ordenDireccion,
    cambiarOrden,
    estacionesFiltradas,
    recargar,
    alertaExportacion,
    limpiarAlertaExportacion,
    exportarExcelCsv,
  } = useUltimosDatos();

  const { MODULO_ULTIMOS_DATOS: UI } = UI_CONSTANTS;

  const renderThOrdenable = (
    columna: ColumnaOrden,
    etiqueta: string,
    width?: string,
    tooltip?: string,
    isLast: boolean = false
  ) => {
    const activo = ordenColumna === columna;
    const direccionColumna = activo ? ordenDireccion : null;
    const direccionAria = direccionColumna ? (direccionColumna === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th
        key={columna}
        scope="col"
        className={`cd-table-th ${activo ? 'cd-table-th-active' : ''}`}
        aria-sort={direccionAria}
        onClick={() => cambiarOrden(columna)}
        title={
          tooltip ||
          (activo
            ? ordenDireccion === 'asc'
              ? `Haga clic para ordenar por ${etiqueta} de forma descendente`
              : `Haga clic para ordenar por ${etiqueta} de forma ascendente`
            : `Haga clic para ordenar por ${etiqueta} de forma ascendente`)
        }
        style={{
          padding: '0.85rem 1.15rem',
          width,
          fontWeight: 700,
          fontSize: '0.875rem',
          letterSpacing: '0.02em',
          color: '#ffffff',
          borderRight: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
          borderBottom: '2px solid #002d73',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
          <span>{etiqueta}</span>
          <SortIndicator direction={direccionColumna} />
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
      {/* 1. SPINNER MODAL BLOQUEANTE DE PANTALLA */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 37, 59, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'all',
            cursor: 'wait',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: 'clamp(1.5rem, 4vw, 2.25rem) clamp(1.5rem, 5vw, 3rem)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              maxWidth: '420px',
              width: '90%',
              textAlign: 'center',
              border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
            }}
          >
            <TsSpinner style={{ fontSize: '3rem', color: 'var(--ts-semantic-color-surface-brand-blue, #0046ad)' }} />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                  fontFamily: 'var(--ts-font-family-sans, system-ui)',
                }}
              >
                {UI.SPINNER_TITULO}
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
                  marginTop: '0.4rem',
                  lineHeight: 1.4,
                }}
              >
                {UI.SPINNER_SUBTITULO}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Miga de Pan Interactiva (Breadcrumb Oficial Algorithm DS) */}
      <TsBreadcrumb>
        <TsBreadcrumbItem
          onClick={onNavigateHome}
          title="Regresar a la pantalla de Inicio"
          style={{
            cursor: onNavigateHome ? 'pointer' : 'default',
            color: '#0046ad',
            fontWeight: 600,
          }}
        >
          {UI.BREADCRUMB[0]}
        </TsBreadcrumbItem>
        <TsBreadcrumbItem>{UI.BREADCRUMB[1]}</TsBreadcrumbItem>
        <TsBreadcrumbItem style={{ fontWeight: 700, color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)' }}>
          {UI.BREADCRUMB[2]}
        </TsBreadcrumbItem>
      </TsBreadcrumb>

      {/* 3. Cabecera del Módulo Responsiva */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
          paddingBottom: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.35rem, 3vw, 1.65rem)',
              fontWeight: 700,
              color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
              letterSpacing: '-0.3px',
            }}
          >
            {UI.TITULO}
          </h1>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
              fontSize: '0.92rem',
            }}
          >
            {UI.DESCRIPCION}
          </p>
        </div>

        <TsButton
          variant="primary"
          onClick={recargar}
          disabled={loading}
          style={{ minWidth: '160px' }}
        >
          {UI.BOTON_ACTUALIZAR}
        </TsButton>
      </div>

      {/* 4. Alerta de Error si la conexión falla (sanitizada contra Information Disclosure) */}
      {error && (
        <TsAlert variant="danger" open heading="Incidencia de comunicación">
          {error}
        </TsAlert>
      )}

      {/* 4.1. Alerta si se intenta exportar con la tabla vacía */}
      {alertaExportacion && (
        <TsAlert
          variant="warning"
          open
          closable
          onTsAfterHide={limpiarAlertaExportacion}
          heading="Exportación no disponible"
        >
          {alertaExportacion}
        </TsAlert>
      )}

      {/* 5. Tarjetas de Resumen Operativo (Grid Responsivo) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
        }}
      >
        <TsCard style={{ borderLeft: '4px solid var(--ts-semantic-color-surface-brand-blue, #0046ad)' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {UI.CARD_TOTAL_ESTACIONES}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.3rem', color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)' }}>
            {data?.totalEstaciones ?? (loading ? '...' : 0)}
          </div>
        </TsCard>

        <TsCard style={{ borderLeft: `4px solid ${SOCIEDADES.ATISAE.colorBorde}` }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {SOCIEDADES.ATISAE.nombreCompleto}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.3rem', color: SOCIEDADES.ATISAE.colorBorde }}>
            {data?.totalTsa ?? (loading ? '...' : 0)}
          </div>
        </TsCard>

        <TsCard style={{ borderLeft: `4px solid ${SOCIEDADES.CAL.colorBorde}` }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {SOCIEDADES.CAL.nombreCompleto}
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.3rem', color: SOCIEDADES.CAL.colorBorde }}>
            {data?.totalCal ?? (loading ? '...' : 0)}
          </div>
        </TsCard>

        <TsCard style={{ borderLeft: '4px solid #4a607a' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {UI.CARD_ULTIMA_FECHA}
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)', fontFamily: 'monospace' }}>
            {data?.ultimaFechaGlobal ?? (loading ? '...' : 'N/D')}
          </div>
        </TsCard>
      </div>

      {/* 6. Barra de Búsqueda, Filtros de Sociedad y Exportación Autónoma a Excel */}
      <TsCard>
        <div
          className="cd-stack-mobile"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Campo de Búsqueda Reactivo */}
          <div style={{ flex: '1 1 280px', minWidth: '220px', width: '100%' }}>
            <TsInput
              placeholder={UI.PLACEHOLDER_BUSQUEDA}
              value={searchTerm}
              onTsInput={(e: any) => setSearchTerm(e.target.value)}
              clearable
              style={{ width: '100%' }}
            />
          </div>

          {/* Grupo de Filtros y Acción de Exportar */}
          <div
            className="cd-filter-buttons"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600 }}>
                {UI.FILTRO_SOCIEDAD_LABEL}
              </span>
              <button
                type="button"
                onClick={() => setFiltroSociedad('TODAS')}
                style={{
                  border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                  background: filtroSociedad === 'TODAS' ? 'var(--ts-semantic-color-surface-brand-blue, #0046ad)' : '#ffffff',
                  color: filtroSociedad === 'TODAS' ? '#ffffff' : 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: filtroSociedad === 'TODAS' ? 700 : 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease',
                }}
              >
                Todas ({data?.totalEstaciones ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setFiltroSociedad(SOCIEDADES.ATISAE.clave)}
                style={{
                  border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                  background: filtroSociedad === SOCIEDADES.ATISAE.clave ? 'var(--ts-semantic-color-surface-brand-blue, #0046ad)' : '#ffffff',
                  color: filtroSociedad === SOCIEDADES.ATISAE.clave ? '#ffffff' : 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: filtroSociedad === SOCIEDADES.ATISAE.clave ? 700 : 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease',
                }}
              >
                TSA ({data?.totalTsa ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setFiltroSociedad(SOCIEDADES.CAL.clave)}
                style={{
                  border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                  background: filtroSociedad === SOCIEDADES.CAL.clave ? 'var(--ts-semantic-color-surface-brand-blue, #0046ad)' : '#ffffff',
                  color: filtroSociedad === SOCIEDADES.CAL.clave ? '#ffffff' : 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: filtroSociedad === SOCIEDADES.CAL.clave ? 700 : 500,
                  fontSize: '0.85rem',
                  transition: 'all 0.15s ease',
                }}
              >
                CAL ({data?.totalCal ?? 0})
              </button>
            </div>

            {/* Botón Autónomo de Exportación a Excel/CSV */}
            <TsButton
              variant="secondary"
              onClick={exportarExcelCsv}
              title="Descarga directamente un fichero Excel (.CSV con codificación UTF-8 para España) con los datos visibles en pantalla"
              style={{ whiteSpace: 'nowrap' }}
            >
              📥 Exportar a Excel
            </TsButton>
          </div>
        </div>
      </TsCard>

      {/* 6.1 Leyenda de Estados de Sincronización */}
      <TsCard style={{ padding: '14px 20px', backgroundColor: '#ffffff', border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)' }}>
              Leyenda de Sincronización de Datos:
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TsBadge variant="success" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Al día (≤ 48 horas)</TsBadge>
              <span style={{ color: '#475569' }}>Inspecciones centralizadas hoy o ayer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TsBadge variant="warning" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Alerta (3 - 5 días)</TsBadge>
              <span style={{ color: '#475569' }}>Retraso de transmisión o fin de semana</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TsBadge variant="danger" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Crítico (&gt; 5 días)</TsBadge>
              <span style={{ color: '#475569' }}>Estación sin comunicación reciente</span>
            </div>
          </div>
        </div>
      </TsCard>

      {/* 7. Tabla Oficial de Estaciones ITV con Scroll Táctil */}
      <TsCard>
        {/* Indicador de scroll para dispositivos táctiles */}
        <div
          className="cd-scroll-hint"
          style={{
            fontSize: '0.78rem',
            color: '#64748b',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          <span>↔️ Deslice horizontalmente para consultar todas las columnas</span>
        </div>

        <div
          className="cd-touch-scroll"
          style={{
            width: '100%',
            border: '1px solid var(--ts-semantic-color-border-default, #cbd5e1)',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: '720px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: 'var(--ts-font-family-sans, system-ui)',
              fontSize: '0.92rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--ts-table-header-bg, var(--ts-semantic-color-background-primary-default, #0046ad))',
                  borderBottom: '2px solid #002d73',
                  color: 'var(--ts-table-header-color, #ffffff)',
                }}
              >
                {renderThOrdenable('codEstacion', UI.TABLA.COL_CODIGO, '110px', 'Ordenar por código de estación')}
                {renderThOrdenable('desEstacion', UI.TABLA.COL_DESCRIPCION, undefined, 'Ordenar por nombre de estación')}
                {renderThOrdenable('nombreEmpresa', UI.TABLA.COL_SOCIEDAD, '170px', 'Ordenar por sociedad (TSA / CAL)')}
                {renderThOrdenable('ultimaInspeccion', UI.TABLA.COL_ULTIMA_FECHA, '190px', 'Ordenar por fecha y hora de última inspección')}
                {renderThOrdenable('estadoSincronizacion', 'Estado Centralización', '190px', 'Ordenar por nivel o días de retraso de sincronización', true)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)' }}>
                    {UI.TABLA.CARGANDO}
                  </td>
                </tr>
              ) : estacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)' }}>
                    {UI.TABLA.SIN_RESULTADOS}
                  </td>
                </tr>
              ) : (
                estacionesFiltradas.map((estacion, index) => {
                  const isEven = index % 2 === 1;
                  return (
                    <tr
                      key={estacion.codEstacion}
                      style={{
                        backgroundColor: isEven ? 'var(--ts-semantic-color-background-neutral-subtle-default, #f8fafc)' : '#ffffff',
                        borderBottom: '1px solid var(--ts-semantic-color-border-default, #e2e8f0)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--ts-semantic-color-background-primary-subtle-hover, #edf5ff)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isEven ? 'var(--ts-semantic-color-background-neutral-subtle-default, #f8fafc)' : '#ffffff';
                      }}
                    >
                      <td
                        className="cd-table-td"
                        style={{
                          padding: '0.75rem 1.15rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: 'var(--ts-semantic-color-surface-brand-blue, #0046ad)',
                          fontVariantNumeric: 'tabular-nums',
                          borderRight: '1px solid #edf2f7',
                        }}
                      >
                        {estacion.codEstacion}
                      </td>
                      <td className="cd-table-td" style={{ padding: '0.75rem 1.15rem', fontWeight: 600, color: '#1a202c', borderRight: '1px solid #edf2f7' }}>
                        {estacion.desEstacion}
                      </td>
                      <td className="cd-table-td" style={{ padding: '0.75rem 1.15rem', borderRight: '1px solid #edf2f7' }}>
                        <TsBadge
                          variant={
                            estacion.codEmpresa === SOCIEDADES.CAL.codigo
                              ? SOCIEDADES.CAL.badgeVariant
                              : SOCIEDADES.ATISAE.badgeVariant
                          }
                        >
                          {estacion.nombreEmpresa}
                        </TsBadge>
                      </td>
                      <td
                        className="cd-table-td"
                        style={{
                          padding: '0.75rem 1.15rem',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          fontSize: '0.92rem',
                          color: estacion.tieneInspecciones ? '#0b253b' : 'var(--ts-semantic-color-text-subtle, #5c768d)',
                          fontVariantNumeric: 'tabular-nums',
                          borderRight: '1px solid #edf2f7',
                        }}
                      >
                        {estacion.ultimaInspeccionFormatted}
                      </td>
                      <td className="cd-table-td" style={{ padding: '0.75rem 1.15rem' }}>
                        <TsBadge
                          variant={estacion.nivelSincronizacion ?? 'neutral'}
                          title={estacion.tooltipSincronizacion}
                          style={{ fontSize: '0.76rem', fontWeight: 600 }}
                        >
                          {estacion.estadoSincronizacionLabel ?? 'Sin datos'}
                        </TsBadge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
            fontSize: '0.85rem',
            color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <span>
            Mostrando <strong>{estacionesFiltradas.length}</strong> de <strong>{data?.totalEstaciones ?? 0}</strong> {UI.TABLA.FOOTER_LABEL}
          </span>
        </div>
      </TsCard>
    </div>
  );
}
