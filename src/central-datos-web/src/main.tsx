import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tuvsud/design-system/theme/fonts.css';
import '@tuvsud/design-system/tokens/css/light.css';
import '@tuvsud/design-system/tokens/css/dark.css';
import '@tuvsud/design-system/styles/all.css';
import { registerGoogleMaterial } from '@tuvsud/design-system/react';
import './styles/algorithm-tokens-fallback.css';
import './styles/responsive.css';
import { App } from './App';

// Detectar el basePath de los iconos corporativos automáticamente:
// Calcula la carpeta base real de la web sin importar cómo se llame el directorio en IIS
// Ejemplos:
// - Si corre en https://servidor/ -> '/icons/material-symbols'
// - Si corre en https://servidor/CUALQUIER_NOMBRE/ -> '/CUALQUIER_NOMBRE/icons/material-symbols'
// - Si corre en https://servidor/area/app/ -> '/area/app/icons/material-symbols'
const getIconBasePath = (): string => {
  if (typeof window !== 'undefined') {
    const baseDir = window.location.pathname.replace(/\/([^\/]+\.[^\/]+)?$/, '').replace(/\/+$/, '');
    return `${baseDir}/icons/material-symbols`;
  }
  return '/icons/material-symbols';
};

// Inicializar la librería oficial de iconos corporativos de TÜV SÜD Algorithm DS
registerGoogleMaterial({
  basePath: getIconBasePath(),
  styles: ['rounded'],
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
