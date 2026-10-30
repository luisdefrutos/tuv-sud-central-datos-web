import React from 'react';
import { TsCard, TsSpinner } from '@tuvsud/design-system/react';

export interface ReportKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  borderColor?: string;
  textColor?: string;
  icon?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

const VARIANT_BORDER_COLORS: Record<string, string> = {
  primary: '#0046ad', // Azul TÜV SÜD
  success: '#00875a', // Verde CAL / Aprobado
  warning: '#d97706', // Ámbar Alerta
  danger: '#dc2626',  // Rojo Rechazo / Crítico
  neutral: '#4a607a', // Gris corporativo
};

/**
 * Tarjeta métrica KPI corporativa para cuadros de mando y resúmenes de informes.
 * Respeta tokens de Algorithm DS con borde semántico lateral y tipografía de alto contraste.
 */
export const ReportKpiCard: React.FC<ReportKpiCardProps> = ({
  title,
  value,
  subtitle,
  variant = 'primary',
  borderColor,
  textColor,
  icon,
  loading = false,
  style,
}) => {
  const activeBorderColor = borderColor ?? VARIANT_BORDER_COLORS[variant] ?? '#0046ad';

  return (
    <TsCard
      style={{
        borderLeft: `4px solid ${activeBorderColor}`,
        backgroundColor: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '92px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span
          style={{
            fontSize: '0.8rem',
            color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            lineHeight: 1.3,
          }}
          title={`${title}: ${value}`}
        >
          {title}
        </span>
        {icon && (
          <span
            style={{
              fontSize: '1.25rem',
              lineHeight: 1,
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'help',
            }}
            title={`${title}: ${value}${subtitle ? ` (${subtitle})` : ''}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      <div style={{ marginTop: '0.4rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', height: '2rem' }}>
            <TsSpinner size="small" />
          </div>
        ) : (
          <div
            style={{
              fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)',
              fontWeight: 800,
              color: textColor ?? (variant === 'primary' || variant === 'neutral'
                ? 'var(--ts-semantic-color-surface-inverted-default, #0b253b)'
                : activeBorderColor),
              letterSpacing: '-0.5px',
              lineHeight: 1.15,
            }}
          >
            {value}
          </div>
        )}

        {subtitle && (
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--ts-semantic-color-text-subtle, #64748b)',
              marginTop: '0.3rem',
              fontWeight: 500,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </TsCard>
  );
};

