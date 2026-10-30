import React from 'react';
import { TsCard, TsInput, TsButton } from '@tuvsud/design-system/react';

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
        <div style={{ flex: '1 1 260px', maxWidth: '400px', width: '100%' }}>
          <TsInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onTsInput={(e: any) => onSearchChange(e.target.value)}
            clearable
            style={{ width: '100%' }}
          />
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
            Mostrando <strong>{filasVisibles}</strong> de <strong>{totalFilas}</strong> estaciones
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
              🖨️ Imprimir (Crystal Report)
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
            {isExporting ? 'Generando...' : '📥 Exportar a Excel'}
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

