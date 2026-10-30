import React from 'react';
import { TsSpinner } from '@tuvsud/design-system/react';

export interface BlockingLoadingModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
}

/**
 * Modal bloqueante unificado para la aplicación web de Central Datos.
 * Replica de forma exacta la experiencia visual de la primera pestaña (Últimos Datos Centralizados),
 * bloqueando la interacción con el fondo, mostrando el spinner oficial TÜV SÜD y unificando el diseño.
 */
export const BlockingLoadingModal: React.FC<BlockingLoadingModalProps> = ({
  isOpen,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
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
        <TsSpinner
          style={{
            fontSize: '3rem',
            color: 'var(--ts-semantic-color-surface-brand-blue, #0046ad)',
          }}
        />
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: '1.15rem',
              color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
              fontFamily: 'var(--ts-font-family-sans, system-ui)',
            }}
          >
            {title}
          </div>
          {message && (
            <div
              style={{
                fontSize: '0.875rem',
                color: 'var(--ts-semantic-color-text-subtle, #5c768d)',
                marginTop: '0.4rem',
                lineHeight: 1.4,
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
