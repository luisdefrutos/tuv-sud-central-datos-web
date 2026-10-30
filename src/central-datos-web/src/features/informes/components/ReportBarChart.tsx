import React, { useState } from 'react';
import { TsCard, TsButton } from '@tuvsud/design-system/react';
import type { ReportBarChartPoint } from '../types/informes.types';
import { SOCIEDADES } from '../../../constants/companies.constants';

export interface ReportBarChartProps {
  title: string;
  subtitle?: string;
  data: ReportBarChartPoint[];
  loading?: boolean;
  valueFormatter?: (val: number) => string;
  emptyMessage?: string;
  defaultTopCount?: number;
  height?: number | string;
}

/**
 * Gráfico comparativo de barras horizontal de alto rendimiento y cero dependencias externas.
 * Renderiza en SVG/CSS nativo, adaptado a dispositivos móviles y con colores semánticos TÜV SÜD.
 */
export const ReportBarChart: React.FC<ReportBarChartProps> = ({
  title,
  subtitle,
  data,
  loading = false,
  valueFormatter = (val) => val.toLocaleString('es-ES'),
  emptyMessage = 'No hay datos disponibles para representar en el gráfico con los filtros seleccionados.',
  defaultTopCount = 10,
}) => {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (loading) {
    return (
      <TsCard style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0b253b', marginBottom: '0.5rem' }}>
          {title}
        </div>
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Cargando métricas del gráfico...
        </div>
      </TsCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <TsCard style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0b253b', marginBottom: '0.5rem' }}>
          {title}
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
          {emptyMessage}
        </div>
      </TsCard>
    );
  }

  // Ordenar de mayor a menor valor
  const sorted = [...data].sort((a, b) => b.valor - a.valor);
  const visibleData = mostrarTodos ? sorted : sorted.slice(0, defaultTopCount);
  const maxVal = Math.max(...visibleData.map((d) => d.valor), 1);

  return (
    <TsCard style={{ padding: 'clamp(1rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.5rem)', backgroundColor: '#ffffff', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0b253b' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>

        {sorted.length > defaultTopCount && (
          <TsButton
            variant="text"
            size="small"
            onClick={() => setMostrarTodos(!mostrarTodos)}
            style={{ fontSize: '0.78rem', padding: '4px 8px' }}
          >
            {mostrarTodos ? `Ver solo Top ${defaultTopCount}` : `Ver todas las ${sorted.length} estaciones`}
          </TsButton>
        )}
      </div>

      {/* Leyenda Oficial de Colores de Sociedad */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          padding: '0.45rem 0.85rem',
          marginBottom: '0.85rem',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '0.8rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.75rem' }}>
          Leyenda:
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: '#0046ad',
              display: 'inline-block',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          />
          <span style={{ color: '#0b253b' }}>
            <strong style={{ color: '#0046ad' }}>Azul:</strong> TÜV SÜD ATISAE (TSA)
          </span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: '#00875a',
              display: 'inline-block',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          />
          <span style={{ color: '#0b253b' }}>
            <strong style={{ color: '#00875a' }}>Verde:</strong> TÜV SÜD CAL (CAL)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
        {visibleData.map((item, index) => {
          const pct = Math.max(2, Math.round((item.valor / maxVal) * 100));
          const isHovered = hoveredId === item.id;
          const barColor =
            item.color ??
            (item.sociedad === 'CAL'
              ? SOCIEDADES.CAL.colorBorde
              : SOCIEDADES.ATISAE.colorBorde);

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(95px, 180px) 1fr minmax(65px, 105px)',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 6px',
                borderRadius: '4px',
                backgroundColor: isHovered ? '#f1f5f9' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
            >
              {/* Etiqueta / Nombre Estación */}
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: isHovered ? '#0046ad' : '#1e293b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={item.label}
              >
                <span style={{ color: '#94a3b8', marginRight: '6px', fontSize: '0.75rem' }}>
                  #{index + 1}
                </span>
                {item.label}
              </div>

              {/* Barra de Progreso / Valor */}
              <div
                style={{
                  height: '14px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    borderRadius: '3px',
                    transition: 'width 0.4s ease-out',
                    opacity: isHovered ? 1 : 0.88,
                  }}
                />
              </div>

              {/* Valor Numérico Formateado */}
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  textAlign: 'right',
                  color: '#0f172a',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.valorFormateado ?? valueFormatter(item.valor)}
              </div>
            </div>
          );
        })}
      </div>
    </TsCard>
  );
};

