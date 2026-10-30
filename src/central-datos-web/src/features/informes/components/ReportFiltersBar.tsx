import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TsButton, TsBadge } from '@tuvsud/design-system/react';
import type { FiltroSociedad } from '../../estaciones/types/estaciones.types';
import { ESTACIONES_OFICIALES } from '../../../constants/estaciones.constants';

export interface ReportFiltersBarProps {
  fechaInicio: string;
  fechaFin: string;
  sociedad: FiltroSociedad;
  estacionesSeleccionadas: string[];
  onFechaInicioChange: (val: string) => void;
  onFechaFinChange: (val: string) => void;
  onSociedadChange: (sociedad: FiltroSociedad) => void;
  onEstacionesChange: (codigos: string[]) => void;
  onConsultar: () => void;
  loading?: boolean;
}

/**
 * Barra horizontal compacta de filtros para informes.
 * Contenedor con overflow visible para garantizar que el menú desplegable de estaciones
 * se superponga limpiamente sobre las tarjetas inferiores sin ser recortado.
 */
export const ReportFiltersBar: React.FC<ReportFiltersBarProps> = ({
  fechaInicio,
  fechaFin,
  sociedad,
  estacionesSeleccionadas,
  onFechaInicioChange,
  onFechaFinChange,
  onSociedadChange,
  onEstacionesChange,
  onConsultar,
  loading = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estaciones filtradas según la sociedad seleccionada (TODAS / TSA / CAL)
  const estacionesDisponibles = useMemo(() => {
    return ESTACIONES_OFICIALES.filter((est) => {
      if (sociedad === 'TODAS') return true;
      return est.sociedad === sociedad;
    });
  }, [sociedad]);

  // Lista de estaciones filtradas por el buscador del dropdown
  const estacionesBusqueda = useMemo(() => {
    if (!filtroTexto.trim()) return estacionesDisponibles;
    const term = filtroTexto.toLowerCase().trim();
    return estacionesDisponibles.filter(
      (e) =>
        e.codigo.toLowerCase().includes(term) ||
        e.descripcion.toLowerCase().includes(term)
    );
  }, [estacionesDisponibles, filtroTexto]);

  const handleToggleEstacion = (codigo: string) => {
    if (estacionesSeleccionadas.includes(codigo)) {
      onEstacionesChange(estacionesSeleccionadas.filter((c) => c !== codigo));
    } else {
      onEstacionesChange([...estacionesSeleccionadas, codigo]);
    }
  };

  const handleMarcarTodas = () => {
    onEstacionesChange(estacionesDisponibles.map((e) => e.codigo));
  };

  const handleDesmarcarTodas = () => {
    onEstacionesChange([]);
  };

  const textoResumenEstaciones = () => {
    if (estacionesSeleccionadas.length === 0) {
      return 'Ninguna (0)';
    }
    if (estacionesSeleccionadas.length === estacionesDisponibles.length) {
      return `Todas (${estacionesDisponibles.length})`;
    }
    if (estacionesSeleccionadas.length === 1) {
      const found = ESTACIONES_OFICIALES.find((e) => e.codigo === estacionesSeleccionadas[0]);
      return found ? `${found.codigo} - ${found.descripcion.replace('I.T.V. - ', '')}` : estacionesSeleccionadas[0];
    }
    return `${estacionesSeleccionadas.length} seleccionadas`;
  };

  return (
    <div
      style={{
        padding: '0.65rem 1rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      <div
        className="cd-stack-mobile"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* GRUPO DE FILTROS: Fechas + Sociedad + Estaciones */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
            flex: '1 1 auto',
          }}
        >
          {/* 1. Rango de Fechas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Desde:
              </span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => onFechaInicioChange(e.target.value)}
                disabled={loading}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginLeft: '2px' }}>
                Hasta:
              </span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => onFechaFinChange(e.target.value)}
                disabled={loading}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                color: '#64748b',
                fontWeight: 600,
                backgroundColor: '#f1f5f9',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '2px',
              }}
              title="Por motivos de optimización, el rango de consulta no puede superar 365 días"
            >
              Máx. 1 año
            </span>
          </div>

          <div style={{ width: '1px', height: '26px', backgroundColor: '#e2e8f0' }} className="cd-hide-mobile" />

          {/* 2. Selector de Sociedad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
              Sociedad:
            </span>
            {(['TODAS', 'TSA', 'CAL'] as const).map((soc) => {
              const activa = sociedad === soc;
              return (
                <button
                  key={soc}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    onSociedadChange(soc);
                    const estSoc = ESTACIONES_OFICIALES.filter(
                      (e) => soc === 'TODAS' || e.sociedad === soc
                    ).map((e) => e.codigo);
                    onEstacionesChange(estSoc);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: activa ? '1px solid #0046ad' : '1px solid #cbd5e1',
                    backgroundColor: activa ? '#0046ad' : '#ffffff',
                    color: activa ? '#ffffff' : '#334155',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {soc === 'TODAS' ? 'Todas' : soc}
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '26px', backgroundColor: '#e2e8f0' }} className="cd-hide-mobile" />

          {/* 3. Selector de Estaciones (Desplegable flotante garantizado sin recortes) */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Estaciones:
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: 'pointer',
                  minWidth: '150px',
                  maxWidth: '220px',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {textoResumenEstaciones()}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>▼</span>
              </button>
            </div>

            {/* Menú Desplegable con Posicionamiento Absoluto y z-index Elevado */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '320px',
                  maxWidth: 'calc(100vw - 32px)',
                  maxHeight: '380px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 12px 28px rgba(11, 37, 59, 0.2), 0 4px 10px rgba(0,0,0,0.08)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Cabecera del desplegable con buscador rápido */}
                <div
                  style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Filtrar estación o código..."
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleMarcarTodas}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0046ad',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        padding: '2px 4px',
                      }}
                    >
                      ☑ Marcar todas ({estacionesDisponibles.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDesmarcarTodas}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: '2px 4px',
                      }}
                    >
                      ☐ Desmarcar todas
                    </button>
                  </div>
                </div>

                {/* Lista de estaciones con checkbox interactivo directo */}
                <div style={{ overflowY: 'auto', padding: '4px 0', flex: 1, maxHeight: '280px' }}>
                  {estacionesBusqueda.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                      No se encontraron estaciones coincidentes
                    </div>
                  ) : (
                    estacionesBusqueda.map((est) => {
                      const checked = estacionesSeleccionadas.includes(est.codigo);
                      return (
                        <div
                          key={est.codigo}
                          onClick={() => handleToggleEstacion(est.codigo)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 12px',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            backgroundColor: checked ? '#eff6ff' : 'transparent',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!checked) e.currentTarget.style.backgroundColor = '#f1f5f9';
                          }}
                          onMouseLeave={(e) => {
                            if (!checked) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}} // Manejado por el onClick del contenedor
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontFamily: 'monospace', color: '#64748b', fontSize: '0.78rem', width: '38px' }}>
                            {est.codigo}
                          </span>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>
                            {est.descripcion.replace('I.T.V. - ', '')}
                          </span>
                          <TsBadge variant={est.sociedad === 'CAL' ? 'success' : 'primary'} size="small">
                            {est.sociedad}
                          </TsBadge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN CONSULTAR / ACEPTAR */}
        <div className="cd-fullwidth-mobile" style={{ flexShrink: 0 }}>
          <TsButton
            variant="primary"
            onClick={onConsultar}
            disabled={loading}
            loading={loading}
            style={{
              padding: '6px 18px',
              fontWeight: 700,
              fontSize: '0.86rem',
              width: '100%',
            }}
          >
            {loading ? 'Consultando...' : '🔍 Consultar'}
          </TsButton>
        </div>
      </div>
    </div>
  );
};
