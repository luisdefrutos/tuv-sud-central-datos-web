import { TsBadge } from '@tuvsud/design-system/react';
import { UI_CONSTANTS } from '../../constants/ui.constants';
import { TuvSudLogo } from '../common/TuvSudLogo';
import { useAuth } from '../../features/auth/context/AuthContext';

export function Header() {
  const { BRAND } = UI_CONSTANTS;
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        backgroundColor: '#0b253b',
        color: '#ffffff',
        padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1.75rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: '2px solid #0046ad',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 1. Logotipo Oficial Vectorial y Título de la Aplicación */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 2vw, 1.25rem)' }}>
        <TuvSudLogo size={42} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
                letterSpacing: '-0.2px',
              }}
            >
              {BRAND.TITULO_APLICACION}
            </span>
            {import.meta.env.DEV && (
              <TsBadge variant="warning" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                DESARROLLO
              </TsBadge>
            )}
          </div>
          <div
            className="cd-hide-mobile"
            style={{ fontSize: '0.76rem', color: '#a0b3c6', marginTop: '1px' }}
          >
            {BRAND.SUBTITULO_APLICACION}
          </div>
        </div>
      </div>

      {/* 2. Información de Conexión, Usuario y Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Chip de Usuario Conectado */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.65rem',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '0.8rem',
              maxWidth: '100%',
            }}
          >
            <span style={{ opacity: 0.75 }}>👤</span>
            <span
              style={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '180px',
              }}
            >
              {user.fullName || user.username}
            </span>
            {user.username !== 'SUPERVISOR' && (
              <TsBadge
                variant={user.isSupervisor ? 'warning' : 'primary'}
                style={{ fontSize: '0.65rem', padding: '2px 6px' }}
              >
                {user.role}
              </TsBadge>
            )}
          </div>
        )}

        {/* Botón Cerrar Sesión */}
        <button
          type="button"
          onClick={() => logout()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#fca5a5',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.35rem 0.65rem',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#fca5a5';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
          }}
          title="Cerrar la sesión actual de forma segura"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
