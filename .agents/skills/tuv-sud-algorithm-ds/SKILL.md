---
name: tuv-sud-algorithm-ds
description: >-
  Official standards, setup, design tokens, CSS utilities, and component guidelines
  for the TÜV SÜD Algorithm Design System (@tuvsud/design-system). Activate this skill
  whenever designing, scaffolding, styling, or implementing frontend UI views, components,
  themes, icons, or layouts for TÜV SÜD web applications.
---

# TÜV SÜD Algorithm Design System (`@tuvsud/design-system`)

Official reference for building web interfaces compliant with the **TÜV SÜD Algorithm Design System** (`https://create.tuvsud.com/latest/`). Algorithm is built on standards-based **Web Components** (Shoelace foundation) with first-class **React PascalCase wrappers**, **CSS Custom Properties (`--ts-*`)**, and **modular `ts-` CSS utilities**.

---

## 1. Golden Rules & Design Governance

1. **Compose Before You Build**: Always prefer official `<Ts*>` (React) or `<ts-*>` (Web Component) building blocks (`TsButton`, `TsInput`, `TsSelect`, `TsDatepicker`, `TsTable`, `TsPagination`, `TsDialog`, `TsQrCode`, `TsOtpInput`, `TsTag`, etc.) over custom HTML/CSS widgets.
2. **Never Override Encapsulated Internals**: Algorithm components use Shadow DOM encapsulation. Never hack internal selectors; customize ONLY via documented component props, slots (`slot="prefix"`, `slot="footer"`, `slot="label"`), `::part(...)` hooks, or documented CSS custom properties (e.g., `style={{ '--height': '4px' }}`).
3. **Zero Hardcoded Hex / Pixel Values**: Always consume semantic `--ts-semantic-*` CSS variables so **Light (`ts-theme-light`)** and **Dark (`ts-theme-dark`)** themes switch automatically while maintaining WCAG WAI-ARIA contrast compliance.
4. **Official Typography (`TUV SUD Pro`)**: Never substitute arbitrary Google Fonts when `TUV SUD Pro` is available. Load `@tuvsud/design-system/theme/fonts.css` (`font-family: 'TUV SUD Pro', system-ui, sans-serif;`). For high-density technical identifiers (vehicle plates, 17-char VINs, accounting amounts), enable `font-variant-numeric: tabular-nums`.
5. **Security of `.npmrc` PAT**: `@tuvsud/design-system` is hosted in TÜV SÜD's private Azure DevOps Artifacts feed (`tuvsud01`). **NEVER** hardcode a Personal Access Token in `.npmrc` committed to Git; reference an environment variable (`${TUVSUD_AZURE_PAT}`) and keep `.npmrc` local or injected via CI secrets.

---

## 2. Package Installation & Registry Setup

### Prerequisites
- **Node.js `>= 18.x`** (Node 20/22/24 LTS supported)
- **Azure DevOps Personal Access Token (PAT)** with **`Packaging (Read)`** scope in organization `tuvsud01`.

### `.npmrc` Configuration (Project Root)
```ini
registry=https://registry.npmjs.org/
always-auth=true
@tuvsud:registry=https://pkgs.dev.azure.com/tuvsud01/_packaging/design-system/npm/registry/
//pkgs.dev.azure.com/tuvsud01/_packaging/design-system/npm/registry/:_authToken=${TUVSUD_AZURE_PAT}
```

### Install Packages
```bash
npm install @tuvsud/design-system @material-symbols/svg-400
```

---

## 3. React + Vite Integration (Recommended Setup)

### `vite.config.ts`
Register the official Vite icon scanner plugin (`designSystemIconsVitePlugin`). Note: static string icon names (`name="home"`) are bundled automatically; dynamic runtime icon names (`name={iconVar}`) MUST be declared in `additionalIcons`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { designSystemIconsVitePlugin } from '@tuvsud/design-system/vite';

export default defineConfig({
  plugins: [
    react(),
    ...designSystemIconsVitePlugin({
      additionalIcons: [
        { name: 'check_circle', style: 'rounded' },
        { name: 'warning', style: 'rounded' },
        { name: 'cancel', style: 'rounded' },
        { name: 'info', style: 'rounded' },
      ],
    }),
  ],
});
```

### `index.html` (Font Preload Recommendation)
Preload `TUV SUD Pro` from the TÜV SÜD CDN to prevent CLS (Cumulative Layout Shift):
```html
<link
  rel="preload"
  href="https://madc.tuvsud.com/asset/b0ef565b-8a7d-4920-9f51-78cda91c2121/TUVSUDPro-Regular_WOFF2.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

### `src/main.tsx` (Entry Point)
```tsx
import '@tuvsud/design-system/tokens/css/light.css';
import '@tuvsud/design-system/tokens/css/dark.css';
import '@tuvsud/design-system/theme/fonts.css';
import '@tuvsud/design-system/styles/all.css'; // Optional modular ts-* utilities

import { registerGoogleMaterial } from '@tuvsud/design-system/react';
registerGoogleMaterial(); // If deployed at subpath '/app/', pass { basePath: '/app/icons/material-symbols' }
```
Wrap the root container in `<div className="ts-theme-light">` (or `ts-theme-dark`).

---

## 4. Cross-Framework Component API Conventions

| Feature | React Wrapper (`@tuvsud/design-system/react`) | Web Component / Angular / HTML |
| :--- | :--- | :--- |
| **Element / Component** | PascalCase: `<TsButton>`, `<TsDatepicker>` | kebab-case: `<ts-button>`, `<ts-datepicker>` |
| **Properties** | camelCase: `helpText="..."`, `minDate={...}` | kebab-case: `help-text="..."`, `min-date="..."` |
| **Native HTML Attrs** | Standard: `autocomplete="off"`, `disabled` | Standard: `autocomplete="off"`, `disabled` |
| **Custom Events** | `onTs*` camelCase: `onTsFocus`, `onTsDateChange` | `ts-*` kebab-case: `(ts-focus)`, `@ts-date-change` |
| **Imperative Methods** | Via `useRef`: `ref.current?.show()` / `focus()` | Direct DOM ref: `el.show()` / `el.focus()` |
| **Localization (Spain)** | `language="es"` `locale="es-ES"` (`DD/MM/YYYY`) | `language="es"` `locale="es-ES"` (`DD/MM/YYYY`) |

---

## 5. Fallback / Standalone Mode (Before PAT is Configured)

When building local prototypes or before the developer configures `TUVSUD_AZURE_PAT` to download `@tuvsud/design-system`:
1. Mirror the exact **Algorithm CSS variable names** (`--ts-semantic-color-*`, `--ts-semantic-size-space-*`, `--ts-semantic-size-radius-*`) in a local `algorithm-tokens-fallback.css` file so zero component styles need refactoring once the npm package is installed.
2. Wrap third-party complex data widgets not covered by base Shoelace (e.g., virtualized 50,000-row analytical grids using `TanStack Table`, or `ECharts` charts) inside Algorithm semantic tokens (`var(--ts-semantic-color-surface-base-default)`, `var(--ts-semantic-color-border-base-default)`).

---

## 6. Detailed Reference Manuals (Progressive Disclosure)

Read these reference files on demand when writing CSS styles, layouts, or selecting components:
- **[Tokens & CSS Utilities Reference](./references/tokens-and-utilities.md)**: Exact `--ts-semantic-*` CSS custom properties, hex values (Light/Dark), typography scales, spacing, radius, shadows, breakpoints, and `ts-*` layout utility classes.
- **[Official Components Catalog](./references/components-catalog.md)**: Complete catalog of all 84 Algorithm components (`Ts*` / `<ts-*>`), icons (`TsIcon`), localization locales, and mapping to enterprise/ITV UI patterns.
