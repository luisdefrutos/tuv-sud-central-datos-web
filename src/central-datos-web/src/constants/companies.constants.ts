/**
/// Constantes oficiales de las sociedades operativas de TÜV SÜD en España
**/
export const SOCIEDADES = {
  ATISAE: {
    codigo: '01',
    clave: 'TSA',
    nombreCorto: 'TSA (01)',
    nombreCompleto: 'TÜV SÜD ATISAE (TSA)',
    badgeVariant: 'primary' as const,
    colorBorde: '#0046ad',
  },
  CAL: {
    codigo: '03',
    clave: 'CAL',
    nombreCorto: 'CAL (03)',
    nombreCompleto: 'TÜV SÜD CAL',
    badgeVariant: 'success' as const,
    colorBorde: '#00875a',
  },
} as const;

export type ClaveSociedad = 'TODAS' | typeof SOCIEDADES.ATISAE.clave | typeof SOCIEDADES.CAL.clave;

