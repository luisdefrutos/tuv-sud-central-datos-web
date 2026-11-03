import React from 'react';
import { AppTooltip } from '../../../components/common/AppTooltip';
import type { HeatmapCelda } from '../types/inspRangoHorario.types';

export interface ReportHeatmapChartProps {
  heatmapData: HeatmapCelda[];
  totalInspecciones: number;
  selectedHora?: string | null;
  selectedDia?: string | null;
  onSelectDia?: (dia: string) => void;
  onSelectHora?: (hora: string) => void;
  onSelectCelda?: (dia: string, hora: string) => void;
  title?: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];

export const ReportHeatmapChart: React.FC<ReportHeatmapChartProps> = ({
  heatmapData,
  totalInspecciones,
  selectedHora,
  selectedDia,
  onSelectDia,
  onSelectHora,
  onSelectCelda,
  title = 'Matriz de Afluencia por Día de la Semana y Franja Horaria (Heatmap)',
}) => {
  // Encontrar el valor máximo para calcular la intensidad relativa (0 a 1)
  const maxCantidad = React.useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return 1;
    return Math.max(...heatmapData.map((c) => c.cantidad), 1);
  }, [heatmapData]);

  // Mapa rápido [dia_hora] => celda
  const celdasMap = React.useMemo(() => {
    const map = new Map<string, HeatmapCelda>();
    heatmapData?.forEach((c) => {
      map.set(`${c.diaSemana}_${c.hora}`, c);
    });
    return map;
  }, [heatmapData]);

  // Función de color de calor basada en escala TÜV SÜD (azul claro a azul corporativo intenso)
  const getCellColor = (cantidad: number) => {
    if (cantidad === 0) return '#f8fafc';
    const ratio = cantidad / maxCantidad;
    if (ratio < 0.15) return '#e0f2fe'; // azul muy tenue
    if (ratio < 0.35) return '#bae6fd'; // azul claro
    if (ratio < 0.6) return '#7dd3fc';  // azul cielo
    if (ratio < 0.8) return '#0284c7';  // azul medio
    return '#003366';                   // azul institucional TÜV SÜD
  };

  const getTextColor = (cantidad: number) => {
    const ratio = cantidad / maxCantidad;
    return ratio >= 0.6 ? '#ffffff' : '#0f172a';
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 600, color: '#003366' }}>
          {title}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
          <span>Menor afluencia</span>
          <div style={{ display: 'flex', gap: '3px' }}>
            <span style={{ width: '14px', height: '14px', backgroundColor: '#e0f2fe', borderRadius: '2px', border: '1px solid #cbd5e1' }} />
            <span style={{ width: '14px', height: '14px', backgroundColor: '#bae6fd', borderRadius: '2px' }} />
            <span style={{ width: '14px', height: '14px', backgroundColor: '#7dd3fc', borderRadius: '2px' }} />
            <span style={{ width: '14px', height: '14px', backgroundColor: '#0284c7', borderRadius: '2px' }} />
            <span style={{ width: '14px', height: '14px', backgroundColor: '#003366', borderRadius: '2px' }} />
          </div>
          <span style={{ fontWeight: 600, color: '#003366' }}>Mayor demanda</span>
        </div>
      </div>

      {/* Grid del Heatmap */}
      <div style={{ minWidth: '700px', display: 'grid', gridTemplateColumns: '90px repeat(16, 1fr)', gap: '4px' }}>
        {/* Cabecera de Horas */}
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', padding: '6px' }}>Día / Hora</div>
        {HORAS.map((h) => {
          const isSelected = selectedHora === h;
          return (
            <div
              key={h}
              onClick={() => onSelectHora?.(h)}
              style={{
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: isSelected ? 800 : 700,
                color: isSelected ? '#ffffff' : '#003366',
                padding: '6px 2px',
                backgroundColor: isSelected ? '#0284c7' : '#f1f5f9',
                borderRadius: '4px',
                cursor: onSelectHora ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                boxShadow: isSelected ? '0 0 0 2px #38bdf8, 0 2px 6px rgba(2, 132, 199, 0.4)' : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (onSelectHora && !isSelected) {
                  e.currentTarget.style.backgroundColor = '#e0f2fe';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (onSelectHora && !isSelected) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              title={onSelectHora ? `Clic para filtrar el grid por la franja ${h}:00 h (${h}h)` : undefined}
            >
              {h}h
            </div>
          );
        })}

        {/* Filas por Día */}
        {DIAS.map((dia) => {
          const isDiaSelected = selectedDia?.toLowerCase() === dia.toLowerCase();
          return (
            <React.Fragment key={dia}>
              <div
                onClick={() => onSelectDia?.(dia)}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: isDiaSelected ? 800 : 600,
                  color: isDiaSelected ? '#ffffff' : '#003366',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  cursor: onSelectDia ? 'pointer' : 'default',
                  borderRadius: '4px',
                  backgroundColor: isDiaSelected ? '#0284c7' : 'transparent',
                  boxShadow: isDiaSelected ? '0 0 0 2px #38bdf8' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (onSelectDia && !isDiaSelected) e.currentTarget.style.backgroundColor = '#edf5ff';
                }}
                onMouseLeave={(e) => {
                  if (onSelectDia && !isDiaSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={onSelectDia ? `Clic para filtrar el grid por ${dia}` : undefined}
              >
                {dia}
              </div>

              {HORAS.map((h) => {
                const celda = celdasMap.get(`${dia}_${h}`) || {
                  diaSemana: dia,
                  diaNumero: 1,
                  hora: h,
                  cantidad: 0,
                  porcentaje: 0,
                };

                const bgColor = getCellColor(celda.cantidad);
                const textColor = getTextColor(celda.cantidad);
                const isSelectedHora = selectedHora === h;

                return (
                  <AppTooltip
                    key={`${dia}_${h}`}
                    title={`${dia} a las ${h}:00 h`}
                    subtitle={`${celda.cantidad.toLocaleString()} inspecciones`}
                    content={
                      celda.cantidad > 0
                        ? `Representa el ${celda.porcentaje}% del total acumulado en el periodo. Haga clic para filtrar el grid por ${dia} a las ${h}:00 h (${h}h).`
                        : 'Sin inspecciones registradas en esta franja horaria.'
                    }
                    position="top"
                  >
                    <div
                      onClick={() => {
                        if (celda.cantidad > 0) {
                          if (onSelectCelda) {
                            onSelectCelda(dia, h);
                          } else if (onSelectDia) {
                            onSelectDia(dia);
                          }
                        }
                      }}
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        borderRadius: '4px',
                        height: '38px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: isSelectedHora ? 800 : 600,
                        cursor: celda.cantidad > 0 && onSelectDia ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                        userSelect: 'none',
                        outline: isSelectedHora ? '2px solid #0284c7' : 'none',
                        boxShadow: isSelectedHora ? '0 0 8px rgba(2, 132, 199, 0.45)' : 'none',
                        zIndex: isSelectedHora ? 2 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (celda.cantidad > 0) {
                          e.currentTarget.style.transform = 'scale(1.08)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                          e.currentTarget.style.zIndex = '3';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = isSelectedHora ? '0 0 8px rgba(2, 132, 199, 0.45)' : 'none';
                        e.currentTarget.style.zIndex = isSelectedHora ? '2' : '1';
                      }}
                    >
                      {celda.cantidad > 0 ? celda.cantidad : '-'}
                    </div>
                  </AppTooltip>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
