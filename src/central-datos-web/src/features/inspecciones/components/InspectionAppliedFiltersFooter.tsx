import React from 'react';
import { TsIcon } from '@tuvsud/design-system/react';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';

interface AppliedFilter {
  text: string;
  stations?: string[];
}

export function formatInspectionAppliedFilter(filter: string): string {
  if (!filter.toUpperCase().startsWith('ESTACIONES:')) return filter;
  const rawCodes = filter.slice('ESTACIONES:'.length).trim();
  if (!rawCodes || rawCodes.toLowerCase() === 'todos' || rawCodes.toLowerCase() === 'todas') {
    return `ESTACIONES: Todas las estaciones (${ESTACIONES_OFICIALES.length})`;
  }

  const codes = rawCodes.split(',').map((code) => code.trim()).filter(Boolean);
  const formattedStations = codes.map((code) => {
    const paddedCode = code.padStart(4, '0');
    const station = ESTACIONES_OFICIALES.find((item) => item.codigo === paddedCode || item.codigo === code);
    if (!station) return paddedCode;
    const name = station.descripcion.replace(/^I\.T\.V\.\s*-\s*/i, '').trim();
    return `${paddedCode} - ${name}`;
  });

  return `ESTACIONES (${codes.length}): ${formattedStations.join(', ')}`;
}

interface InspectionAppliedFiltersFooterProps {
  filters: string[];
}

export const InspectionAppliedFiltersFooter: React.FC<InspectionAppliedFiltersFooterProps> = ({ filters }) => {
  const appliedFilters: AppliedFilter[] = filters.map((filter) => {
    const formatted = formatInspectionAppliedFilter(filter);
    const stationMatch = /^(ESTACIONES \(\d+\)):\s*(.+)$/.exec(formatted);
    if (!stationMatch) return { text: formatted };
    return {
      text: stationMatch[1],
      stations: stationMatch[2].split(', ').filter(Boolean),
    };
  });

  if (appliedFilters.length === 0) return null;

  return (
    <div
      style={{
        padding: '0.75rem 1.25rem',
        backgroundColor: 'var(--ts-semantic-color-surface-neutral-default)',
        borderTop: '1px dashed var(--ts-semantic-color-border-base-default)',
        fontSize: '0.76rem',
        color: 'var(--ts-semantic-color-text-neutral-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ts-semantic-size-space-300, 0.5rem)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <strong
        style={{
          color: 'var(--ts-semantic-color-text-base-default)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--ts-semantic-size-space-100, 0.25rem)',
        }}
      >
        <TsIcon name="filter_alt" size={14} style={{ color: 'var(--ts-semantic-color-icon-primary-default)' }} />
        <span>Filtros registrados en el libro Excel:</span>
      </strong>

      {appliedFilters.some((filter) => !filter.stations) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ts-semantic-size-space-300, 0.5rem)', minWidth: 0 }}>
          {appliedFilters.filter((filter) => !filter.stations).map((filter, index) => (
            <span
              key={index}
              style={{
                backgroundColor: 'var(--ts-semantic-color-surface-base-default)',
                border: '1px solid var(--ts-semantic-color-border-base-default)',
                borderRadius: 'var(--ts-semantic-size-radius-sm)',
                padding: '2px 8px',
                color: 'var(--ts-semantic-color-text-base-default)',
                fontWeight: 500,
                maxWidth: '100%',
                overflowWrap: 'anywhere',
              }}
            >
              {filter.text}
            </span>
          ))}
        </div>
      )}

      {appliedFilters.filter((filter) => filter.stations).map((filter, index) => (
        <div key={`stations-${index}`} style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              color: 'var(--ts-semantic-color-text-base-default)',
              marginBottom: 'var(--ts-semantic-size-space-100, 0.25rem)',
            }}
          >
            {filter.text}
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))',
              gap: '4px 12px',
            }}
          >
            {filter.stations?.map((station) => (
              <li
                key={station}
                style={{
                  backgroundColor: 'var(--ts-semantic-color-surface-base-default)',
                  border: '1px solid var(--ts-semantic-color-border-base-default)',
                  borderLeft: '3px solid var(--ts-semantic-color-border-primary-default)',
                  borderRadius: 'var(--ts-semantic-size-radius-sm)',
                  padding: '3px 8px',
                  color: 'var(--ts-semantic-color-text-base-default)',
                  fontWeight: 500,
                  overflowWrap: 'anywhere',
                }}
              >
                {station}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
