import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tuvsud/design-system/theme/fonts.css';
import '@tuvsud/design-system/tokens/css/light.css';
import '@tuvsud/design-system/tokens/css/dark.css';
import '@tuvsud/design-system/styles/all.css';
import './styles/algorithm-tokens-fallback.css';
import './styles/responsive.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
