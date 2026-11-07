import React from 'react';
import {
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsButton,
  TsCard,
  TsBadge,
  TsIcon,
} from '@tuvsud/design-system/react';
import { DESKTOP_MENUS, IMPLEMENTED_SCREENS } from '../../../constants/navigation.constants';

export interface InspeccionesHubPageProps {
  onSelectModule: (moduleId: string) => void;
  onNavigateHome: () => void;
}

/**
 * Catálogo / Hub Principal del Menú 3. Inspecciones
 * Ofrece el localizador de inspecciones y las pantallas técnicas asociadas.
 */
export const InspeccionesHubPage: React.FC<InspeccionesHubPageProps> = ({
  onSelectModule,
  onNavigateHome,
}) => {
  const inspeccionesGroup = DESKTOP_MENUS.find((g) => g.id === 'inspecciones');
  const items = inspeccionesGroup?.items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Miga de pan de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <TsBreadcrumb>
          <TsBreadcrumbItem onClick={onNavigateHome} style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}>
            Inicio
          </TsBreadcrumbItem>
          <TsBreadcrumbItem active>Inspecciones</TsBreadcrumbItem>
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

      {/* 2. Cabecera del Módulo de Inspecciones */}
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
            <TsIcon name="directions_car" size={28} style={{ color: '#0046ad' }} />
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              Explorador y Localización Técnica de Inspecciones
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
            Seleccione el localizador técnico para consultar inspecciones, defectos, elementos verificados o mediciones de línea con selección dinámica de columnas Excel.
          </p>
        </div>
      </div>

      {/* 3. Rejilla de los 4 Localizadores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))',
          gap: '1rem',
        }}
      >
        {items.map((item) => {
          const isAvailable = (IMPLEMENTED_SCREENS as readonly string[]).includes(item.id);

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
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <TsIcon name={item.icon || 'directions_car'} size={26} style={{ color: isAvailable ? '#00875a' : '#64748b' }} />
                  <TsBadge variant={isAvailable ? 'success' : 'warning'}>
                    {isAvailable ? 'Disponible' : 'Pendiente'}
                  </TsBadge>
                </div>
                <h3
                  style={{
                    margin: '0 0 0.45rem 0',
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    color: '#0b253b',
                  }}
                >
                  {item.label}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.84rem',
                    color: '#64748b',
                    lineHeight: 1.45,
                  }}
                >
                  {item.descripcion}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <TsButton
                  variant={isAvailable ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => onSelectModule(item.id)}
                  style={{ width: '100%' }}
                >
                  Abrir Localizador →
                </TsButton>
              </div>
            </TsCard>
          );
        })}
      </div>
    </div>
  );
};
