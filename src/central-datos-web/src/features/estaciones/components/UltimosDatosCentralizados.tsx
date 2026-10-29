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

export function UltimosDatosCentralizados() {
  const [data, setData] = useState<ResumenEstaciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSociedad, setFiltroSociedad] = useState<FiltroSociedad>('TODAS');

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
        (filtroSociedad === 'TSA' && item.codEmpresa === '01') ||
        (filtroSociedad === 'CAL' && item.codEmpresa === '03');

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
                Consultando Base de Datos Central
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
                  marginTop: '0.4rem',
                  lineHeight: 1.4,
                }}
              >
                Recuperando las últimas fechas y horas de inspección para las estaciones ITV. Por favor, espere...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Miga de Pan (Breadcrumb Oficial Algorithm DS) */}
      <TsBreadcrumb>
        <TsBreadcrumbItem>Inicio</TsBreadcrumbItem>
        <TsBreadcrumbItem>Aplicación</TsBreadcrumbItem>
        <TsBreadcrumbItem>Última fecha de inspección centralizada</TsBreadcrumbItem>
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
            Última fecha de inspección centralizada
          </h1>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
              fontSize: '0.92rem',
            }}
          >
            Consulta del último registro de inspección recibido por estación ITV en la base de datos central de TÜV SÜD.
          </p>
        </div>

        <TsButton
          variant="primary"
          onClick={cargarDatos}
          disabled={loading}
          style={{ minWidth: '160px' }}
        >
          🔄 Actualizar Datos
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
            Total Estaciones ITV
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.3rem', color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)' }}>
            {data?.totalEstaciones ?? (loading ? '...' : 0)}
          </div>
        </TsCard>

        <TsCard style={{ borderLeft: '4px solid #0046ad' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            TÜV SÜD ATISAE (TSA)
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.3rem', color: '#0046ad' }}>
            {data?.totalTsa ?? (loading ? '...' : 0)}
          </div>
        </TsCard>

        <TsCard style={{ borderLeft: '4px solid #00875a' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            TÜV SÜD CAL
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.3rem', color: '#00875a' }}>
            {data?.totalCal ?? (loading ? '...' : 0)}
          </div>
        </TsCard>

        <TsCard style={{ borderLeft: '4px solid #4a607a' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Última Fecha Registrada
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
              placeholder="Buscar por código (ej. 0202) o nombre de estación..."
              value={searchTerm}
              onTsInput={(e: any) => setSearchTerm(e.target.value)}
              clearable
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ts-semantic-color-text-subtle, #5c768d)', fontWeight: 600 }}>
              Sociedad:
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
              onClick={() => setFiltroSociedad('TSA')}
              style={{
                border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                background: filtroSociedad === 'TSA' ? 'var(--ts-semantic-color-surface-brand-blue, #0046ad)' : '#ffffff',
                color: filtroSociedad === 'TSA' ? '#ffffff' : 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                padding: '0.4rem 0.85rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: filtroSociedad === 'TSA' ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease',
              }}
            >
              TSA (01)
            </button>
            <button
              type="button"
              onClick={() => setFiltroSociedad('CAL')}
              style={{
                border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                background: filtroSociedad === 'CAL' ? 'var(--ts-semantic-color-surface-brand-blue, #0046ad)' : '#ffffff',
                color: filtroSociedad === 'CAL' ? '#ffffff' : 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                padding: '0.4rem 0.85rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: filtroSociedad === 'CAL' ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease',
              }}
            >
              CAL (03)
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
                <th style={{ padding: '0.85rem 1.25rem', width: '100px', fontWeight: 700 }}>Cod.</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>Descripción</th>
                <th style={{ padding: '0.85rem 1.25rem', width: '220px', fontWeight: 700 }}>Sociedad</th>
                <th style={{ padding: '0.85rem 1.25rem', width: '220px', fontWeight: 700 }}>Última fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)' }}>
                    Cargando datos de estaciones ITV...
                  </td>
                </tr>
              ) : estacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--ts-semantic-color-text-subtle, #5c768d)' }}>
                    No se encontraron estaciones que coincidan con la búsqueda.
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
                      <TsBadge variant={estacion.codEmpresa === '03' ? 'success' : 'primary'}>
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
            Mostrando <strong>{estacionesFiltradas.length}</strong> estaciones ITV
          </span>
          <span style={{ fontSize: '0.78rem' }}>TÜV SÜD Algorithm Design System</span>
        </div>
      </TsCard>
    </div>
  );
}
