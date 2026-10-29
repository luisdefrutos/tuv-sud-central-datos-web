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
import { SOCIEDADES } from '../../../constants/companies.constants';
import { UI_CONSTANTS } from '../../../constants/ui.constants';

export function UltimosDatosCentralizados() {
  // Lógica y estados desacoplados limpiamente en el Custom Hook
  const {
    data,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filtroSociedad,
    setFiltroSociedad,
    estacionesFiltradas,
    recargar,
  } = useUltimosDatos();

  const { MODULO_ULTIMOS_DATOS: UI } = UI_CONSTANTS;

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

      {/* 2. Miga de Pan (Breadcrumb Oficial Algorithm DS) */}
      <TsBreadcrumb>
        {UI.BREADCRUMB.map((item, idx) => (
          <TsBreadcrumbItem key={idx}>{item}</TsBreadcrumbItem>
        ))}
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

      {/* 6. Barra de Búsqueda y Filtros Rápidos Responsiva */}
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
          <div style={{ flex: '1 1 280px', minWidth: '240px', width: '100%' }}>
            <TsInput
              placeholder={UI.PLACEHOLDER_BUSQUEDA}
              value={searchTerm}
              onTsInput={(e: any) => setSearchTerm(e.target.value)}
              clearable
              style={{ width: '100%' }}
            />
          </div>

          <div
            className="cd-filter-buttons"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
          >
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
              {UI.FILTRO_TODAS} ({data?.totalEstaciones ?? 0})
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
              {SOCIEDADES.ATISAE.nombreCorto}
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
              {SOCIEDADES.CAL.nombreCorto}
            </button>
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

        <div className="cd-touch-scroll" style={{ width: '100%' }}>
          <table
            style={{
              width: '100%',
              minWidth: '680px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: 'var(--ts-font-family-sans, system-ui)',
              fontSize: '0.92rem',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--ts-semantic-color-surface-subtle, #f4f6f9)',
                  borderBottom: '2px solid var(--ts-semantic-color-border-default, #d0dae5)',
                  color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                }}
              >
                <th style={{ padding: '0.85rem 1.25rem', width: '100px', fontWeight: 700 }}>{UI.TABLA.COL_CODIGO}</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>{UI.TABLA.COL_DESCRIPCION}</th>
                <th style={{ padding: '0.85rem 1.25rem', width: '180px', fontWeight: 700 }}>{UI.TABLA.COL_SOCIEDAD}</th>
                <th style={{ padding: '0.85rem 1.25rem', width: '180px', fontWeight: 700 }}>{UI.TABLA.COL_ULTIMA_FECHA}</th>
                <th style={{ padding: '0.85rem 1.25rem', width: '180px', fontWeight: 700 }}>Estado Centralización</th>
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
                estacionesFiltradas.map((estacion) => (
                  <tr
                    key={estacion.codEstacion}
                    style={{
                      borderBottom: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--ts-semantic-color-surface-subtle, #f4f6f9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td
                      style={{
                        padding: '0.85rem 1.25rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--ts-semantic-color-surface-brand-blue, #0046ad)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {estacion.codEstacion}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: '#1a202c' }}>
                      {estacion.desEstacion}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
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
                      style={{
                        padding: '0.85rem 1.25rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        color: estacion.tieneInspecciones ? '#0b253b' : 'var(--ts-semantic-color-text-subtle, #5c768d)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {estacion.ultimaInspeccionFormatted}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <TsBadge
                        variant={estacion.nivelSincronizacion ?? 'neutral'}
                        title={estacion.tooltipSincronizacion}
                        style={{ fontSize: '0.76rem', fontWeight: 600 }}
                      >
                        {estacion.estadoSincronizacionLabel ?? 'Sin datos'}
                      </TsBadge>
                    </td>
                  </tr>
                ))
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
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span>
            Mostrando <strong>{estacionesFiltradas.length}</strong> {UI.TABLA.FOOTER_LABEL}
          </span>
          <span style={{ fontSize: '0.78rem' }}>TÜV SÜD Algorithm Design System</span>
        </div>
      </TsCard>
    </div>
  );
}
