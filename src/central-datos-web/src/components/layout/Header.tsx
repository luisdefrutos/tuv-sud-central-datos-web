import { TsBadge } from '@tuvsud/design-system/react';
import { UI_CONSTANTS } from '../../constants/ui.constants';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { TuvSudLogo } from '../common/TuvSudLogo';

export function Header() {
  const { BRAND } = UI_CONSTANTS;

  return (
    <header
      style={{
        backgroundColor: '#0b253b',
        color: '#ffffff',
        padding: '0.65rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #0046ad',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 1. Logotipo Oficial Vectorial y Título de la Aplicación */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <TuvSudLogo size={44} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.12rem', letterSpacing: '-0.2px' }}>
              {BRAND.TITULO_APLICACION}
            </span>
            <TsBadge variant="primary" style={{ fontSize: '0.72rem' }}>
              {BRAND.BADGE_HEADER}
            </TsBadge>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#a0b3c6', marginTop: '1px' }}>
            {BRAND.SUBTITULO_APLICACION}
          </div>
        </div>
      </div>

      {/* 2. Información de Conexión, Usuario y Acceso a Swagger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem' }}>
        {/* Acceso directo a Swagger */}
        <a
          href={API_ENDPOINTS.DOCS.SWAGGER}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#a0b3c6',
            textDecoration: 'none',
            fontSize: '0.8rem',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = '#0046ad';
            e.currentTarget.style.backgroundColor = 'rgba(0, 70, 173, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a0b3c6';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
          }}
          title="Abrir explorador interactivo OpenAPI / Swagger"
        >
          ⚡ Swagger API
        </a>

        {/* Estado Oracle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span style={{ fontSize: '0.82rem' }}>{BRAND.DB_NAME}</span>
        </div>

        {/* Chip de Usuario */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '0.82rem',
          }}
        >
          <span style={{ opacity: 0.75 }}>👤</span>
          <span>{BRAND.DEFAULT_USER}</span>
        </div>
      </div>
    </header>
  );
}
