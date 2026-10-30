import React, { useState, useEffect } from 'react';
import { TsCard, TsBadge } from '@tuvsud/design-system/react';
import type { ReportBarChartPoint } from '../types/informes.types';

export interface ReportDonutChartProps {
  title: string;
  subtitle?: string;
  data: ReportBarChartPoint[];
  loading?: boolean;
  valueFormatter?: (val: number) => string;
  emptyMessage?: string;
  maxSlices?: number;
}

const PALETTE = [
  '#0046ad', // Azul TÜV SÜD primario
  '#00875a', // Verde CAL
  '#0091ff', // Cyan brillante
  '#d97706', // Ámbar
  '#7c3aed', // Púrpura
  '#dc2626', // Rojo
  '#0284c7', // Celeste
  '#059669', // Esmeralda
  '#ea580c', // Naranja
  '#64748b', // Gris otros
];

/**
 * Gráfico Circular / Donut SVG nativo de cuotas porcentuales y distribución.
 * No requiere librerías externas pesadas y soporta interacción táctil/hover.
 */
export const ReportDonutChart: React.FC<ReportDonutChartProps> = ({
  title,
  subtitle,
  data,
  loading = false,
  valueFormatter = (val) => val.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
  emptyMessage = 'No hay datos disponibles para representar en el gráfico circular.',
  maxSlices = 7,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Reiniciar el hover interactivo cada vez que cambien los datos del gráfico
  useEffect(() => {
    setHoveredIndex(null);
  }, [data]);

  if (loading) {
    return (
      <TsCard style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0b253b', marginBottom: '0.5rem' }}>
          {title}
        </div>
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          Calculando cuotas del gráfico circular...
        </div>
      </TsCard>
    );
  }

  const validData = data.filter((d) => d.valor > 0);
  const total = validData.reduce((acc, curr) => acc + curr.valor, 0);

  if (!validData || validData.length === 0 || total <= 0) {
    return (
      <TsCard style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0b253b', marginBottom: '0.5rem' }}>
          {title}
        </div>
        <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
          {emptyMessage}
        </div>
      </TsCard>
    );
  }

  // Ordenar de mayor a menor y agrupar excedentes en "Resto de estaciones"
  const sorted = [...validData].sort((a, b) => b.valor - a.valor);
  const topSlices = sorted.slice(0, maxSlices);
  const others = sorted.slice(maxSlices);

  interface SliceItem {
    id: string;
    label: string;
    valor: number;
    pct: number;
    color: string;
  }

  const slices: SliceItem[] = topSlices.map((item, idx) => ({
    id: item.id,
    label: item.label,
    valor: item.valor,
    pct: (item.valor / total) * 100,
    color: item.color || PALETTE[idx % PALETTE.length],
  }));

  if (others.length > 0) {
    const othersVal = others.reduce((acc, curr) => acc + curr.valor, 0);
    slices.push({
      id: 'resto',
      label: `Resto (${others.length} estaciones)`,
      valor: othersVal,
      pct: (othersVal / total) * 100,
      color: '#94a3b8',
    });
  }

  // Geometría SVG Donut
  const size = 200;
  const strokeWidth = 34;
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  let accumulatedLength = 0;

  const activeSlice = hoveredIndex !== null && hoveredIndex < slices.length ? slices[hoveredIndex] : null;

  return (
    <TsCard
      style={{
        padding: 'clamp(1rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.5rem)',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0b253b' }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Gráfico Donut SVG */}
        <div
          style={{
            position: 'relative',
            width: `${size}px`,
            height: `${size}px`,
            flexShrink: 0,
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
          >
            {/* Círculo base fondo */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />

            {/* Segmentos de cuota */}
            {slices.map((slice, index) => {
              const sliceLength = (slice.pct / 100) * circumference;
              const strokeDashoffset = -accumulatedLength;
              accumulatedLength += sliceLength;
              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${sliceLength} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: hoveredIndex !== null && !isHovered ? 0.6 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <title>{`${slice.label}: ${valueFormatter(slice.valor)} (${slice.pct.toFixed(1)}%)`}</title>
                </circle>
              );
            })}
          </svg>

          {/* Texto central en el agujero del donut */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'auto',
              cursor: 'pointer',
              width: '100px',
            }}
            title={activeSlice ? `${activeSlice.label}: ${valueFormatter(activeSlice.valor)} (${activeSlice.pct.toFixed(1)}%)` : `Cuota Global Red: ${valueFormatter(total)}`}
          >
            <div
              style={{
                fontSize: activeSlice ? '1rem' : '1.15rem',
                fontWeight: 800,
                color: activeSlice ? activeSlice.color : '#0046ad',
                lineHeight: 1.1,
              }}
            >
              {activeSlice ? `${activeSlice.pct.toFixed(1)}%` : '100%'}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#64748b',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeSlice ? activeSlice.label.replace('I.T.V. - ', '') : 'Cuota Global'}
            </div>
          </div>
        </div>

        {/* Leyenda interactiva al lado */}
        <div
          style={{
            flex: '1 1 240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {slices.map((slice, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  backgroundColor: isHovered ? '#edf5ff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: slice.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: isHovered ? 700 : 500,
                      color: isHovered ? '#0046ad' : '#1e293b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={slice.label}
                  >
                    {slice.label.replace('I.T.V. - ', '')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                    {valueFormatter(slice.valor)}
                  </span>
                  <TsBadge
                    variant="neutral"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      minWidth: '42px',
                      textAlign: 'center',
                    }}
                  >
                    {slice.pct.toFixed(1)}%
                  </TsBadge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TsCard>
  );
};

