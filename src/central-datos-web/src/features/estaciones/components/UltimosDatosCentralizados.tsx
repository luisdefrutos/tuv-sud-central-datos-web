import { useState, useEffect, useMemo } from 'react';
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
import type { ResumenEstaciones, FiltroSociedad } from '../types/estaciones.types';
import { fetchUltimosDatosEstaciones } from '../../../api/estacionesApi';
import { SOCIEDADES } from '../../../constants/companies.constants';
import { UI_CONSTANTS } from '../../../constants/ui.constants';

export function UltimosDatosCentralizados() {
  const [data, setData] = useState<ResumenEstaciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSociedad, setFiltroSociedad] = useState<FiltroSociedad>('TODAS');

  const { MODULO_ULTIMOS_DATOS: UI } = UI_CONSTANTS;

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await fetchUltimosDatosEstaciones();
      setData(json);
    } catch (err: any) {
      console.error('Error cargando últimas fechas:', err);
      setError(err.message || 'No se pudo conectar con el servicio central de estaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const estacionesFiltradas = useMemo(() => {
    if (!data?.estaciones) return [];
    return data.estaciones.filter((item) => {
      const matchText =
        item.codEstacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.desEstacion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSociedad =
        filtroSociedad === 'TODAS' ||
        (filtroSociedad === SOCIEDADES.ATISAE.clave && item.codEmpresa === SOCIEDADES.ATISAE.codigo) ||
        (filtroSociedad === SOCIEDADES.CAL.clave && item.codEmpresa === SOCIEDADES.CAL.codigo);

      return matchText && matchSociedad;
    });
  }, [data, searchTerm, filtroSociedad]);

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
              padding: '2.25rem 3rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              maxWidth: '420px',
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

      {/* 3. Cabecera del Módulo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
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
              fontSize: '1.65rem',
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
          onClick={cargarDatos}
          disabled={loading}
          style={{ minWidth: '160px' }}
        >
          {UI.BOTON_ACTUALIZAR}
        </TsButton>
      </div>

      {/* 4. Alerta de Error si la conexión falla */}
      {error && (
        <TsAlert variant="danger" open>
          <strong>Error de comunicación:</strong> {error}
        </TsAlert>
      )}

      {/* 5. Tarjetas de Resumen Operativo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
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
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)', fontFamily: 'monospace' }}>
            {data?.ultimaFechaGlobal ?? (loading ? '...' : 'N/D')}
          </div>
        </TsCard>
      </div>

      {/* 6. Barra de Búsqueda y Filtros Rápidos */}
      <TsCard>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
            <TsInput
              placeholder={UI.PLACEHOLDER_BUSQUEDA}
              value={searchTerm}
              onTsInput={(e: any) => setSearchTerm(e.target.value)}
              clearable
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

      {/* 7. Tabla Oficial de Estaciones ITV */}
      <TsCard>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
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
                <th style={{ padding: '0.85rem 1.25rem', width: '220px', fontWeight: 700 }}>{UI.TABLA.COL_SOCIEDAD}</th>
                <th style={{ padding: '0.85rem 1.25rem', width: '220px', fontWeight: 700 }}>{UI.TABLA.COL_ULTIMA_FECHA}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)' }}>
                    {UI.TABLA.CARGANDO}
                  </td>
                </tr>
              ) : estacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)' }}>
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
