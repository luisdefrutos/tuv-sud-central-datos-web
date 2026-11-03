import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { UltimosDatosCentralizados } from './features/estaciones/components/UltimosDatosCentralizados';
import { FacturacionReportPage } from './features/informes/pages/FacturacionReportPage';
import { NumeroInspeccionesReportPage } from './features/informes/pages/NumeroInspeccionesReportPage';
import { DuracionPromedioReportPage } from './features/informes/pages/DuracionPromedioReportPage';
import { DefectoObdReportPage } from './features/informes/pages/DefectoObdReportPage';
import { SinInspectorReportPage } from './features/informes/pages/SinInspectorReportPage';
import { CuponDescuentoReportPage } from './features/informes/pages/CuponDescuentoReportPage';
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
  // Helper para recuperar la pantalla activa desde URL (#/modulo/...) o sessionStorage tras recarga (F5)
  const getInitialNavigation = () => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash && hash.startsWith('#/modulo/')) {
      const itemId = hash.replace('#/modulo/', '').trim();
      if (itemId) {
        const { group } = findMenuItem(itemId);
        const autoGroup = group?.id || (['facturacion', 'facturacion-excel', 'num-inspecciones', 'numero-inspecciones', 'duracion-promedio', 'defecto-obd', 'control-sin-inspector', 'sin-inspector', 'cupon-descuento', 'informes'].includes(itemId) ? 'informes' : 'aplicacion');
        return { itemId, groupId: autoGroup };
      }
    }
    const savedItem = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cd_active_item') : null;
    const savedGroup = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cd_active_group') : null;
    if (savedItem) {
      return { itemId: savedItem, groupId: savedGroup || 'informes' };
    }
    return { itemId: null, groupId: null };
  };

  const initialNav = getInitialNavigation();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(initialNav.groupId);
  const [activeItemId, setActiveItemId] = useState<string | null>(initialNav.itemId);

  // Sincronizar activeItemId bidireccionalmente con hash de URL y sessionStorage
  useEffect(() => {
    if (activeItemId) {
      window.location.hash = `#/modulo/${activeItemId}`;
      sessionStorage.setItem('cd_active_item', activeItemId);
      if (activeGroupId) sessionStorage.setItem('cd_active_group', activeGroupId);
    } else {
      if (window.location.hash.startsWith('#/modulo/')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      sessionStorage.removeItem('cd_active_item');
      sessionStorage.removeItem('cd_active_group');
    }
  }, [activeItemId, activeGroupId]);

  // Escuchar cambios en la URL (F5, botones Atrás/Adelante del navegador)
  useEffect(() => {
    const onHashChange = () => {
      const nav = getInitialNavigation();
      setActiveItemId(nav.itemId);
      setActiveGroupId(nav.groupId);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
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

                {/* Tarjeta Informes: Duración Promedio */}
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
                      <span style={{ fontSize: '1.75rem' }}>⏱️</span>
                      <TsBadge variant="success">Disponible</TsBadge>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0046ad', fontWeight: 700 }}>
                      Duración Promedio (001)
                    </h3>
                    <p style={{ margin: '0 0 1.25rem 0', color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Tiempos medios de proceso por estación y tipo de vehículo, ranking de agilidad y réplica Crystal Reports.
                    </p>
                  </div>
                  <TsButton
                    variant="primary"
                    onClick={() => handleSelectItem('duracion-promedio', 'informes')}
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
          <ErrorBoundary fallbackTitle="Error en Últimos Datos Centralizados">
            <UltimosDatosCentralizados onNavigateHome={handleGoHome} />
          </ErrorBoundary>
        )}

        {/* CASO C: Módulo de Facturación de Inspecciones (Dashboard + Ranking + Grid + Excel) */}
        {(activeItemId === 'facturacion' || activeItemId === 'facturacion-excel') && (
          <ErrorBoundary fallbackTitle="Error en Informe de Facturación">
            <FacturacionReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.2: Módulo de Número de Inspecciones (Favorables / Rechazadas por Fase) */}
        {(activeItemId === 'num-inspecciones' || activeItemId === 'numero-inspecciones') && (
          <ErrorBoundary fallbackTitle="Error en Informe Número de Inspecciones">
            <NumeroInspeccionesReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.3: Módulo de Duración Promedio de Inspecciones (001) */}
        {activeItemId === 'duracion-promedio' && (
          <ErrorBoundary fallbackTitle="Error en Informe Duración Promedio">
            <DuracionPromedioReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.4: Módulo de Inspecciones con Defecto OBD (Bloque 15) */}
        {activeItemId === 'defecto-obd' && (
          <ErrorBoundary fallbackTitle="Error en Informe Defecto OBD">
            <DefectoObdReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.6: Módulo de Inspecciones con Cupón Descuento */}
        {activeItemId === 'cupon-descuento' && (
          <ErrorBoundary fallbackTitle="Error en Informe Cupón Descuento">
            <CuponDescuentoReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.5: Módulo de Inspecciones sin Inspector (Informes de Control) */}
        {(activeItemId === 'control-sin-inspector' || activeItemId === 'sin-inspector') && (
          <ErrorBoundary fallbackTitle="Error en Informe Inspecciones Sin Inspector">
            <SinInspectorReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
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
          activeItemId !== 'numero-inspecciones' &&
          activeItemId !== 'duracion-promedio' &&
          activeItemId !== 'defecto-obd' &&
          activeItemId !== 'control-sin-inspector' &&
          activeItemId !== 'sin-inspector' &&
          activeItemId !== 'cupon-descuento' && (
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

            <TsCard
              style={{
                padding: '3.5rem 2rem',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                borderTop: '4px solid #f59e0b',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                maxWidth: '720px',
                margin: '1.5rem auto',
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#fffbeb',
                  border: '2px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                ⏳
              </div>

              <div style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
                <TsBadge variant="warning">Pendiente de Implementar</TsBadge>
              </div>

              <h2
                style={{
                  color: '#0b253b',
                  margin: '0 0 0.75rem 0',
                  fontSize: '1.45rem',
                  fontWeight: 700,
                }}
              >
                {currentItem?.label || 'Módulo en desarrollo'}
              </h2>

              <p
                style={{
                  color: '#64748b',
                  maxWidth: '540px',
                  margin: '0 auto 1.75rem auto',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                }}
              >
                Este módulo forma parte de la aplicación de escritorio (<code>mdiMain.vb</code>) y actualmente se encuentra en la hoja de ruta de modernización a la plataforma Web.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <TsButton variant="secondary" onClick={handleGoHome}>
                  🏠 Volver al Inicio
                </TsButton>
                {currentGroup?.id === 'informes' && (
                  <TsButton
                    variant="secondary"
                    onClick={() => {
                      setActiveGroupId('informes');
                      setActiveItemId('informes');
                    }}
                  >
                    📊 Catálogo de Informes
                  </TsButton>
                )}
                <TsButton
                  variant="primary"
                  onClick={() => handleSelectItem('ultima-fecha', 'aplicacion')}
                >
                  📡 Ir a Últimos datos centralizados
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
    <ErrorBoundary fallbackTitle="Incidencia General del Sistema - Central Datos ITV">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
