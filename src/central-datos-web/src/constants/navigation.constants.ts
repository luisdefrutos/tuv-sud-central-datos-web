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
export const IMPLEMENTED_SCREENS = ['ultima-fecha', 'facturacion', 'num-inspecciones'] as const;

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
          { id: 'facturacion-excel', label: 'Excel facturación de inspecciones' },
        ],
      },
      { id: 'defecto-obd', label: 'Informe inspecciones con defecto OBD' },
      { id: 'duracion-promedio', label: 'Informe duración promedio' },
      { id: 'cupon-descuento', label: 'Inspecciones con cupón descuento' },
      {
        id: 'info-clientes',
        label: 'Información Clientes',
        children: [{ id: 'clientes-volumen', label: 'Clientes por volumen de inspecciones' }],
      },
      {
        id: 'miner-excel',
        label: 'Estadística "MINER" Excel',
        children: [{ id: 'miner-datos-globales', label: 'Datos Globales' }],
      },
      {
        id: 'informes-control',
        label: 'Informes de control',
        children: [
          { id: 'control-sin-inspector', label: 'Inspecciones sin inspector' },
          { id: 'control-obd-no-coincidentes', label: 'Informe bastidores OBD no coincidentes' },
        ],
      },
      {
        id: 'informes-recordatorios',
        label: 'Informes envíos recordatorios',
        children: [
          { id: 'recordatorios-enviados', label: 'SMSs/EMAILs enviados' },
          { id: 'recordatorios-totales', label: 'SMSs/EMAILs - Nº envíos totales' },
        ],
      },
      { id: 'inspecciones-rango-horario', label: 'Inspecciones por rango horario' },
      {
        id: 'informes-defectologia',
        label: 'Informes defectología',
        children: [{ id: 'defectologia-volumen', label: 'Volumen de defectos detectados' }],
      },
    ],
  },
  {
    id: 'inspecciones',
    label: 'Inspecciones',
    items: [
      { id: 'loc-inspecciones', label: 'Localización inspecciones' },
      { id: 'loc-defectos', label: 'Localización defectos', separatorBefore: true },
      { id: 'loc-elementos', label: 'Localización elementos' },
      { id: 'loc-mediciones', label: 'Localización mediciones' },
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
