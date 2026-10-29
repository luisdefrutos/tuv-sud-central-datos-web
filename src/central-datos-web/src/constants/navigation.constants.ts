import type { NavItem } from '../components/layout/Navbar';

/**
/// Elementos de navegación del menú superior de módulos
**/
export const NAV_ITEMS: NavItem[] = [
  { id: 'ultimos-datos', label: 'Últimas Fechas', icon: '📊', badge: '29 ITV' },
  { id: 'inspecciones', label: 'Inspecciones ITV', icon: '🚗' },
  { id: 'informes', label: 'Informes & MINER', icon: '📑' },
  { id: 'comercial', label: 'Campañas SMS', icon: '📱' },
  { id: 'mantenimientos', label: 'Mantenimientos', icon: '👥' },
];

export const SECCION_INICIAL_ID = 'ultimos-datos';
