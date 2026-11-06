import React, { useState, useMemo, useEffect } from 'react';
import { TsButton, TsBadge, TsIcon } from '@tuvsud/design-system/react';
import type { CampoLocalizacion } from '../types/localizacion.types';

interface LocalizacionColumnSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnasDisponibles: CampoLocalizacion[];
  idsSeleccionados: number[];
  onApply: (nuevosIds: number[]) => void;
  tituloModulo: string;
}

/**
 * Modal de selección de columnas para Grid y Exportación a Excel
 * Equivalente moderno de frmCampos_InspeccionesLocalizadas.vb y frmCampos_MedicionesLocalizadas.vb
 */
export const LocalizacionColumnSelectorModal: React.FC<LocalizacionColumnSelectorModalProps> = ({
  isOpen,
  onClose,
  columnasDisponibles,
  idsSeleccionados,
  onApply,
  tituloModulo,
}) => {
  const [draftIds, setDraftIds] = useState<Set<number>>(new Set(idsSeleccionados));
  const [searchText, setSearchText] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');

  useEffect(() => {
    if (isOpen) {
      setDraftIds(new Set(idsSeleccionados));
      setSearchText('');
      setCategoriaFiltro('TODAS');
    }
  }, [isOpen, idsSeleccionados]);

  const categoriasDisponibles = useMemo(() => {
    const setCats = new Set<string>();
    columnasDisponibles.forEach((c) => {
      if (c.categoriaCampo) setCats.add(c.categoriaCampo);
    });
    return Array.from(setCats);
  }, [columnasDisponibles]);

  const columnasFiltradas = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return columnasDisponibles.filter((c) => {
      if (categoriaFiltro !== 'TODAS' && c.categoriaCampo !== categoriaFiltro) {
        return false;
      }
      if (!q) return true;
      return (
        c.desCampo.toLowerCase().includes(q) ||
        c.columnaExcel.toLowerCase().includes(q) ||
        c.categoriaCampo.toLowerCase().includes(q)
      );
    });
  }, [columnasDisponibles, categoriaFiltro, searchText]);

  if (!isOpen) return null;

  const toggleCampo = (idCampo: number) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(idCampo)) {
        next.delete(idCampo);
      } else {
        next.add(idCampo);
      }
      return next;
    });
  };

  const handleSeleccionarVisibles = () => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      columnasFiltradas.forEach((c) => next.add(c.idCampo));
      return next;
    });
  };

  const handleDesmarcarVisibles = () => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      columnasFiltradas.forEach((c) => next.delete(c.idCampo));
      return next;
    });
  };

  const handleRestaurarPorDefecto = () => {
    const defIds = columnasDisponibles.filter((c) => c.porDefecto).map((c) => c.idCampo);
    setDraftIds(new Set(defIds.length > 0 ? defIds : columnasDisponibles.slice(0, 10).map((c) => c.idCampo)));
  };

  const handleGuardar = () => {
    if (draftIds.size === 0) return;
    // Conservar el orden original del catálogo
    const orderedIds = columnasDisponibles
      .filter((c) => draftIds.has(c.idCampo))
      .map((c) => c.idCampo);
    onApply(orderedIds);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 37, 59, 0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '760px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera corporativa en tono azul claro / medio TÜV SÜD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0046ad 0%, #1d63c8 100%)',
            color: '#ffffff',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #bfdbfe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TsIcon name="table_chart" size={22} style={{ color: '#dbeafe' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Selección de Campos Visibles y Columnas Excel
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#e0f2fe' }}>
                {tituloModulo} · Seleccione los campos que desea proyectar en la consulta y en la exportación (.xlsx)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
            }}
          >
            <TsIcon name="close" size={20} />
          </button>
        </div>

        {/* Barra de herramientas del selector */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
            {categoriasDisponibles.length > 1 && (
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  color: '#0b253b',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="TODAS">Categoría: TODAS ({columnasDisponibles.length})</option>
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nombre de campo o columna Excel..."
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.83rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSeleccionarVisibles}
              style={{
                padding: '5px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0046ad',
                cursor: 'pointer',
              }}
            >
              Marcar visibles
            </button>
            <button
              type="button"
              onClick={handleDesmarcarVisibles}
              style={{
                padding: '5px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Desmarcar visibles
            </button>
            <button
              type="button"
              onClick={handleRestaurarPorDefecto}
              style={{
                padding: '5px 10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '5px',
                border: '1px solid #0046ad',
                backgroundColor: '#eff6ff',
                color: '#0046ad',
                cursor: 'pointer',
              }}
            >
              Por defecto
            </button>
          </div>
        </div>

        {/* Lista de campos con scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#f1f5f9',
                borderBottom: '1px solid #cbd5e1',
                zIndex: 1,
              }}
            >
              <tr>
                <th style={{ width: '48px', padding: '8px 12px', textAlign: 'center', color: '#334155' }}>Sel.</th>
                {categoriasDisponibles.length > 1 && (
                  <th style={{ width: '130px', padding: '8px 10px', textAlign: 'left', color: '#334155' }}>Categoría</th>
                )}
                <th style={{ padding: '8px 10px', textAlign: 'left', color: '#334155' }}>Descripción del Campo</th>
                <th style={{ width: '190px', padding: '8px 10px', textAlign: 'left', color: '#334155' }}>Columna Excel</th>
                <th style={{ width: '95px', padding: '8px 10px', textAlign: 'center', color: '#334155' }}>Origen</th>
              </tr>
            </thead>
            <tbody>
              {columnasFiltradas.map((col, idx) => {
                const isSelected = draftIds.has(col.idCampo);
                return (
                  <tr
                    key={col.idCampo}
                    onClick={() => toggleCampo(col.idCampo)}
                    style={{
                      backgroundColor: isSelected ? '#edf5ff' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#0046ad' }}
                      />
                    </td>
                    {categoriasDisponibles.length > 1 && (
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: '#475569', fontSize: '0.77rem' }}>
                        {col.categoriaCampo}
                      </td>
                    )}
                    <td style={{ padding: '7px 10px', fontWeight: isSelected ? 700 : 500, color: '#0b253b' }}>
                      {col.desCampo}
                    </td>
                    <td
                      style={{
                        padding: '7px 10px',
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        color: '#0046ad',
                        fontWeight: 600,
                      }}
                    >
                      {col.columnaExcel}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      {col.porDefecto ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          Por defecto
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Opcional</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pie del modal */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: draftIds.size > 0 ? '#dcfce7' : '#fee2e2',
                border: draftIds.size > 0 ? '1px solid #86efac' : '1px solid #fca5a5',
                color: draftIds.size > 0 ? '#166534' : '#991b1b',
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
              }}
            >
              <strong>{draftIds.size}</strong>
              <span>de</span>
              <strong>{columnasDisponibles.length}</strong>
              <span>columnas seleccionadas</span>
            </div>
            {draftIds.size === 0 && (
              <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                Debe seleccionar al menos 1 campo.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TsButton variant="secondary" size="medium" onClick={onClose}>
              <TsIcon slot="prefix" name="close" />
              Cancelar
            </TsButton>
            <TsButton variant="primary" size="medium" onClick={handleGuardar} disabled={draftIds.size === 0}>
              <TsIcon slot="prefix" name="check" />
              Aceptar ({draftIds.size})
            </TsButton>
          </div>
        </div>
      </div>
    </div>
  );
};
