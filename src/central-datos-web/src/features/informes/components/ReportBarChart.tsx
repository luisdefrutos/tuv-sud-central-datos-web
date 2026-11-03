import React, { useState } from 'react';
import { TsCard } from '@tuvsud/design-system/react';
import type { ReportBarChartPoint } from '../types/informes.types';
import { AppTooltip } from '../../../components/common/AppTooltip';
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
  sortOrder?: 'desc' | 'asc' | 'none';
}

/**
 * Gráfico comparativo de barras horizontal de alto rendimiento y cero dependencias externas.
 * Renderiza en SVG/CSS nativo, adaptado a dispositivos móviles y con colores semánticos TÜV SÜD.
 * Con scroll vertical para mostrar todas las estaciones disponibles sin cortes ni truncamiento de cifras.
 */
export const ReportBarChart: React.FC<ReportBarChartProps> = ({
  title,
  subtitle,
  data,
  loading = false,
  valueFormatter = (val) => val.toLocaleString('es-ES'),
  emptyMessage = 'No hay datos disponibles para representar en el gráfico con los filtros seleccionados.',
  sortOrder = 'desc',
}) => {
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

  // Ordenación configurable (por defecto desc: mayor a menor, o asc: menor a mayor como en rankings de celeridad/tiempo)
  const sorted = sortOrder === 'none'
    ? [...data]
    : [...data].sort((a, b) => (sortOrder === 'asc' ? a.valor - b.valor : b.valor - a.valor));
  const visibleData = sorted;
  const maxVal = Math.max(...visibleData.map((d) => (d.valor > 0 ? d.valor : 0)), 1);

  return (
    <TsCard style={{ width: '100%', boxSizing: 'border-box', padding: 'clamp(1rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.5rem)', backgroundColor: '#ffffff', borderRadius: '8px' }}>
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

      {/* Contenedor vertical continuo: #1, #2, #3... orden natural a todo el ancho */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '440px',
          overflowY: 'auto',
          paddingRight: '6px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {visibleData.map((item, index) => {
          const isNegative = item.valor < 0;
          const pct = isNegative
            ? 2
            : Math.max(3, Math.min(100, Math.round((item.valor / maxVal) * 100)));
          const isHovered = hoveredId === item.id;
          const barColor = item.color ?? (item.sociedad === 'CAL' ? SOCIEDADES.CAL.colorBorde : SOCIEDADES.ATISAE.colorBorde);

          return (
            <AppTooltip
              key={item.id}
              title={item.label}
              badge={item.valorFormateado || valueFormatter(item.valor)}
              badgeColor={barColor}
              accentColor={barColor}
              subtitle={item.sociedad ? `Sociedad: ${item.sociedad === 'CAL' ? 'TÜV SÜD CAL' : 'TÜV SÜD ATISAE'}` : undefined}
              items={item.detallesTooltip}
              position="top"
              style={{ width: '100%', display: 'block' }}
            >
              <div
                className="cd-barchart-row"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 260px) 1fr auto',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  backgroundColor: isHovered ? '#f1f5f9' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  width: '100%',
                  boxSizing: 'border-box',
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
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textAlign: 'right',
                    color: isNegative ? '#dc2626' : (isHovered ? '#0046ad' : '#0f172a'),
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    paddingLeft: '6px',
                    minWidth: '80px',
                  }}
                >
                  {item.valorFormateado ?? valueFormatter(item.valor)}
                </div>
              </div>
            </AppTooltip>
          );
        })}
      </div>
    </TsCard>
  );
};
