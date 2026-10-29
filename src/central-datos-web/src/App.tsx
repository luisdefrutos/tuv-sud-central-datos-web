import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { UltimosDatosCentralizados } from './features/estaciones/components/UltimosDatosCentralizados';
import { NAV_ITEMS, SECCION_INICIAL_ID } from './constants/navigation.constants';
import { UI_CONSTANTS } from './constants/ui.constants';

export function App() {
  const [seccionActiva, setSeccionActiva] = useState(SECCION_INICIAL_ID);
  const { BRAND } = UI_CONSTANTS;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        fontFamily: 'var(--ts-font-family-sans, system-ui)',
      }}
    >
      {/* 1. Header Corporativo TÜV SÜD */}
      <Header />

      {/* 2. Barra de Navegación por Módulos */}
      <Navbar
        items={NAV_ITEMS}
        activeId={seccionActiva}
        onSelect={setSeccionActiva}
      />

      {/* 3. Área de Contenido Principal */}
      <main
        style={{
          flex: 1,
          padding: '1.75rem',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {seccionActiva === 'ultimos-datos' && <UltimosDatosCentralizados />}

        {seccionActiva !== 'ultimos-datos' && (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
              marginTop: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
              {NAV_ITEMS.find((n) => n.id === seccionActiva)?.icon}
            </div>
            <h2
              style={{
                color: '#0046ad',
                margin: '0 0 0.5rem 0',
                fontSize: '1.35rem',
                fontWeight: 700,
              }}
            >
              Módulo: {NAV_ITEMS.find((n) => n.id === seccionActiva)?.label}
            </h2>
            <p
              style={{
                color: '#5c768d',
                maxWidth: '540px',
                margin: '0 auto',
                fontSize: '0.92rem',
                lineHeight: 1.5,
              }}
            >
              Este módulo forma parte de las siguientes fases de migración planificadas para Central Datos.
            </p>
          </div>
        )}
      </main>

      {/* 4. Pie de Página */}
      <footer
        style={{
          borderTop: '1px solid var(--ts-semantic-color-border-default, #d0dae5)',
          backgroundColor: '#ffffff',
          padding: '0.75rem 1.75rem',
          fontSize: '0.82rem',
          color: '#5c768d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{BRAND.FOOTER_TEXT}</span>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          {BRAND.FOOTER_TECH}
        </span>
      </footer>
    </div>
  );
}

export default App;
