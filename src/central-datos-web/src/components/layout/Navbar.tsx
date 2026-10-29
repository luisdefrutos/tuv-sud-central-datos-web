export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

interface NavbarProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function Navbar({ items, activeId, onSelect }: NavbarProps) {
  return (
    <nav
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
        padding: '0 1.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        overflowX: 'auto',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              borderBottom: isActive ? '3px solid #0046ad' : '3px solid transparent',
              color: isActive ? '#0046ad' : '#4a607a',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
              outline: 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#0046ad';
                e.currentTarget.style.backgroundColor = '#f4f6f9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#4a607a';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(0, 70, 173, 0.1)' : '#f1f5f9',
                  color: isActive ? '#0046ad' : '#64748b',
                  fontWeight: 600,
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
