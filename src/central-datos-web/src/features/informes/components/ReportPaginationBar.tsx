import React from 'react';
import { TsButton } from '@tuvsud/design-system/react';

export interface ReportPaginationBarProps {
  page: number;
  pageSize: number;
  totalFilas: number;
  totalPaginas: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  unidadRegistros?: string;
}

/**
 * Barra de paginación reactiva homogénea para todos los informes de Central Datos Web.
 * Cumple con el Estándar Oficial de Informes:
 * - Resumen textual del total de registros filtrados.
 * - Navegación a Primera, Anterior, Siguiente y Última con control de deshabilitado.
 * - Selector interactivo de registros por página (25, 50, 100, 200, 500).
 */
export const ReportPaginationBar: React.FC<ReportPaginationBarProps> = ({
  page,
  pageSize,
  totalFilas,
  totalPaginas,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200, 500],
  unidadRegistros = 'registros',
}) => {
  if (totalFilas <= 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.85rem 1.25rem',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.82rem',
      }}
    >
      {/* 1. Resumen Textual */}
      <div style={{ color: '#64748b' }}>
        Página <span style={{ fontWeight: 700, color: '#1e293b' }}>{page}</span> de{' '}
        <span style={{ fontWeight: 700, color: '#1e293b' }}>{totalPaginas}</span> ({totalFilas.toLocaleString('es-ES')} {unidadRegistros} en total)
      </div>

      {/* 2. Controles de Navegación de Página */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <TsButton
          variant="secondary"
          size="small"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
        >
          « Primera
        </TsButton>
        <TsButton
          variant="secondary"
          size="small"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
        >
          ‹ Anterior
        </TsButton>

        <span
          style={{
            margin: '0 6px',
            fontWeight: 700,
            color: '#0046ad',
            fontSize: '0.82rem',
            padding: '2px 8px',
            backgroundColor: '#f0f6ff',
            borderRadius: '4px',
            border: '1px solid #bfdbfe',
          }}
        >
          {page} / {totalPaginas}
        </span>

        <TsButton
          variant="secondary"
          size="small"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPaginas}
          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
        >
          Siguiente ›
        </TsButton>
        <TsButton
          variant="secondary"
          size="small"
          onClick={() => onPageChange(totalPaginas)}
          disabled={page >= totalPaginas}
          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
        >
          Última »
        </TsButton>
      </div>

      {/* 3. Selector de Registros por Página Homogéneo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label
          htmlFor="report-page-size-select"
          style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, cursor: 'pointer' }}
        >
          Registros por página:
        </label>
        <select
          id="report-page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

