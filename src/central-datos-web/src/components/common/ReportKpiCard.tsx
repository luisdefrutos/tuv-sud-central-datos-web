import React from 'react';
import { TsCard, TsSpinner, TsIcon } from '@tuvsud/design-system/react';
import { AppTooltip } from './AppTooltip';

export function getMaterialIconName(iconOrEmoji?: string): string {
  if (!iconOrEmoji) return 'info';
  const map: Record<string, string> = {
    '⚠️': 'warning',
    '🏢': 'apartment',
    '🚗': 'directions_car',
    '⏱️': 'schedule',
    '🕒': 'schedule',
    '🏆': 'trophy',
    '📋': 'assignment',
    '📄': 'description',
    '📊': 'bar_chart',
    '📈': 'trending_up',
    '📉': 'trending_down',
    '✅': 'check_circle',
    '❌': 'cancel',
    'ℹ️': 'info',
    '💡': 'lightbulb',
    '🎟️': 'confirmation_number',
    '🔌': 'cable',
    '👤': 'person',
    '👥': 'groups',
    '🔍': 'search',
    '🖨️': 'print',
    '📥': 'download',
    '🔄': 'refresh',
    '🔃': 'refresh',
    '💶': 'payments',
    '💰': 'payments',
    '💳': 'payments',
    '🏷️': 'confirmation_number',
    '⛽': 'local_gas_station',
    '📱': 'chat',
    '📍': 'apartment',
    '⏳': 'hourglass_empty',
    '🍩': 'pie_chart',
    '🏠': 'home',
    '📡': 'sensors',
    '🖥️': 'desktop_windows',
    '1️⃣': 'filter_1',
    '2️⃣': 'filter_2',
  };
  return map[iconOrEmoji] || iconOrEmoji;
}

export interface ReportKpiCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'primary' | 'neutral' | 'success' | 'warning' | 'danger';
  icon?: string;
  loading?: boolean;
  style?: React.CSSProperties;
  badge?: string;
  textColor?: string;
}

const BORDER_COLORS: Record<string, string> = {
  primary: 'var(--ts-semantic-color-primary-default, #0046ad)',
  neutral: 'var(--ts-semantic-color-border-subtle, #cbd5e1)',
  success: 'var(--ts-semantic-color-status-success, #059669)',
  warning: 'var(--ts-semantic-color-status-warning, #d97706)',
  danger: 'var(--ts-semantic-color-status-danger, #dc2626)',
};

/**
 * Tarjeta KPI corporativa para los cuadros de mando de Central Datos Web.
 * Integrada con AppTooltip unificado y TsIcon oficial del TÜV SÜD Algorithm Design System.
 */
export const ReportKpiCard: React.FC<ReportKpiCardProps> = ({
  title,
  value,
  subtitle,
  variant = 'neutral',
  icon,
  loading = false,
  style,
  badge,
  textColor,
}) => {
  const activeBorderColor = BORDER_COLORS[variant] || BORDER_COLORS.neutral;

  return (
    <TsCard
      className="cd-kpi-card"
      style={{
        backgroundColor: '#ffffff',
        borderLeft: `4px solid ${activeBorderColor}`,
        borderRadius: '8px',
        padding: '1.1rem 1.25rem',
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
        >
          {title}
        </span>
        {icon && (
          <AppTooltip
            title={title}
            badge={String(value)}
            badgeColor={activeBorderColor}
            accentColor={activeBorderColor}
            subtitle={subtitle}
            position="top"
          >
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
                color: activeBorderColor,
              }}
              aria-hidden="true"
            >
              <TsIcon name={getMaterialIconName(icon)} size={18} />
            </span>
          </AppTooltip>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          {badge && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: activeBorderColor,
                backgroundColor: '#f8fafc',
                padding: '1px 6px',
                borderRadius: '4px',
                border: `1px solid ${activeBorderColor}`,
              }}
            >
              {badge}
            </span>
          )}
          {subtitle && (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--ts-semantic-color-text-subtle, #64748b)',
                lineHeight: 1.25,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </TsCard>
  );
};
