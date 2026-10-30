import React from 'react';

export interface SortIndicatorProps {
  direction: 'asc' | 'desc' | null;
}

/**
 * Indicador visual accesible de ordenación (flechas asc/desc con gradiente)
 * Integrado con las clases CSS .cd-table-th y .cd-table-th-active
 */
export const SortIndicator: React.FC<SortIndicatorProps> = ({ direction }) => {
  const isAsc = direction === 'asc';
  const isDesc = direction === 'desc';

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '7px',
        lineHeight: 0,
        flexShrink: 0,
        gap: '2px',
      }}
      aria-hidden="true"
    >
      {/* Flecha Arriba ▲ (Ascendente) */}
      <svg
        width="11"
        height="7"
        viewBox="0 0 11 7"
        fill="currentColor"
        style={{
          color: isAsc ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
          filter: isAsc ? 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' : 'none',
          transition: 'color 0.15s ease, filter 0.15s ease',
        }}
      >
        <path d="M5.5 0.5L11 6.5H0L5.5 0.5Z" />
      </svg>
      {/* Flecha Abajo ▼ (Descendente) */}
      <svg
        width="11"
        height="7"
        viewBox="0 0 11 7"
        fill="currentColor"
        style={{
          color: isDesc ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
          filter: isDesc ? 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.45))' : 'none',
          transition: 'color 0.15s ease, filter 0.15s ease',
        }}
      >
        <path d="M5.5 6.5L0 0.5H11L5.5 6.5Z" />
      </svg>
    </span>
  );
};

