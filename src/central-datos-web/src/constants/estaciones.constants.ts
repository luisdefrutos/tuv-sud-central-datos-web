import type { EstacionOpcionCombo } from '../features/informes/types/informes.types';

/**
 * Catálogo maestro oficial de las 30 estaciones ITV activas en Central Datos.
 * (26 estaciones TÜV SÜD ATISAE + 4 estaciones TÜV SÜD CAL).
 */
export const ESTACIONES_OFICIALES: EstacionOpcionCombo[] = [
  // --- TÜV SÜD ATISAE (TSA) ---
  { codigo: '0202', descripcion: 'I.T.V. - ALBACETE', sociedad: 'TSA' },
  { codigo: '2878', descripcion: 'I.T.V. - ALCALÁ', sociedad: 'TSA' },
  { codigo: '2814', descripcion: 'I.T.V. - ALCOBENDAS', sociedad: 'TSA' },
  { codigo: '1302', descripcion: 'I.T.V. - ALCÁZAR', sociedad: 'TSA' },
  { codigo: '4308', descripcion: 'I.T.V. - AMPOSTA', sociedad: 'TSA' },
  { codigo: '2873', descripcion: 'I.T.V. - ARROYOMOLINOS', sociedad: 'TSA' },
  { codigo: '2879', descripcion: 'I.T.V. - ARROYOSUR', sociedad: 'TSA' },
  { codigo: '2511', descripcion: 'I.T.V. - BORGES BLANQUES', sociedad: 'TSA' },
  { codigo: '2815', descripcion: 'I.T.V. - COSLADA', sociedad: 'TSA' },
  { codigo: '2887', descripcion: 'I.T.V. - CUATRO VIENTOS', sociedad: 'TSA' },
  { codigo: '4003', descripcion: 'I.T.V. - CUELLAR', sociedad: 'TSA' },
  { codigo: '4004', descripcion: 'I.T.V. - EL ESPINAR', sociedad: 'TSA' },
  { codigo: '2875', descripcion: 'I.T.V. - FUENLABRADA', sociedad: 'TSA' },
  { codigo: '2893', descripcion: 'I.T.V. - HUMANES', sociedad: 'TSA' },
  { codigo: '4514', descripcion: 'I.T.V. - ILLESCAS', sociedad: 'TSA' },
  { codigo: '2816', descripcion: 'I.T.V. - LAS ROZAS', sociedad: 'TSA' },
  { codigo: '2605', descripcion: 'I.T.V. - LOGROÑO', sociedad: 'TSA' },
  { codigo: '4504', descripcion: 'I.T.V. - LOS YÉBENES', sociedad: 'TSA' },
  { codigo: '2812', descripcion: 'I.T.V. - LOZOYUELA', sociedad: 'TSA' },
  { codigo: '2607', descripcion: 'I.T.V. - NÁJERA', sociedad: 'TSA' },
  { codigo: '1304', descripcion: 'I.T.V. - PUERTOLLANO', sociedad: 'TSA' },
  { codigo: '0826', descripcion: 'I.T.V. - SANT CELONI', sociedad: 'TSA' },
  { codigo: '4518', descripcion: 'I.T.V. - TOLEDO', sociedad: 'TSA' },
  { codigo: '2811', descripcion: 'I.T.V. - TRES CANTOS', sociedad: 'TSA' },
  { codigo: '4002', descripcion: 'I.T.V. - VALVERDE', sociedad: 'TSA' },
  { codigo: '2813', descripcion: 'I.T.V. - VILLALBA', sociedad: 'TSA' },

  // --- TÜV SÜD CAL ---
  { codigo: '0906', descripcion: 'I.T.V. - BELORADO', sociedad: 'CAL' },
  { codigo: '0908', descripcion: 'I.T.V. - BRIVIESCA', sociedad: 'CAL' },
  { codigo: '0902', descripcion: 'I.T.V. - MIRANDA DE EBRO', sociedad: 'CAL' },
  { codigo: '0905', descripcion: 'I.T.V. - VILLASANTE DE MONTIJA', sociedad: 'CAL' },
];

