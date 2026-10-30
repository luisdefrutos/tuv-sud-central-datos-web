import React from 'react';
import {
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsButton,
  TsCard,
  TsBadge,
} from '@tuvsud/design-system/react';
import { DESKTOP_MENUS } from '../../../constants/navigation.constants';

export interface InformesHubPageProps {
  onSelectReport: (reportId: string) => void;
  onNavigateHome: () => void;
}

/**
 * Catálogo / Hub Principal de Informes de Central Datos
 * Muestra todas las opciones de la sección 'Informes' de la aplicación de escritorio (mdiMain.vb),
 * permitiendo acceder a 'Facturación de Inspecciones' y volver en cualquier momento.
 */
export const InformesHubPage: React.FC<InformesHubPageProps> = ({
  onSelectReport,
  onNavigateHome,
}) => {
  const informesGroup = DESKTOP_MENUS.find((g) => g.id === 'informes');
  // Se aplanan los submenús (▶) para mostrar cada informe final como tarjeta
  const items = (informesGroup?.items || []).flatMap((item) =>
    item.children && item.children.length > 0 ? item.children : [item]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Miga de pan de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <TsBreadcrumb>
          <TsBreadcrumbItem onClick={onNavigateHome} style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}>
            Inicio
          </TsBreadcrumbItem>
          <TsBreadcrumbItem active>Informes</TsBreadcrumbItem>
        </TsBreadcrumb>

        <TsButton
          variant="secondary"
          size="small"
          onClick={onNavigateHome}
          style={{ fontSize: '0.82rem' }}
        >
          ← Volver al Inicio
        </TsButton>
      </div>

      {/* 2. Cabecera del Módulo de Informes */}
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
            <span style={{ fontSize: '1.75rem' }}>📑</span>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              Catálogo de Informes y Estadísticas
            </h1>
          </div>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              color: '#64748b',
              fontSize: '0.88rem',
              lineHeight: 1.4,
            }}
          >
            Seleccione el informe que desea consultar para abrir su cuadro de mandos y análisis de datos.
          </p>
        </div>
      </div>

      {/* 3. Rejilla de Informes Disponibles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))',
          gap: '1rem',
        }}
      >
        {items.map((item) => {
          const isFacturacion = item.id === 'facturacion';
          const isNumInspecciones = item.id === 'num-inspecciones';
          const isDuracionPromedio = item.id === 'duracion-promedio';
          const isAvailable = isFacturacion || isNumInspecciones || isDuracionPromedio;

          let descripcion = 'Módulo de análisis estadístico oficial de la aplicación de escritorio Central Datos.';
          if (isFacturacion) {
            descripcion = 'Dashboard interactivo con KPIs de liquidación neta, ranking por estación, gráfico circular y exportación a Excel.';
          } else if (isNumInspecciones) {
            descripcion = 'Desglose oficial de inspecciones favorables y rechazadas en Fase 1 y Fase 2, tasas de rechazo e impresión de Crystal Report.';
          } else if (isDuracionPromedio) {
            descripcion = 'Cálculo de tiempos medios de inspección periódica (001) por tipo de vehículo y estación, ranking de agilidad e impresión Crystal Report.';
          }

          return (
            <TsCard
              key={item.id}
              style={{
                padding: '1.25rem',
                backgroundColor: '#ffffff',
                borderLeft: isAvailable ? '4px solid #00875a' : '4px solid #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                boxShadow: isAvailable ? '0 4px 12px rgba(0, 135, 90, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '1.6rem' }}>{item.icon ?? '📊'}</span>
                  {isAvailable ? (
                    <TsBadge variant="success">Disponible</TsBadge>
                  ) : (
                    <TsBadge variant="neutral">En migración</TsBadge>
                  )}
                </div>
                <h3
                  style={{
                    margin: '0 0 0.4rem 0',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: isAvailable ? '#0046ad' : '#1e293b',
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: '#64748b',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                  }}
                >
                  {descripcion}
                </p>
              </div>

              <div>
                <TsButton
                  variant={isAvailable ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => onSelectReport(item.id)}
                  style={{
                    width: '100%',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                  }}
                >
                  {isAvailable ? 'Abrir Informe' : 'Ver Módulo'}
                </TsButton>
              </div>
            </TsCard>
          );
        })}
      </div>
    </div>
  );
};
