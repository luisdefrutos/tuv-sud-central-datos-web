import React from 'react';
import { createPortal } from 'react-dom';
import { TsButton, TsIcon } from '@tuvsud/design-system/react';
import type { ColumnaResultadoLocalizacion, FilaLocalizacion } from '../types/localizacion.types';

interface InspectionRecordDetailModalProps {
  row: FilaLocalizacion | null;
  columns: ColumnaResultadoLocalizacion[];
  title: string;
  icon: string;
  onClose: () => void;
}

export const InspectionRecordDetailModal: React.FC<InspectionRecordDetailModalProps> = ({
  row,
  columns,
  title,
  icon,
  onClose,
}) => {
  if (!row) return null;

  return createPortal(
    <div className="cd-inspection-detail-backdrop" onClick={onClose}>
      <section
        className="cd-inspection-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspection-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cd-inspection-detail-header">
          <div className="cd-inspection-detail-heading">
            <TsIcon name={icon} size={20} />
            <h2 id="inspection-detail-title">Ficha Técnica de Registro · {title}</h2>
          </div>
          <button type="button" aria-label="Cerrar ficha" onClick={onClose}>
            <TsIcon name="close" size={20} />
          </button>
        </header>

        <div className="cd-inspection-detail-fields">
          {columns.map((column) => {
            const value = row[column.columnaExcel];
            return (
              <div key={column.idCampo} className="cd-inspection-detail-field">
                <strong>{column.desCampo} ({column.columnaExcel})</strong>
                <span>{value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : '—'}</span>
              </div>
            );
          })}
        </div>

        <footer className="cd-inspection-detail-footer">
          <TsButton variant="primary" size="small" onClick={onClose}>
            Cerrar Ficha
          </TsButton>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
