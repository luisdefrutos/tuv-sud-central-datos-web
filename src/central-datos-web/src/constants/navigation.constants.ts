/**
 * navigation.constants.ts
 * 
 * Estructura oficial de menús de Central Datos basada directamente en la
 * aplicación de escritorio original (mdiMain.vb), organizada en grupos y subopciones.
 */

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  descripcion?: string;
  isAction?: boolean;
}

export interface MenuGroup {
  id: string;
  label: string;
  icon?: string;
  items: MenuItem[];
}

export const DESKTOP_MENUS: MenuGroup[] = [
  {
    id: 'aplicacion',
    label: 'Aplicación',
    icon: '⚙️',
    items: [
      {
        id: 'ultima-fecha',
        label: 'Última fecha inspección',
        icon: '📊',
        badge: '30 ITV',
        descripcion: 'Consulta y monitorización del estado de centralización de inspecciones de todas las estaciones.',
      },
    ],
  },
  {
    id: 'informes',
    label: 'Informes',
    icon: '📑',
    items: [
      { id: 'num-inspecciones', label: 'Número de inspecciones', icon: '📈' },
      { id: 'facturacion', label: 'Informe facturación de inspecciones', icon: '💶' },
      { id: 'defecto-obd', label: 'Inspecciones defecto OBD', icon: '🔌' },
      { id: 'duracion-promedio', label: 'Duración promedio', icon: '⏱️' },
      { id: 'cupon-descuento', label: 'Inspecciones cupón descuento', icon: '🏷️' },
      { id: 'info-clientes', label: 'Información clientes', icon: '👤' },
      { id: 'miner-excel', label: 'Estadística "MINER" Excel', icon: '📊' },
      { id: 'control-inspecciones', label: 'Informes de control', icon: '🛡️' },
      { id: 'recordatorios', label: 'Informes envíos recordatorios', icon: '✉️' },
      { id: 'defectologia', label: 'Informes defectología', icon: '⚠️' },
    ],
  },
  {
    id: 'inspecciones',
    label: 'Inspecciones',
    icon: '🚗',
    items: [
      { id: 'loc-inspecciones', label: 'Localización de inspecciones', icon: '🔍' },
      { id: 'loc-defectos', label: 'Localización de defectos', icon: '🛠️' },
      { id: 'loc-elementos', label: 'Localización de elementos', icon: '📋' },
      { id: 'loc-mediciones', label: 'Localización de mediciones', icon: '📐' },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: '📱',
    items: [
      { id: 'citas-previas', label: 'Citas previas', icon: '📅' },
      { id: 'envios-clientes', label: 'Envíos a clientes (SMS / Email)', icon: '💬' },
      { id: 'listado-terceros', label: 'Listado de terceros', icon: '🏢' },
      { id: 'proyectos-clientes', label: 'Proyectos de clientes', icon: '📁' },
    ],
  },
  {
    id: 'datos',
    label: 'Datos',
    icon: '🗄️',
    items: [
      { id: 'alcance-elementos', label: 'Alcance de elementos', icon: '🗂️' },
    ],
  },
  {
    id: 'mantenimientos',
    label: 'Mantenimientos',
    icon: '👥',
    items: [
      { id: 'laboral', label: 'Laboral (Empleados general)', icon: '👷' },
      { id: 'soporte-it', label: 'Soporte IT (Equipos / Versiones)', icon: '💻' },
    ],
  },
  {
    id: 'acerca-de',
    label: 'Acerca de',
    icon: 'ℹ️',
    items: [
      { id: 'acerca-info', label: 'Acerca de Central Datos', icon: 'ℹ️' },
    ],
  },
];
