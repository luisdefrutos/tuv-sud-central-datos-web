/**
 * navigation.constants.ts
 * 
 * Estructura oficial de menús de Central Datos basada directamente en la
 * aplicación de escritorio original (mdiMain.vb), organizada en grupos y subopciones.
 *
 * IMPORTANTE: Los textos, el orden, los submenús (▶) y los separadores replican
 * literalmente `mdiMain.vb` (InitializeComponent) para no confundir al usuario.
 */

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  descripcion?: string;
  /** Acción especial (no abre pantalla), p.ej. 'Salir' */
  isAction?: boolean;
  /** Dibuja una línea separadora antes del elemento (MenuItem.Text = "-" en VB) */
  separatorBefore?: boolean;
  /** Submenú desplegable lateral (▶) */
  children?: MenuItem[];
}

export interface MenuGroup {
  id: string;
  label: string;
  icon?: string;
  items: MenuItem[];
}

/** Pantallas ya migradas a la web (resto muestran la ficha "en migración") */
export const IMPLEMENTED_SCREENS = ['ultima-fecha', 'facturacion', 'facturacion-excel', 'num-inspecciones', 'duracion-promedio', 'defecto-obd', 'control-sin-inspector', 'cupon-descuento', 'miner-datos-globales', 'control-obd-no-coincidentes', 'inspecciones-rango-horario', 'defectologia-volumen', 'volumen-defectos', 'clientes-volumen', 'recordatorios-enviados', 'recordatorios-totales', 'envios-recordatorios', 'loc-inspecciones', 'loc-defectos', 'loc-elementos', 'loc-mediciones'] as const;

export const DESKTOP_MENUS: MenuGroup[] = [
  {
    id: 'aplicacion',
    label: 'Aplicación',
    items: [
      {
        id: 'ultima-fecha',
        label: 'Últimos datos centralizados',
        descripcion: 'Consulta y monitorización del estado de centralización de inspecciones de todas las estaciones.',
      },
    ],
  },
  {
    id: 'informes',
    label: 'Informes',
    items: [
      {
        id: 'num-inspecciones',
        label: 'Informe número de inspecciones',
        descripcion: 'Inspecciones Favorables y Rechazadas por estación y tipo.',
      },
      {
        id: 'facturacion-menu',
        label: 'Informe facturación de inspecciones',
        children: [
          {
            id: 'facturacion',
            label: 'Informe de facturación de inspecciones',
            descripcion: 'Dashboard interactivo de liquidación, facturación neta y ranking por ITV.',
          },
          {
            id: 'facturacion-excel',
            label: 'Excel facturación de inspecciones',
            icon: 'trending_up',
            descripcion: 'Análisis comparativo de ingresos e inspecciones entre dos periodos (TSA / CAL) con exportación a libro Excel oficial.',
          },
        ],
      },
      { id: 'defecto-obd', label: 'Informe inspecciones con defecto OBD', descripcion: 'Auditoría técnica y control de lecturas de emisiones OBD anómalas por estación ITV.' },
      { id: 'duracion-promedio', label: 'Informe duración promedio' },
      { id: 'cupon-descuento', label: 'Inspecciones con cupón descuento', icon: 'confirmation_number', descripcion: 'Auditoría técnica y control de liquidación de promociones y cupones de descuento aplicados en la red ITV.' },
      {
        id: 'info-clientes',
        label: 'Información Clientes',
        children: [
          {
            id: 'clientes-volumen',
            label: 'Clientes por volumen de inspecciones',
            icon: 'groups',
            descripcion: 'Identificación y análisis de fidelización de grandes cuentas, flotas comerciales y profesionales en la red ITV.',
          },
        ],
      },
      {
        id: 'miner-excel',
        label: 'Estadística "MINER" Excel',
        children: [{ id: 'miner-datos-globales', label: 'Datos Globales', icon: 'bar_chart', descripcion: 'Estadística regulatoria oficial MINER de defectos e inspecciones en 9 categorías de vehículos (Industria.xls).' }],
      },
      {
        id: 'informes-control',
        label: 'Informes de control',
        children: [
          { id: 'control-sin-inspector', label: 'Inspecciones sin inspector', icon: 'warning', descripcion: 'Control y auditoría técnica de inspecciones que no tienen asignado ningún inspector responsable.' },
          { id: 'control-obd-no-coincidentes', label: 'Informe bastidores OBD no coincidentes', icon: 'cable', descripcion: 'Auditoría técnica antifraude de discrepancias entre bastidor de ficha e inspección electrónica OBD.' },
        ],
      },
      {
        id: 'informes-recordatorios',
        label: 'Informes envíos recordatorios',
        children: [
          { id: 'recordatorios-enviados', label: 'SMSs/EMAILs enviados', icon: 'sms', descripcion: 'Detalle trazable de notificaciones y recordatorios emitidos por estación a clientes (SMS y Email).' },
          { id: 'recordatorios-totales', label: 'SMSs/EMAILs - Nº envíos totales', icon: 'leaderboard', descripcion: 'Resumen consolidado de envíos agrupados por estación, canal, plantilla y periodo.' },
        ],
      },
      { id: 'inspecciones-rango-horario', label: 'Inspecciones por rango horario' },
      {
        id: 'informes-defectologia',
        label: 'Informes defectología',
        children: [{ id: 'defectologia-volumen', label: 'Volumen de defectos detectados', icon: 'warning', descripcion: 'Análisis de concentración y frecuencia de defectos por grupo de vehículo, capítulo y gravedad.' }],
      },
    ],
  },
  {
    id: 'inspecciones',
    label: 'Inspecciones',
    items: [
      {
        id: 'loc-inspecciones',
        label: 'Localización inspecciones',
        icon: 'directions_car',
        descripcion: 'Explorador dinámico multi-estación de inspecciones con filtros avanzados de vehículo, titular, facturación, vencimientos y selección de columnas exportables.',
      },
      {
        id: 'loc-defectos',
        label: 'Localización defectos',
        icon: 'warning',
        separatorBefore: true,
        descripcion: 'Búsqueda y auditoría detallada de defectos detectados filtrando por sección del manual, bloque, elemento, subdefecto y características del vehículo.',
      },
      {
        id: 'loc-elementos',
        label: 'Localización elementos',
        icon: 'build',
        descripcion: 'Consulta técnica de elementos e hitos verificados en línea de inspección por bloque reglamentario, estación y tipología de vehículo.',
      },
      {
        id: 'loc-mediciones',
        label: 'Localización mediciones',
        icon: 'analytics',
        descripcion: 'Explotación técnica de valores de medición en línea (frenómetro, emisiones, alineación, OBD y pesos) con clasificación MINER y selector de magnitudes.',
      },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    items: [
      {
        id: 'citas-previas-menu',
        label: 'Citas previas',
        children: [
          { id: 'citas-recuperar', label: 'Recuperar citas previas' },
          { id: 'citas-visualizar', label: 'Visualizar citas previas' },
        ],
      },
      { id: 'listado-terceros', label: 'Listado Clientes Terceros', separatorBefore: true },
      { id: 'proyectos-clientes', label: 'Clientes por proyecto', separatorBefore: true },
      {
        id: 'envios-clientes-menu',
        label: 'Envios a clientes',
        separatorBefore: true,
        children: [
          { id: 'sms-vencimientos-enviar', label: 'SMSs vencimientos - Enviar' },
          { id: 'sms-pruebas-envios', label: 'SMSs Pruebas Envios' },
          { id: 'cartas-recordatorias', label: 'Cartas recordatorias' },
          { id: 'sms-vencimientos-visualizar', label: 'SMSs vencimientos - Visualizar' },
          { id: 'sms-config-envios-auto', label: 'SMSs - Configuración envíos automáticos' },
        ],
      },
    ],
  },
  {
    id: 'datos',
    label: 'Datos',
    items: [{ id: 'alcance-elementos', label: 'Alcance elementos' }],
  },
  {
    id: 'mantenimientos',
    label: 'Mantenimientos',
    items: [
      {
        id: 'laboral-menu',
        label: 'Laboral',
        children: [{ id: 'empleados', label: 'Empleados' }],
      },
      {
        id: 'soporte-it-menu',
        label: 'Soporte IT',
        children: [
          { id: 'equipos-mediciones', label: 'Equipos mediciones' },
          { id: 'informes-versiones', label: 'Informes Versiones' },
        ],
      },
    ],
  },
  {
    id: 'acerca-de',
    label: 'Acerca de',
    items: [{ id: 'acerca-info', label: 'Acerca de' }],
  },
];

/** Busca un elemento (incluidos submenús) por id y devuelve el elemento, su padre y su grupo */
export function findMenuItem(itemId: string | null): {
  group?: MenuGroup;
  parent?: MenuItem;
  item?: MenuItem;
} {
  if (!itemId) return {};
  for (const group of DESKTOP_MENUS) {
    for (const item of group.items) {
      if (item.id === itemId) return { group, item };
      const child = item.children?.find((c) => c.id === itemId);
      if (child) return { group, parent: item, item: child };
    }
  }
  return {};
}
