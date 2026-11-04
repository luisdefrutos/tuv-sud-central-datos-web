import React from 'react';
import { TsAlert, TsIcon } from '@tuvsud/design-system/react';

export interface ReportDateRangeAlertProps {
  mensaje: string | null;
  onAjustarAUnAno?: () => void;
}

/**
 * Banner corporativo unificado de aviso de rango de fechas para todos los informes.
 * Cumple el punto 4 del Estándar Oficial de Informes:
 * - Atributos 'open' y 'heading="Validación de Rango de Fechas"' requeridos por el Design System.
 * - Botón interactivo "Ajustar a 1 año" para resolver rápidamente el límite sin cálculos manuales.
 */
export const ReportDateRangeAlert: React.FC<ReportDateRangeAlertProps> = ({
  mensaje,
  onAjustarAUnAno,
}) => {
  if (!mensaje) return null;

  return (
    <TsAlert
      variant="warning"
      open
      heading="Validación de Rango de Fechas"
      style={{ fontSize: '0.88rem' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="warning" style={{ fontSize: '16px' }} /><span>{mensaje}</span></span>
        {onAjustarAUnAno && (
          <button
            type="button"
            onClick={onAjustarAUnAno}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#0046ad',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            Ajustar a 1 año
          </button>
        )}
      </div>
    </TsAlert>
  );
};

