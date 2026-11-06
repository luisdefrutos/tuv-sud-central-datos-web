import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { DetalleElementoTooltip } from '../../features/informes/types/informes.types';

export interface AppTooltipProps {
  children?: React.ReactNode;
  /** Texto simple o nodo para tooltips convencionales */
  content?: React.ReactNode;
  /** Título principal enriquecido (ej: "Ágiles (< 25 min)") */
  title?: string;
  /** Subtítulo contextual o descripción explicativa */
  subtitle?: string;
  /** Badge numérico o porcentual en cabecera (ej: "12 estaciones (42.9%)") */
  badge?: string;
  /** Color de fondo del badge */
  badgeColor?: string;
  /** Color de acento de cabecera / indicador visual */
  accentColor?: string;
  /** Desglose de elementos / estaciones asociadas */
  items?: DetalleElementoTooltip[];
  /** Pie o nota aclaratoria */
  footer?: string;
  /** Posición preferida */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Deshabilitar tooltip si no hay información relevante */
  disabled?: boolean;
  /** Ancho máximo (por defecto 380px para listados) */
  maxWidth?: number | string;
  /** Retardo de apertura en milisegundos */
  delay?: number;
  /** Estilos en línea para el contenedor activador */
  className?: string;
  style?: React.CSSProperties;
  /** Modo controlado: visibilidad explícita */
  isOpen?: boolean;
  /** Coordenadas explícitas del cursor en modo controlado */
  targetCoords?: { x: number; y: number } | null;
  /** Callback al cerrar en modo controlado */
  onClose?: () => void;
}

/**
 * Componente de Tooltip / Title unificado de alto diseño visual para la suite TÜV SÜD.
 * Con fondo blanco corporativo, posicionamiento ágil en el cursor y soporte
 * de scroll interactivo para consultar desgloses de estaciones cómodamente.
 * Admite modo envoltorio convencional con `children` y modo controlado flotante (`isOpen` + `targetCoords`).
 */
export const AppTooltip: React.FC<AppTooltipProps> = ({
  children,
  content,
  title,
  subtitle,
  badge,
  badgeColor = '#0046ad',
  accentColor,
  items,
  footer,
  position = 'top',
  disabled = false,
  maxWidth = 380,
  delay = 80,
  className,
  style,
  isOpen,
  targetCoords,
  onClose,
}) => {
  const [internalVisible, setInternalVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringTooltipRef = useRef(false);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  const isControlled = isOpen !== undefined;
  const isVisible = isControlled ? (isOpen && Boolean(targetCoords)) : internalVisible;

  const hasInfo = Boolean(content || title || (items && items.length > 0));

  const calculatePosition = useCallback(() => {
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : (typeof maxWidth === 'number' ? maxWidth : 360);
    const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 140;

    let targetX = 0;
    let targetY = 0;

    if (isControlled && targetCoords) {
      targetX = targetCoords.x;
      targetY = targetCoords.y;
    } else if (mousePosRef.current) {
      targetX = mousePosRef.current.x;
      targetY = mousePosRef.current.y;
    } else if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top;
    }

    const gap = 12;
    let left = targetX + gap;
    let top = targetY + gap;

    // Comprobación de límites en viewport (pantalla)
    // Si se sale por la derecha, colocarlo a la izquierda del cursor
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = targetX - tooltipWidth - gap;
    }

    // Si se sale por abajo, colocarlo por encima del cursor
    if (top + tooltipHeight > window.innerHeight - 16) {
      top = targetY - tooltipHeight - gap;
    }

    // Margen mínimo de seguridad en bordes
    if (left < 14) left = 14;
    if (top < 14) top = 14;

    setCoords({ top, left });
  }, [maxWidth, isControlled, targetCoords]);

  const handleTriggerMouseMove = (e: React.MouseEvent) => {
    if (isControlled) return;
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    if (!isVisible) {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      openTimerRef.current = setTimeout(() => {
        setInternalVisible(true);
      }, delay);
    }
  };

  const handleTriggerMouseEnter = (e: React.MouseEvent) => {
    if (isControlled || disabled || !hasInfo) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => {
      setInternalVisible(true);
    }, delay);
  };

  const handleTriggerMouseLeave = () => {
    if (isControlled) return;
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (!isHoveringTooltipRef.current) {
        setInternalVisible(false);
      }
    }, 220);
  };

  const handleTooltipMouseEnter = () => {
    isHoveringTooltipRef.current = true;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handleTooltipMouseLeave = () => {
    isHoveringTooltipRef.current = false;
    closeTimerRef.current = setTimeout(() => {
      if (isControlled) {
        onClose?.();
      } else {
        setInternalVisible(false);
      }
    }, 150);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      const handleScrollOrResize = () => calculatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const effectiveAccent = accentColor || badgeColor || '#0046ad';

  return (
    <>
      {children && (
        <div
          ref={triggerRef}
          onMouseEnter={handleTriggerMouseEnter}
          onMouseMove={handleTriggerMouseMove}
          onMouseLeave={handleTriggerMouseLeave}
          className={className}
          style={{
            display: 'inline-flex',
            width: 'auto',
            maxWidth: '100%',
            ...style,
          }}
        >
          {children}
        </div>
      )}

      {isVisible &&
        hasInfo &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 999999,
              maxWidth: typeof maxWidth === 'number' ? `min(calc(100vw - 28px), ${maxWidth}px)` : maxWidth,
              minWidth: title || (items && items.length > 0) ? '300px' : 'auto',
              background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 42px)', // Fondo Azul Suave Corporativo Unificado
              color: '#0b253b', // Texto Azul Oscuro Corporativo
              borderRadius: '8px',
              padding: title || items ? '12px 14px' : '8px 12px',
              boxShadow: '0 10px 25px -4px rgba(0, 70, 173, 0.2), 0 8px 16px -4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 70, 173, 0.18)',
              border: '1px solid #bfdbfe',
              borderTop: `3px solid ${effectiveAccent}`,
              pointerEvents: 'auto', // Permite interactuar y hacer scroll
              fontFamily: 'var(--ts-font-family-sans, "TUV SUD Pro", system-ui, -apple-system, sans-serif)',
              fontSize: '0.84rem',
              lineHeight: 1.35,
              animation: 'tuvTooltipFade 0.12s ease-out forwards',
            }}
          >
            {/* Cabecera Enriquecida */}
            {(title || badge) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: subtitle || items ? '6px' : '0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: effectiveAccent,
                      flexShrink: 0,
                    }}
                  />
                  {title && (
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: '#0b253b', // Azul Noche TÜV SÜD
                        letterSpacing: '0.1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {title}
                    </span>
                  )}
                </div>

                {badge && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: badgeColor,
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      flexShrink: 0,
                      letterSpacing: '0.2px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
            )}

            {/* Subtítulo descriptivo */}
            {subtitle && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginBottom: items && items.length > 0 ? '8px' : '0',
                  lineHeight: 1.25,
                }}
              >
                {subtitle}
              </div>
            )}

            {/* Contenido Simple si no hay desglose estructurado */}
            {content && !items && (
              <div style={{ color: '#334155', fontSize: '0.82rem' }}>{content}</div>
            )}

            {/* Lista Desglosada de Estaciones con Scroll Suave */}
            {items && items.length > 0 && (
              <>
                <div
                  style={{
                    height: '1px',
                    backgroundColor: '#e2e8f0',
                    margin: '6px 0',
                  }}
                />

                <div
                  style={{
                    maxHeight: '210px',
                    overflowY: 'auto',
                    paddingRight: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f8fafc',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      marginBottom: '2px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {items.length === 1 ? '1 estación' : `${items.length} estaciones`}
                    </span>
                    <span>Duración / Cifra</span>
                  </div>

                  {items.map((item, idx) => (
                    <div
                      key={item.codigo || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#0046ad',
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {item.codigo}
                        </span>
                        <span
                          style={{
                            color: '#1e293b',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {(item.nombre || (item as any).label || '').replace('I.T.V. - ', '')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {item.sociedad && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: item.sociedad === 'CAL' ? '#dcfce7' : '#e0e7ff',
                              color: item.sociedad === 'CAL' ? '#166534' : '#3730a3',
                            }}
                          >
                            {item.sociedad}
                          </span>
                        )}
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#0b253b',
                            fontSize: '0.78rem',
                          }}
                        >
                          {item.valor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pie aclaratorio */}
            {footer && (
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '6px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                {footer}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
