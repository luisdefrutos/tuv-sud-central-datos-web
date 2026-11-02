import React, { useState, useEffect } from 'react';
import { TsCard, TsBadge } from '@tuvsud/design-system/react';
import type { ReportBarChartPoint, DetalleElementoTooltip } from '../types/informes.types';
import { AppTooltip } from '../../../components/common/AppTooltip';

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
  '#059669', // Verde esmeralda
  '#d97706', // Ámbar intenso
  '#7c3aed', // Púrpura
  '#dc2626', // Rojo coral
  '#0284c7', // Cyan brillante
  '#ea580c', // Naranja
  '#c026d3', // Magenta / Fucsia
  '#0d9488', // Verde azulado
  '#475569', // Pizarra
  '#b45309', // Bronce
  '#4338ca', // Índigo
];

/**
 * Gráfico Circular / Donut SVG nativo de cuotas porcentuales y distribución.
 * No requiere librerías externas pesadas y soporta interacción táctil/hover.
 * Integrado al 100% con AppTooltip corporativo (sin tooltips nativos del navegador).
 */
export const ReportDonutChart: React.FC<ReportDonutChartProps> = ({
  title,
  subtitle,
  data,
  loading = false,
  valueFormatter = (val) => val.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }),
  emptyMessage = 'No hay datos disponibles para representar en el gráfico circular.',
  maxSlices = 12,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);
  const [sliceTooltipPos, setSliceTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Reiniciar el hover interactivo cada vez que cambien los datos del gráfico
  useEffect(() => {
    setHoveredIndex(null);
    setHoveredSliceIndex(null);
    setSliceTooltipPos(null);
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
    tooltipSubtitle?: string;
    detallesTooltip?: DetalleElementoTooltip[];
  }

  const allSameColor = topSlices.length > 1 && topSlices.every((s) => s.color === topSlices[0].color);
  const slices: SliceItem[] = topSlices.map((item, idx) => ({
    id: item.id,
    label: item.label,
    valor: item.valor,
    pct: (item.valor / total) * 100,
    color: (!item.color || allSameColor) ? PALETTE[idx % PALETTE.length] : item.color,
    tooltipSubtitle: item.tooltipSubtitle,
    detallesTooltip: item.detallesTooltip,
  }));

  if (others.length > 0) {
    const othersVal = others.reduce((acc, curr) => acc + curr.valor, 0);
    slices.push({
      id: 'resto',
      label: `Resto (${others.length} otros)`,
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
  const activeTooltipSlice = hoveredSliceIndex !== null && hoveredSliceIndex < slices.length ? slices[hoveredSliceIndex] : null;

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

            {/* Segmentos de cuota con Tooltip unificado */}
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
                  onMouseEnter={(e) => {
                    setHoveredIndex(index);
                    setHoveredSliceIndex(index);
                    setSliceTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setSliceTooltipPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => {
                    setHoveredIndex(null);
                    setHoveredSliceIndex(null);
                    setSliceTooltipPos(null);
                  }}
                />
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
              width: '110px',
            }}
          >
            {activeSlice ? (
              <AppTooltip
                title={activeSlice.label}
                badge={`${valueFormatter(activeSlice.valor)} (${activeSlice.pct.toFixed(1)}%)`}
                badgeColor={activeSlice.color}
                accentColor={activeSlice.color}
                subtitle={activeSlice.tooltipSubtitle}
                items={activeSlice.detallesTooltip}
                position="top"
              >
                <div style={{ cursor: 'pointer' }}>
                  <div
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: activeSlice.color,
                      lineHeight: 1.1,
                    }}
                  >
                    {activeSlice.pct.toFixed(1)}%
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
                    {activeSlice.label.replace('I.T.V. - ', '')}
                  </div>
                </div>
              </AppTooltip>
            ) : (
              <div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0046ad',
                    lineHeight: 1.1,
                  }}
                >
                  100%
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#64748b',
                    marginTop: '2px',
                  }}
                >
                  Cuota Global
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leyenda interactiva al lado con AppTooltip corporativo */}
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
            const badgeVal = `${valueFormatter(slice.valor)} (${slice.pct.toFixed(1)}%)`;

            return (
              <AppTooltip
                key={slice.id}
                title={slice.label}
                badge={badgeVal}
                badgeColor={slice.color}
                accentColor={slice.color}
                subtitle={slice.tooltipSubtitle || `Estaciones comprendidas en ${slice.label}`}
                items={slice.detallesTooltip}
                position="left"
                style={{ width: '100%', display: 'block' }}
              >
                <div
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
                    width: '100%',
                    boxSizing: 'border-box',
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
              </AppTooltip>
            );
          })}
        </div>
      </div>

      {/* Tooltip Flotante Controlado para Sectores del SVG Donut */}
      {activeTooltipSlice && sliceTooltipPos && (
        <AppTooltip
          isOpen={true}
          targetCoords={sliceTooltipPos}
          title={activeTooltipSlice.label}
          badge={`${valueFormatter(activeTooltipSlice.valor)} (${activeTooltipSlice.pct.toFixed(1)}%)`}
          badgeColor={activeTooltipSlice.color}
          accentColor={activeTooltipSlice.color}
          subtitle={activeTooltipSlice.tooltipSubtitle || `Estaciones comprendidas en ${activeTooltipSlice.label}`}
          items={activeTooltipSlice.detallesTooltip}
          onClose={() => {
            setHoveredSliceIndex(null);
            setSliceTooltipPos(null);
          }}
        />
      )}
    </TsCard>
  );
};
