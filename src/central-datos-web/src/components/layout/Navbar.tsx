import { useState, useEffect, useRef } from 'react';
import type { MenuGroup, MenuItem } from '../../constants/navigation.constants';

interface NavbarProps {
  menus: MenuGroup[];
  activeGroupId: string | null;
  activeItemId: string | null;
  onSelectItem: (itemId: string, groupId: string) => void;
  onGoHome: () => void;
  /** Acciones especiales del menú (p.ej. 'salir') */
  onAction?: (actionId: string) => void;
}

/**
 * Navbar Corporativo TÜV SÜD — Réplica funcional de la barra de menús de escritorio (mdiMain.vb)
 *
 * Comportamiento idéntico a un MainMenu de Windows Forms:
 * - Arriba solo aparecen los literales (Aplicación, Informes, Inspecciones...).
 * - Al pinchar un literal se despliega su lista de opciones; la pantalla se abre al pinchar la opción.
 * - Las opciones con submenú muestran ▶ y abren un desplegable lateral al pasar el ratón / pinchar.
 * - Con un menú abierto, pasar el ratón sobre otro literal cambia el desplegable (hover-switch).
 * - Separadores horizontales donde el original tiene "-".
 * - En móvil (< 768px) se apila en vertical con submenús indentados.
 */
export function Navbar({
  menus,
  activeGroupId,
  activeItemId,
  onSelectItem,
  onGoHome,
  onAction,
}: NavbarProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const navRef = useRef<HTMLElement>(null);

  const closeAll = () => {
    setOpenGroupId(null);
    setOpenSubmenuId(null);
    setMobileMenuOpen(false);
  };

  // Cerrar al hacer clic fuera o al pulsar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) closeAll();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleLeafClick = (item: MenuItem, groupId: string) => {
    closeAll();
    if (item.isAction) {
      onAction?.(item.id);
      return;
    }
    onSelectItem(item.id, groupId);
  };

  const isHomeActive = activeItemId === null;

  const renderLeaf = (item: MenuItem, groupId: string, nested = false) => {
    const isActive = activeItemId === item.id;
    return (
      <button
        key={item.id}
        type="button"
        role="menuitem"
        className={`cd-menu-item ${isActive ? 'cd-menu-item-active' : ''} ${nested ? 'cd-menu-item-nested' : ''}`}
        onClick={() => handleLeafClick(item, groupId)}
      >
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <nav ref={navRef} className="cd-menubar" aria-label="Menú principal">
      {/* 1. Barra compacta móvil (solo <= 768px) */}
      <div className="cd-nav-mobile-bar">
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0b253b' }}>
          {isHomeActive ? 'Inicio' : menus.find((g) => g.id === activeGroupId)?.label ?? 'Menú'}
        </span>
        <button
          type="button"
          className="cd-menubar-burger"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? '✕ Cerrar' : '☰ Menú'}
        </button>
      </div>

      {/* 2. Barra de literales oficial tipo escritorio (Aplicación, Informes, Inspecciones...) */}
      <div
        className={`cd-nav-container-desktop ${mobileMenuOpen ? 'cd-nav-open-mobile' : ''}`}
        role="menubar"
      >
        {menus.map((group) => {
          const isOpen = openGroupId === group.id;
          const isGroupActive = activeGroupId === group.id && activeItemId !== null;

          return (
            <div key={group.id} className="cd-nav-group-wrapper" style={{ position: 'relative' }}>
              {/* Literal superior: SIEMPRE despliega su lista, nunca abre pantalla directamente */}
              <button
                type="button"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={isOpen}
                className={`cd-menubar-title cd-nav-btn-mobile ${isOpen ? 'cd-menubar-title-open' : ''} ${
                  isGroupActive ? 'cd-menubar-title-active' : ''
                }`}
                onClick={() => {
                  setOpenSubmenuId(null);
                  setOpenGroupId((prev) => (prev === group.id ? null : group.id));
                }}
                onMouseEnter={() => {
                  // Hover-switch tipo Windows: si hay un menú abierto, pasar a otro lo abre
                  if (openGroupId !== null && openGroupId !== group.id) {
                    setOpenSubmenuId(null);
                    setOpenGroupId(group.id);
                  }
                }}
              >
                {group.label}
              </button>

              {/* Desplegable con las opciones */}
              {isOpen && (
                <div className="cd-menu-dropdown cd-nav-dropdown-mobile" role="menu">
                  {group.items.map((item) => (
                    <div key={item.id}>
                      {item.separatorBefore && <div className="cd-menu-separator" role="separator" />}

                      {item.children && item.children.length > 0 ? (
                        <div
                          className="cd-menu-submenu-wrapper"
                          onMouseEnter={() => setOpenSubmenuId(item.id)}
                          onMouseLeave={() => setOpenSubmenuId((prev) => (prev === item.id ? null : prev))}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            aria-haspopup="true"
                            aria-expanded={openSubmenuId === item.id}
                            className={`cd-menu-item ${
                              openSubmenuId === item.id || item.children.some((c) => c.id === activeItemId)
                                ? 'cd-menu-item-active'
                                : ''
                            }`}
                            onClick={() =>
                              setOpenSubmenuId((prev) => (prev === item.id ? null : item.id))
                            }
                          >
                            <span>{item.label}</span>
                            <span className="cd-menu-arrow" aria-hidden="true">
                              ▶
                            </span>
                          </button>

                          {openSubmenuId === item.id && (
                            <div className="cd-menu-dropdown cd-menu-flyout" role="menu">
                              {item.children.map((child) => renderLeaf(child, group.id, true))}
                            </div>
                          )}
                        </div>
                      ) : (
                        renderLeaf(item, group.id)
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
