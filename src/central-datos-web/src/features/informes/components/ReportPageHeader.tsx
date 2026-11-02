import React from 'react';
import { TsBreadcrumb, TsBreadcrumbItem, TsButton } from '@tuvsud/design-system/react';

export interface ReportPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  breadcrumbItemText: string;
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
  children?: React.ReactNode;
}

/**
 * Cabecera oficial estandarizada para todas las páginas de informes.
 * Cumple el punto 6 del Estándar Oficial de Informes:
 * - Miga de pan de navegación oficial (Inicio > Informes > [Nombre del Informe]).
 * - Botón de retorno "← Volver a Informes".
 * - Título y subtítulo descriptivos limpios sin insignias redundantes ("Oficial").
 * - Contenedor flexible de botones de acción a la derecha.
 */
export const ReportPageHeader: React.FC<ReportPageHeaderProps> = ({
  title,
  subtitle,
  icon,
  breadcrumbItemText,
  onNavigateHome,
  onNavigateToInformes,
  children,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* 1. Miga de pan de navegación */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <TsBreadcrumb>
          <TsBreadcrumbItem
            onClick={onNavigateHome}
            style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}
          >
            Inicio
          </TsBreadcrumbItem>
          <TsBreadcrumbItem
            onClick={onNavigateToInformes || onNavigateHome}
            style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}
          >
            Informes
          </TsBreadcrumbItem>
          <TsBreadcrumbItem active>{breadcrumbItemText}</TsBreadcrumbItem>
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

      {/* 2. Título, subtítulo y botones de acción */}
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
            {icon && <span style={{ fontSize: '1.75rem' }}>{icon}</span>}
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                fontWeight: 800,
                color: '#0b253b',
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </h1>
          </div>
          {subtitle && (
            <p
              style={{
                margin: '0.35rem 0 0 0',
                color: '#64748b',
                fontSize: '0.86rem',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {children && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

