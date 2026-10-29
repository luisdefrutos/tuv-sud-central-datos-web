/**
/// Textos corporativos y constantes visuales de la interfaz de usuario
**/
export const UI_CONSTANTS = {
  BRAND: {
    NOMBRE_EMPRESA: 'TÜV SÜD',
    TITULO_APLICACION: 'Central Datos ITV',
    SUBTITULO_APLICACION: 'TÜV SÜD ATISAE & CAL · Gestión Centralizada de Inspecciones',
    BADGE_HEADER: 'Plataforma Web',
    DB_NAME: 'ORCLDV',
    DEFAULT_USER: 'CENTRALITV',
    FOOTER_TEXT: 'TÜV SÜD España · ITV Central Datos',
    FOOTER_TECH: '.NET 10 Web API + React 19 + TypeScript + TÜV SÜD Algorithm Design System',
  },
  MODULO_ULTIMOS_DATOS: {
    BREADCRUMB: ['Inicio', 'Aplicación', 'Última fecha de inspección centralizada'],
    TITULO: 'Última fecha de inspección centralizada',
    DESCRIPCION: 'Consulta del último registro de inspección recibido por estación ITV en la base de datos central de TÜV SÜD.',
    SPINNER_TITULO: 'Consultando Base de Datos Central',
    SPINNER_SUBTITULO: 'Recuperando las últimas fechas y horas de inspección para las estaciones ITV. Por favor, espere...',
    BOTON_ACTUALIZAR: '🔄 Actualizar Datos',
    CARD_TOTAL_ESTACIONES: 'Total Estaciones ITV',
    CARD_TOTAL_TSA: 'TÜV SÜD ATISAE (TSA)',
    CARD_TOTAL_CAL: 'TÜV SÜD CAL',
    CARD_ULTIMA_FECHA: 'Última Fecha Registrada',
    PLACEHOLDER_BUSQUEDA: 'Buscar por código (ej. 0202) o nombre de estación...',
    FILTRO_SOCIEDAD_LABEL: 'Sociedad:',
    FILTRO_TODAS: 'Todas',
    TABLA: {
      COL_CODIGO: 'Cod.',
      COL_DESCRIPCION: 'Descripción',
      COL_SOCIEDAD: 'Sociedad',
      COL_ULTIMA_FECHA: 'Última fecha',
      CARGANDO: 'Cargando datos de estaciones ITV...',
      SIN_RESULTADOS: 'No se encontraron estaciones que coincidan con la búsqueda.',
      FOOTER_LABEL: 'estaciones ITV',
    },
  },
} as const;

