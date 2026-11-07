import React, { useEffect, useState } from 'react';
import { TsIcon } from '@tuvsud/design-system/react';
import { AppTooltip } from '../../../components/common/AppTooltip';

interface LocalizacionGridSearchProps {
  value: string;
  searchableFields: string[];
  onSearchChange: (value: string) => void;
}

export const LocalizacionGridSearch: React.FC<LocalizacionGridSearchProps> = ({
  value,
  searchableFields,
  onSearchChange,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onSearchChange(draft), 100);
    return () => window.clearTimeout(timer);
  }, [draft, value, onSearchChange]);

  const clearSearch = () => {
    setDraft('');
    onSearchChange('');
  };

  return (
    <div style={{ width: '100%', maxWidth: '32.5rem' }}>
      <AppTooltip
        title={value ? 'Filtro visual activo en la tabla' : 'Filtro rápido sobre los resultados cargados'}
        subtitle="La búsqueda se aplica solo a las filas cargadas en el grid."
        content={
          searchableFields.length > 0
            ? `Campos incluidos: ${searchableFields.join(', ')}`
            : 'No hay columnas de texto, fecha o identificación seleccionadas para buscar.'
        }
        position="top"
        style={{ display: 'block', width: '100%' }}
      >
        <div className="cd-localizacion-grid-search">
          <span className="cd-localizacion-grid-search-icon">
            <TsIcon name="search" />
          </span>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              searchableFields.length > 0
                ? `Buscar en ${searchableFields.slice(0, 3).join(', ')}${searchableFields.length > 3 ? '…' : ''}`
                : 'No hay campos buscables seleccionados'
            }
            aria-label="Buscar en campos de texto, fecha e identificación del grid"
            disabled={searchableFields.length === 0}
          />
          {draft && (
            <button type="button" onClick={clearSearch} aria-label="Limpiar búsqueda">
              <TsIcon name="close" />
            </button>
          )}
        </div>
      </AppTooltip>
    </div>
  );
};
