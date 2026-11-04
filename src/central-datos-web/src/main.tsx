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

// Inicializar la librería oficial de iconos corporativos de TÜV SÜD Algorithm DS (Google Material Symbols Rounded 400)
registerGoogleMaterial();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
