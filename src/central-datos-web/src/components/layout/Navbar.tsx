import { useState, useEffect, useRef } from 'react';
import type { MenuGroup } from '../../constants/navigation.constants';

interface NavbarProps {
  menus: MenuGroup[];
  activeGroupId: string | null;
  activeItemId: string | null;
  onSelectItem: (itemId: string, groupId: string) => void;
  onGoHome: () => void;
}

/**
 * Navbar Corporativo Desktop TÜV SÜD
 * 
 * Barra superior de menús con soporte para:
 * - Selección directa en menús de opción única (sin flechas ni desplegables vacíos).
 * - Desplegables multinivel para menús con múltiples opciones.
 * - Modo responsivo vertical en tabletas y móviles (< 768px).
 * - Navegación fluida tipo Desktop (hover-switch entre menús cuando hay uno abierto).
 * - Indicadores visuales claros de hover y selección activa corporativa.
 */
export function Navbar({
  menus,
  activeGroupId,
  activeItemId,
  onSelectItem,
  onGoHome,
}: NavbarProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const navRef = useRef<HTMLElement>(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleGroup = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleItemClick = (itemId: string, groupId: string) => {
    setOpenGroupId(null);
    setMobileMenuOpen(false);
    onSelectItem(itemId, groupId);
  };

  const isHomeActive = activeItemId === null;
  const currentGroup = menus.find((g) => g.id === activeGroupId);

  return (
    <nav
      ref={navRef}
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
        padding: '0 clamp(0.75rem, 2vw, 1.75rem)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* 1. Barra Compacta Móvil (Visible únicamente en pantallas <= 768px) */}
      <div className="cd-nav-mobile-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600, color: '#0b253b' }}>
          <span>{isHomeActive ? '🏠 Inicio' : (currentGroup?.icon ? `${currentGroup.icon} ${currentGroup.label}` : '📂 Menú')}</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          style={{
            border: '1px solid #d0dae5',
            backgroundColor: mobileMenuOpen ? '#e8f1fd' : '#ffffff',
            color: '#0046ad',
            padding: '0.4rem 0.75rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{mobileMenuOpen ? '✕' : '☰'}</span>
          <span>{mobileMenuOpen ? 'Cerrar' : 'Menú'}</span>
        </button>
      </div>

      {/* 2. Contenedor de Menús (Horizontal en Desktop, Vertical en Móvil al abrir) */}
      <div
        className={`cd-nav-container-desktop ${mobileMenuOpen ? 'cd-nav-open-mobile' : ''} cd-touch-scroll`}
        style={{
          whiteSpace: 'nowrap',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        {/* Botón de Inicio */}
        <div className="cd-nav-group-wrapper">
          <button
            type="button"
            className="cd-nav-btn-mobile"
            onClick={() => {
              setOpenGroupId(null);
              setMobileMenuOpen(false);
              onGoHome();
            }}
            title="Pantalla principal de inicio"
            style={{
              border: 'none',
              background: isHomeActive ? 'rgba(0, 70, 173, 0.08)' : 'transparent',
              padding: '0.75rem 0.95rem',
              cursor: 'pointer',
              borderBottom: isHomeActive ? '3px solid #0046ad' : '3px solid transparent',
              color: isHomeActive ? '#0046ad' : '#4a607a',
              fontWeight: isHomeActive ? 700 : 600,
              fontSize: '0.88rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
              outline: 'none',
              borderRadius: '4px 4px 0 0',
            }}
            onMouseEnter={(e) => {
              if (!isHomeActive) {
                e.currentTarget.style.color = '#0046ad';
                e.currentTarget.style.backgroundColor = '#e8f1fd';
              }
            }}
            onMouseLeave={(e) => {
              if (!isHomeActive) {
                e.currentTarget.style.color = '#4a607a';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>🏠</span>
              <span>Inicio</span>
            </div>
          </button>
        </div>

        <div className="cd-hide-mobile" style={{ width: '1px', height: '22px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />

        {/* Menús de la aplicación */}
        {menus.map((group) => {
          const hasMultipleItems = group.items.length > 1;
          const isOpen = openGroupId === group.id;
          const isGroupActive = activeGroupId === group.id;

          return (
            <div key={group.id} className="cd-nav-group-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className="cd-nav-btn-mobile"
                onClick={() => {
                  if (hasMultipleItems) {
                    toggleGroup(group.id);
                  } else if (group.items.length === 1) {
                    handleItemClick(group.items[0].id, group.id);
                  }
                }}
                aria-expanded={isOpen}
                title={
                  hasMultipleItems
                    ? `Desplegar menú ${group.label}`
                    : `Abrir ${group.items[0]?.label ?? group.label}`
                }
                style={{
                  border: 'none',
                  background: isGroupActive
                    ? 'rgba(0, 70, 173, 0.08)'
                    : isOpen
                    ? '#e8f1fd'
                    : 'transparent',
                  padding: '0.75rem 0.95rem',
                  cursor: 'pointer',
                  borderBottom: isGroupActive ? '3px solid #0046ad' : '3px solid transparent',
                  color: isGroupActive || isOpen ? '#0046ad' : '#2d3748',
                  fontWeight: isGroupActive ? 700 : 600,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  borderRadius: '4px 4px 0 0',
                }}
                onMouseEnter={(e) => {
                  if (openGroupId !== null && openGroupId !== group.id) {
                    if (hasMultipleItems) {
                      setOpenGroupId(group.id);
                    } else {
                      setOpenGroupId(null);
                    }
                  }

                  if (!isGroupActive && !isOpen) {
                    e.currentTarget.style.backgroundColor = '#e8f1fd';
                    e.currentTarget.style.color = '#0046ad';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGroupActive && !isOpen) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#2d3748';
                  }
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  {group.icon && <span style={{ fontSize: '1rem' }}>{group.icon}</span>}
                  <span>{group.label}</span>
                </div>

                {hasMultipleItems && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: isOpen ? '#0046ad' : '#94a3b8',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                      marginLeft: '2px',
                    }}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                )}
              </button>

              {/* Menú Desplegable Flotante (en desktop) / Accordion indentado (en móvil) */}
              {hasMultipleItems && isOpen && (
                <div
                  className="cd-nav-dropdown-mobile"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    minWidth: '275px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
                    borderRadius: '0 0 6px 6px',
                    boxShadow: '0 12px 28px rgba(11, 37, 59, 0.15), 0 4px 10px rgba(11, 37, 59, 0.08)',
                    zIndex: 1000,
                    padding: '6px 0',
                    marginTop: '1px',
                  }}
                >
                  {group.items.map((item) => {
                    const isItemActive = activeItemId === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id, group.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: isItemActive ? '#edf5ff' : 'transparent',
                          color: isItemActive ? '#0046ad' : '#1e293b',
                          fontWeight: isItemActive ? 700 : 500,
                          fontSize: '0.86rem',
                          padding: '9px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          transition: 'background-color 0.15s ease, color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f6ff';
                          e.currentTarget.style.color = '#0046ad';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isItemActive ? '#edf5ff' : 'transparent';
                          e.currentTarget.style.color = isItemActive ? '#0046ad' : '#1e293b';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.icon && <span style={{ fontSize: '1rem' }}>{item.icon}</span>}
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              backgroundColor: '#e0edff',
                              color: '#0046ad',
                              fontWeight: 700,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
