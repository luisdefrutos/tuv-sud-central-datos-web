import React from 'react';
import { TsCard, TsInput, TsButton, TsIcon } from '@tuvsud/design-system/react';
import { AppTooltip } from '../../../components/common/AppTooltip';

export interface ReportTableContainerProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;
  totalFilas: number;
  filasVisibles: number;
  onExportExcel: () => void;
  onOpenCrystalReport?: () => void;
  isExporting?: boolean;
  exportDisabled?: boolean;
  unidadRegistros?: string;
  totalSumTexto?: string;
  children: React.ReactNode;
}

/**
 * Contenedor estándar y reutilizable para las tablas (grids) de todos los informes.
 * Incluye barra de búsqueda rápida en memoria, contador de registros y botón de exportación oficial a Excel.
 */
export const ReportTableContainer: React.FC<ReportTableContainerProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar por estación o código...',
  totalFilas,
  filasVisibles,
  onExportExcel,
  onOpenCrystalReport,
  isExporting = false,
  exportDisabled = false,
  unidadRegistros = 'estaciones',
  totalSumTexto,
  children,
}) => {
  return (
    <TsCard
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* 1. Barra de Herramientas de la Tabla */}
      <div
        className="cd-stack-mobile"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          flexWrap: 'wrap',
        }}
      >
        {/* Buscador */}
        <div style={{ flex: '1 1 360px', maxWidth: '580px', width: '100%' }}>
          <AppTooltip
            title={searchTerm ? 'Filtro de búsqueda activo' : 'Búsqueda rápida en el grid'}
            subtitle={searchTerm ? `Filtrando por: "${searchTerm}"` : 'Filtro en tiempo real'}
            content={
              searchTerm
                ? 'Datos del grid filtrados por el valor introducido en la caja. Para mostrar todos los datos limpie dicho valor.'
                : 'Escriba cualquier término (bastidor, matrícula, estación, equipo OBD...) o pulse en un KPI o bastidor para filtrar al instante.'
            }
            position="top"
            style={{ display: 'block', width: '100%' }}
          >
            <div
              id="report-search-container"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0 10px',
                height: '38px',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
            >
              <span style={{ color: '#64748b', marginRight: '8px', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                <TsIcon name="search" style={{ fontSize: '16px' }} />
              </span>
              <input
                id="report-search-input"
                className="cd-report-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.84rem',
                  color: '#0f172a',
                  backgroundColor: 'transparent',
                  fontWeight: 500,
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'color 0.15s ease',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0046ad')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <TsIcon name="close" style={{ fontSize: '14px' }} />
                </button>
              )}
            </div>
          </AppTooltip>
        </div>

        {/* Contador y Exportación */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            Mostrando <strong>{filasVisibles}</strong> de <strong>{totalFilas}</strong> {unidadRegistros}{totalSumTexto && <> (<strong>{totalSumTexto}</strong>)</>}
          </span>

          {onOpenCrystalReport && (
            <TsButton
              variant="secondary"
              size="medium"
              onClick={onOpenCrystalReport}
              disabled={exportDisabled}
              style={{
                fontWeight: 600,
                fontSize: '0.84rem',
              }}
            >
              <TsIcon slot="prefix" name="print" />
              Imprimir (Crystal Report)
            </TsButton>
          )}

          <TsButton
            variant="success"
            size="medium"
            onClick={onExportExcel}
            disabled={exportDisabled || isExporting}
            loading={isExporting}
            style={{
              fontWeight: 600,
              fontSize: '0.84rem',
            }}
          >
            <TsIcon slot="prefix" name="download" />
            {isExporting ? 'Generando...' : 'Exportar a Excel'}
          </TsButton>
        </div>
      </div>

      {/* Indicador de scroll para dispositivos táctiles */}
      <div
        className="cd-scroll-hint"
        style={{
          fontSize: '0.78rem',
          color: '#64748b',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 1.25rem',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <span>↔️ Deslice horizontalmente para consultar todas las columnas de la tabla</span>
      </div>

      {/* 2. Área de Tabla con Scroll Táctil */}
      <div className="cd-touch-scroll" style={{ width: '100%' }}>
        {children}
      </div>
    </TsCard>
  );
};

