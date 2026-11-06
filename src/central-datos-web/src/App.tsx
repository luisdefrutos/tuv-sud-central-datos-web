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
import { FacturacionComparativaReportPage } from './features/informes/pages/FacturacionComparativaReportPage';
import { MinerReportPage } from './features/informes/pages/MinerReportPage';
import { BastidoresObdReportPage } from './features/informes/pages/BastidoresObdReportPage';
import { InspRangoHorarioReportPage } from './features/informes/pages/InspRangoHorarioReportPage';
import { VolumenDefectosReportPage } from './features/informes/pages/VolumenDefectosReportPage';
import { ClientesVolumenReportPage } from './features/informes/pages/ClientesVolumenReportPage';
import { EnviosTotalesReportPage } from './features/informes/pages/EnviosTotalesReportPage';
import { EnviosEnviadosReportPage } from './features/informes/pages/EnviosEnviadosReportPage';
import { InformesHubPage } from './features/informes/pages/InformesHubPage';
import { InspeccionesHubPage } from './features/inspecciones/pages/InspeccionesHubPage';
import { LocalizacionReportPage } from './features/inspecciones/pages/LocalizacionReportPage';
import { DESKTOP_MENUS, findMenuItem } from './constants/navigation.constants';
import { UI_CONSTANTS } from './constants/ui.constants';
import {
  TsBreadcrumb,
  TsBreadcrumbItem,
  TsButton,
  TsCard,
  TsBadge,
  TsSpinner,
  TsIcon,
} from '@tuvsud/design-system/react';

function AppContent() {
  const { isAuthenticated, isLoading, logNavigation, isOnline, downloadDiagnosticsLog, logout } = useAuth();
  // Helper para recuperar la pantalla activa desde URL (#/modulo/...) o sessionStorage tras recarga (F5)
  const getInitialNavigation = () => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash && hash.startsWith('#/modulo/')) {
      let itemId = hash.replace('#/modulo/', '').trim();
      if (itemId === 'bastidores-obd-no-coincidentes') itemId = 'control-obd-no-coincidentes';
      if (itemId === 'volumen-defectos') itemId = 'defectologia-volumen';
      if (itemId) {
        const { group } = findMenuItem(itemId);
        const autoGroup = group?.id || (itemId === 'inspecciones' ? 'inspecciones' : ['facturacion', 'facturacion-excel', 'num-inspecciones', 'numero-inspecciones', 'duracion-promedio', 'defecto-obd', 'control-sin-inspector', 'sin-inspector', 'cupon-descuento', 'miner-datos-globales', 'control-obd-no-coincidentes', 'bastidores-obd-no-coincidentes', 'inspecciones-rango-horario', 'rango-horario', 'defectologia-volumen', 'volumen-defectos', 'clientes-volumen', 'recordatorios-enviados', 'recordatorios-totales', 'envios-recordatorios', 'informes'].includes(itemId) ? 'informes' : 'aplicacion');
        return { itemId, groupId: autoGroup };
      }
    }
    let savedItem = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cd_active_item') : null;
    const savedGroup = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('cd_active_group') : null;
    if (savedItem) {
      if (savedItem === 'bastidores-obd-no-coincidentes') savedItem = 'control-obd-no-coincidentes';
      if (savedItem === 'volumen-defectos') savedItem = 'defectologia-volumen';
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
  // Si el usuario cierra sesión (!isAuthenticated), resetear módulo activo a Inicio (null)
  useEffect(() => {
    if (isAuthenticated) {
      logNavigation(activeItemId ? `/modulo/${activeItemId}` : '/inicio');
    } else {
      setActiveGroupId(null);
      setActiveItemId(null);
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
            <TsIcon name="warning" style={{ fontSize: '18px', color: '#d97706' }} />
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TsIcon name="download" style={{ fontSize: '15px' }} /><span>Descargar diagnóstico técnico (.log)</span></span>
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
        {/* CASO A: Pantalla Inicial Minimalista (Navegación exclusivamente desde el menú superior) */}
        {activeItemId === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* 1. Miga de pan de navegación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <TsBreadcrumb>
                <TsBreadcrumbItem active style={{ fontWeight: 700, color: 'var(--ts-semantic-color-surface-inverted-default, #0b253b)' }}>
                  Inicio
                </TsBreadcrumbItem>
              </TsBreadcrumb>
            </div>

            {/* 2. Cabecera Principal Minimalista */}
            <div
              style={{
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TsIcon name="desktop_windows" size={28} style={{ color: '#0046ad' }} />
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 'clamp(1.25rem, 2.5vw, 1.6rem)',
                      fontWeight: 800,
                      color: '#0b253b',
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Módulos de la Central Datos Web
                  </h1>
                </div>
                <p
                  style={{
                    margin: '0.35rem 0 0 0',
                    color: '#64748b',
                    fontSize: '0.88rem',
                    lineHeight: 1.4,
                  }}
                >
                  Gestión y control operativo centralizado de estaciones ITV. Utilice el menú superior para acceder a cada módulo de trabajo.
                </p>
              </div>
            </div>

            {/* 3. Listado Minimalista en Formato Texto de los Módulos del Sistema (Sin enlaces directos) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
                gap: '1rem',
              }}
            >
              {[
                {
                  titulo: 'Aplicación',
                  icono: 'sensors',
                  descripcion: 'Monitorización en tiempo real del estado de sincronización y fecha de última inspección centralizada de las estaciones ITV.',
                },
                {
                  titulo: 'Informes',
                  icono: 'bar_chart',
                  descripcion: 'Cuadros de mando analíticos, facturación, volumen de inspecciones, tiempos medios, estadística oficial MINER, OBD y envíos de recordatorios.',
                },
                {
                  titulo: 'Inspecciones',
                  icono: 'directions_car',
                  descripcion: 'Consulta y localización técnica detallada de inspecciones, defectos detectados, elementos verificados y mediciones de vehículos.',
                },
                {
                  titulo: 'Comercial',
                  icono: 'chat',
                  descripcion: 'Gestión de citas previas, carteras de clientes terceros, proyectos comerciales y campañas de avisos de vencimiento por SMS y carta.',
                },
                {
                  titulo: 'Datos',
                  icono: 'table_chart',
                  descripcion: 'Administración y consulta de tablas maestras y definición del alcance técnico de elementos de inspección.',
                },
                {
                  titulo: 'Mantenimientos',
                  icono: 'build',
                  descripcion: 'Gestión de recursos laborales, directorio de empleados, inventario de equipos de medición y control de versiones de soporte IT.',
                },
                {
                  titulo: 'Acerca de',
                  icono: 'info',
                  descripcion: 'Información técnica de la plataforma, versión del sistema y diagnóstico de conectividad de TÜV SÜD Central Datos ITV.',
                },
              ].map((modulo) => (
                <TsCard
                  key={modulo.titulo}
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#ffffff',
                    borderLeft: '3px solid #0046ad',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.45rem' }}>
                    <TsIcon name={modulo.icono} size={20} style={{ color: '#0046ad' }} />
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '0.98rem',
                        fontWeight: 700,
                        color: '#0b253b',
                        lineHeight: 1.3,
                      }}
                    >
                      {modulo.titulo}
                    </h2>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {modulo.descripcion}
                  </p>
                </TsCard>
              ))}
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
        {activeItemId === 'facturacion' && (
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

        {/* CASO C.3: Módulo de Excel Facturación Comparativa (TSA / CAL) */}
        {activeItemId === 'facturacion-excel' && (
          <ErrorBoundary fallbackTitle="Error en Informe Facturación Comparativa Excel">
            <FacturacionComparativaReportPage
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

                {/* CASO C.6: Módulo de Estadística MINER Global */}
        {activeItemId === 'miner-datos-globales' && (
          <ErrorBoundary fallbackTitle="Error en Estadística MINER Global">
            <MinerReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.7: Módulo de Bastidores OBD No Coincidentes */}
        {activeItemId === 'control-obd-no-coincidentes' && (
          <ErrorBoundary fallbackTitle="Error en Bastidores OBD No Coincidentes">
            <BastidoresObdReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.8: Módulo de Inspecciones por Rango Horario */}
        {(activeItemId === 'inspecciones-rango-horario' || activeItemId === 'rango-horario') && (
          <ErrorBoundary fallbackTitle="Error en Inspecciones por Rango Horario">
            <InspRangoHorarioReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.9: Módulo de Volumen de Defectos Detectados */}
        {(activeItemId === 'defectologia-volumen' || activeItemId === 'volumen-defectos') && (
          <ErrorBoundary fallbackTitle="Error en Volumen de Defectos Detectados">
            <VolumenDefectosReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.10: Módulo de Clientes por Volumen de Inspecciones */}
        {activeItemId === 'clientes-volumen' && (
          <ErrorBoundary fallbackTitle="Error en Clientes por Volumen">
            <ClientesVolumenReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.11: Módulo 1 - SMSs/EMAILs Nº Envíos Totales (frmCriterios) */}
        {(activeItemId === 'recordatorios-totales' || activeItemId === 'envios-recordatorios') && (
          <ErrorBoundary fallbackTitle="Error en Resumen de Envíos Totales">
            <EnviosTotalesReportPage
              onNavigateHome={handleGoHome}
              onNavigateToInformes={() => {
                setActiveGroupId('informes');
                setActiveItemId('informes');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO C.12: Módulo 2 - SMSs/EMAILs Enviados (frmSMSEnviado) */}
        {activeItemId === 'recordatorios-enviados' && (
          <ErrorBoundary fallbackTitle="Error en Destinatarios Enviados">
            <EnviosEnviadosReportPage
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

        {/* CASO D.2: Catálogo / Hub del Menú 3. Inspecciones */}
        {activeGroupId === 'inspecciones' && (activeItemId === null || activeItemId === 'inspecciones') && (
          <InspeccionesHubPage
            onSelectModule={(moduleId) => handleSelectItem(moduleId, 'inspecciones')}
            onNavigateHome={handleGoHome}
          />
        )}

        {/* CASO D.3: Los 4 Módulos de Localización del Menú 3. Inspecciones */}
        {activeItemId === 'loc-inspecciones' && (
          <ErrorBoundary fallbackTitle="Error en Localización de Inspecciones">
            <LocalizacionReportPage
              tipo="inspecciones"
              onNavigateHome={handleGoHome}
              onNavigateToInspecciones={() => {
                setActiveGroupId('inspecciones');
                setActiveItemId('inspecciones');
              }}
            />
          </ErrorBoundary>
        )}

        {activeItemId === 'loc-defectos' && (
          <ErrorBoundary fallbackTitle="Error en Localización de Defectos">
            <LocalizacionReportPage
              tipo="defectos"
              onNavigateHome={handleGoHome}
              onNavigateToInspecciones={() => {
                setActiveGroupId('inspecciones');
                setActiveItemId('inspecciones');
              }}
            />
          </ErrorBoundary>
        )}

        {activeItemId === 'loc-elementos' && (
          <ErrorBoundary fallbackTitle="Error en Localización de Elementos">
            <LocalizacionReportPage
              tipo="elementos"
              onNavigateHome={handleGoHome}
              onNavigateToInspecciones={() => {
                setActiveGroupId('inspecciones');
                setActiveItemId('inspecciones');
              }}
            />
          </ErrorBoundary>
        )}

        {activeItemId === 'loc-mediciones' && (
          <ErrorBoundary fallbackTitle="Error en Localización de Mediciones">
            <LocalizacionReportPage
              tipo="mediciones"
              onNavigateHome={handleGoHome}
              onNavigateToInspecciones={() => {
                setActiveGroupId('inspecciones');
                setActiveItemId('inspecciones');
              }}
            />
          </ErrorBoundary>
        )}

        {/* CASO E: Resto de Módulos de la Aplicación de Escritorio con su correspondiente miga de pan */}
        {activeItemId !== null &&
          activeItemId !== 'informes' &&
          activeItemId !== 'inspecciones' &&
          activeItemId !== 'loc-inspecciones' &&
          activeItemId !== 'loc-defectos' &&
          activeItemId !== 'loc-elementos' &&
          activeItemId !== 'loc-mediciones' &&
          activeItemId !== 'ultima-fecha' &&
          activeItemId !== 'facturacion' &&
          activeItemId !== 'facturacion-excel' &&
          activeItemId !== 'num-inspecciones' &&
          activeItemId !== 'numero-inspecciones' &&
          activeItemId !== 'duracion-promedio' &&
          activeItemId !== 'defecto-obd' &&
          activeItemId !== 'control-sin-inspector' &&
          activeItemId !== 'sin-inspector' &&
          activeItemId !== 'cupon-descuento' &&
          activeItemId !== 'miner-datos-globales' &&
          activeItemId !== 'control-obd-no-coincidentes' &&
          activeItemId !== 'bastidores-obd-no-coincidentes' &&
          activeItemId !== 'inspecciones-rango-horario' &&
          activeItemId !== 'rango-horario' &&
          activeItemId !== 'defectologia-volumen' &&
          activeItemId !== 'volumen-defectos' &&
          activeItemId !== 'clientes-volumen' &&
          activeItemId !== 'recordatorios-enviados' &&
          activeItemId !== 'recordatorios-totales' &&
          activeItemId !== 'envios-recordatorios' && (
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
              ><TsIcon name="hourglass_empty" style={{ fontSize: '2rem', color: '#d97706' }} /></div>

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
                  <TsIcon slot="prefix" name="home" />
                  Volver al Inicio
                </TsButton>
                {currentGroup?.id === 'informes' && (
                  <TsButton
                    variant="secondary"
                    onClick={() => {
                      setActiveGroupId('informes');
                      setActiveItemId('informes');
                    }}
                  >
                    <TsIcon slot="prefix" name="bar_chart" />
                    Catálogo de Informes
                  </TsButton>
                )}
                <TsButton
                  variant="primary"
                  onClick={() => handleSelectItem('ultima-fecha', 'aplicacion')}
                >
                  <TsIcon slot="prefix" name="sensors" />
                  Ir a Últimos datos centralizados
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
