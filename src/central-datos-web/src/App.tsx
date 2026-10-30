import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { UltimosDatosCentralizados } from './features/estaciones/components/UltimosDatosCentralizados';
import { FacturacionReportPage } from './features/informes/pages/FacturacionReportPage';
import { NumeroInspeccionesReportPage } from './features/informes/pages/NumeroInspeccionesReportPage';
import { InformesHubPage } from './features/informes/pages/InformesHubPage';
import { DESKTOP_MENUS, findMenuItem } from './constants/navigation.constants';
import { UI_CONSTANTS } from './constants/ui.constants';
import {
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsButton,
  TsCard,
  TsBadge,
  TsSpinner,
} from '@tuvsud/design-system/react';

function AppContent() {
  const { isAuthenticated, isLoading, logNavigation, isOnline, downloadDiagnosticsLog, logout } = useAuth();
  // Estado inicial: null (solo se muestran los menús superiores sin cargar pantallas ni realizar consultas)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const { BRAND } = UI_CONSTANTS;

  // Registrar auditoría de navegación al cambiar de módulo o volver al inicio
  useEffect(() => {
    if (isAuthenticated) {
      logNavigation(activeItemId ? `/modulo/${activeItemId}` : '/inicio');
    }
  }, [activeItemId, isAuthenticated, logNavigation]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          gap: '16px',
        }}
      >
        <TsSpinner size="large" />
        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
          Verificando sesión de Central Datos...
        </span>
      </div>
    );
  }

  // Si no está autenticado, mostrar la pantalla de Login oficial (sin leyendas innecesarias)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSelectItem = (itemId: string, groupId: string) => {
    setActiveGroupId(groupId);
    setActiveItemId(itemId);
  };

  const handleGoHome = () => {
    setActiveGroupId(null);
    setActiveItemId(null);
  };

  const currentGroup = DESKTOP_MENUS.find((g) => g.id === activeGroupId);
  // Busca también dentro de los submenús (▶) para la miga de pan
  const { parent: currentParent, item: currentItem } = findMenuItem(activeItemId);

  const handleMenuAction = (actionId: string) => {
    if (actionId === 'salir') {
      void logout();
    }
  };

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

      {/* 2. Barra Superior de Menús de la Aplicación de Escritorio */}
      <Navbar
        menus={DESKTOP_MENUS}
        activeGroupId={activeGroupId}
        activeItemId={activeItemId}
        onSelectItem={handleSelectItem}
        onGoHome={handleGoHome}
        onAction={handleMenuAction}
      />

      {/* 2.1. Aviso de Modo Offline y Cola Local de Auditoría */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            borderBottom: '1px solid #f59e0b',
            padding: '8px clamp(1rem, 2vw, 2rem)',
            fontSize: '0.84rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <strong>Sin conexión con el servidor (Modo local activo).</strong>
            <span>La actividad de navegación se almacenará en su navegador y se sincronizará con Central Datos al recuperar la red.</span>
          </div>
          <button
            type="button"
            onClick={downloadDiagnosticsLog}
            style={{
              background: 'none',
              border: 'none',
              color: '#b45309',
              textDecoration: 'underline',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.82rem',
              padding: 0,
            }}
          >
            📥 Descargar diagnóstico técnico (.log)
          </button>
        </div>
      )}

      {/* 3. Área de Contenido Principal Responsiva */}
      <main
        style={{
          flex: 1,
          padding: 'clamp(0.75rem, 2.5vw, 1.75rem)',
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* CASO A: Pantalla Inicial Limpia (Al entrar solo se muestran los menús de arriba; no se carga nada hasta pinchar) */}
        {activeItemId === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
            <TsCard style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    backgroundColor: '#f0f6ff',
                    border: '2px solid #0046ad',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    flexShrink: 0,
                  }}
                >
                  🖥️
                </div>
                <div>
                  <h1
                    style={{
                      margin: '0 0 0.35rem 0',
                      fontSize: 'clamp(1.4rem, 2.5vw, 1.85rem)',
                      color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)',
                      fontWeight: 800,
                    }}
                  >
                    TÜV SÜD Central Datos Web
                  </h1>
                  <p style={{ margin: 0, color: '#5c768d', fontSize: '0.95rem' }}>
                    Gestión y Control Operativo Centralizado de Estaciones ITV. Seleccione una opción del menú superior para abrir un módulo de trabajo.
                  </p>
                </div>
              </div>
            </TsCard>

            {/* Accesos Rápidos Principales */}
            <div>
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0b253b',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Módulos de la Aplicación
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                  gap: '1rem',
                }}
              >
                {/* Tarjeta de Acceso Directo: Última fecha inspección */}
                <TsCard
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#ffffff',
                    borderLeft: '4px solid #0046ad',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>📊</span>
                      <TsBadge variant="primary">Activo (30 ITV)</TsBadge>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0046ad', fontWeight: 700 }}>
                      Última fecha inspección
                    </h3>
                    <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Consulta del estado de sincronización y fecha de última inspección recibida en Central Datos para las 30 estaciones de la red.
                    </p>
                  </div>
                  <TsButton
                    variant="primary"
                    onClick={() => handleSelectItem('ultima-fecha', 'aplicacion')}
                    style={{ width: '100%' }}
                  >
                    Abrir Módulo
                  </TsButton>
                </TsCard>

                {/* Tarjeta Informes: Facturación de Inspecciones */}
                <TsCard
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#ffffff',
                    borderLeft: '4px solid #00875a',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>💶</span>
                      <TsBadge variant="success">Disponible</TsBadge>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0046ad', fontWeight: 700 }}>
                      Facturación de Inspecciones
                    </h3>
                    <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Dashboard con KPIs consolidados, ranking gráfico por estación y tabla analítica con exportación directa a Excel.
                    </p>
                  </div>
                  <TsButton
                    variant="primary"
                    onClick={() => handleSelectItem('facturacion', 'informes')}
                    style={{ width: '100%' }}
                  >
                    Abrir Módulo
                  </TsButton>
                </TsCard>

                {/* Tarjeta Informes: Número de Inspecciones */}
                <TsCard
                  style={{
                    padding: '1.5rem',
                    backgroundColor: '#ffffff',
                    borderLeft: '4px solid #00875a',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>📈</span>
                      <TsBadge variant="success">Disponible</TsBadge>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0046ad', fontWeight: 700 }}>
                      Número de Inspecciones
                    </h3>
                    <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Volumen de inspecciones periódicas: favorables, rechazadas y porcentajes de rechazo en Fase 1 y Fase 2.
                    </p>
                  </div>
                  <TsButton
                    variant="primary"
                    onClick={() => handleSelectItem('num-inspecciones', 'informes')}
                    style={{ width: '100%' }}
                  >
                    Abrir Módulo
                  </TsButton>
                </TsCard>

                {/* Tarjeta Fase 2: Inspecciones */}
                <TsCard style={{ padding: '1.5rem', backgroundColor: '#ffffff', opacity: 0.9 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>🚗</span>
                      <TsBadge variant="neutral">Próximamente</TsBadge>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0b253b', fontWeight: 700 }}>
                      Localización de Inspecciones
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Búsqueda y trazabilidad por matrícula, bastidor, defectos y mediciones de vehículos.
                    </p>
                  </div>
                </TsCard>

                {/* Tarjeta Fase 2: Comercial */}
                <TsCard style={{ padding: '1.5rem', backgroundColor: '#ffffff', opacity: 0.9 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>📱</span>
                      <TsBadge variant="neutral">Próximamente</TsBadge>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0b253b', fontWeight: 700 }}>
                      Citas Previas & Campañas SMS
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Gestión de citas previas, recordatorios automáticos de vencimiento y campañas a clientes.
                    </p>
                  </div>
                </TsCard>
              </div>
            </div>
          </div>
        )}

        {/* CASO B: Módulo de Última Fecha de Inspección (Se carga únicamente al pinchar) */}
        {activeItemId === 'ultima-fecha' && (
          <UltimosDatosCentralizados onNavigateHome={handleGoHome} />
        )}

        {/* CASO C: Módulo de Facturación de Inspecciones (Dashboard + Ranking + Grid + Excel) */}
        {(activeItemId === 'facturacion' || activeItemId === 'facturacion-excel') && (
          <FacturacionReportPage
            onNavigateHome={handleGoHome}
            onNavigateToInformes={() => {
              setActiveGroupId('informes');
              setActiveItemId('informes');
            }}
          />
        )}

        {/* CASO C.2: Módulo de Número de Inspecciones (Favorables / Rechazadas por Fase) */}
        {(activeItemId === 'num-inspecciones' || activeItemId === 'numero-inspecciones') && (
          <NumeroInspeccionesReportPage
            onNavigateHome={handleGoHome}
            onNavigateToInformes={() => {
              setActiveGroupId('informes');
              setActiveItemId('informes');
            }}
          />
        )}

        {/* CASO D: Catálogo / Hub de Informes */}
        {activeGroupId === 'informes' && (activeItemId === null || activeItemId === 'informes') && (
          <InformesHubPage
            onSelectReport={(reportId) => handleSelectItem(reportId, 'informes')}
            onNavigateHome={handleGoHome}
          />
        )}

        {/* CASO E: Resto de Módulos de la Aplicación de Escritorio con su correspondiente miga de pan */}
        {activeItemId !== null &&
          activeItemId !== 'informes' &&
          activeItemId !== 'ultima-fecha' &&
          activeItemId !== 'facturacion' &&
          activeItemId !== 'facturacion-excel' &&
          activeItemId !== 'num-inspecciones' &&
          activeItemId !== 'numero-inspecciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Miga de Pan Correspondiente Interactiva */}
            <TsBreadcrumb>
              <TsBreadcrumbItem
                onClick={handleGoHome}
                title="Regresar a la pantalla de Inicio"
                style={{ cursor: 'pointer', color: '#0046ad', fontWeight: 600 }}
              >
                Inicio
              </TsBreadcrumbItem>
              {currentGroup && (
                <TsBreadcrumbItem
                  onClick={() => {
                    if (currentGroup.id === 'informes') {
                      handleSelectItem('informes', 'informes');
                    }
                  }}
                  style={{
                    cursor: currentGroup.id === 'informes' ? 'pointer' : 'default',
                    color: currentGroup.id === 'informes' ? '#0046ad' : undefined,
                  }}
                >
                  {currentGroup.label}
                </TsBreadcrumbItem>
              )}
              {currentParent && <TsBreadcrumbItem>{currentParent.label}</TsBreadcrumbItem>}
              {currentItem && (
                <TsBreadcrumbItem style={{ fontWeight: 700, color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)' }}>
                  {currentItem.label}
                </TsBreadcrumbItem>
              )}
            </TsBreadcrumb>

            <TsCard style={{ padding: '3.5rem 2rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                📑
              </div>
              <h2
                style={{
                  color: '#0046ad',
                  margin: '0 0 0.75rem 0',
                  fontSize: '1.45rem',
                  fontWeight: 700,
                }}
              >
                Módulo: {currentItem?.label}
              </h2>
              <p
                style={{
                  color: '#5c768d',
                  maxWidth: '560px',
                  margin: '0 auto 1.5rem auto',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                }}
              >
                Esta funcionalidad forma parte de la aplicación de escritorio (<code>mdiMain.vb</code>) y está integrada en la hoja de ruta de modernización de Central Datos.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <TsButton variant="secondary" onClick={handleGoHome}>
                  🏠 Volver al Inicio
                </TsButton>
                <TsButton
                  variant="primary"
                  onClick={() => handleSelectItem('ultima-fecha', 'aplicacion')}
                >
                  📊 Ir a Últimos datos centralizados
                </TsButton>
              </div>
            </TsCard>
          </div>
        )}
      </main>

      {/* 4. Pie de Página Limpio */}
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
          flexWrap: 'wrap',
          gap: '0.5rem',
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

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
