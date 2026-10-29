# Estándar de Interfaz: TÜV SÜD Algorithm Design System (`create.tuvsud.com`)

> [!NOTE]
> Documento consolidado a partir de la documentación oficial para desarrolladores de **TÜV SÜD Algorithm Design System** ([Overview](https://create.tuvsud.com/latest/t-ue-v-s-ue-d-algorithm-design-system-seamless-solutions-unified-experiences-b79PckjY) y [Onboarding for Developers](https://create.tuvsud.com/latest/get-started/onboarding-for-developers/overview-sPsw4isr)). Estas reglas están automatizadas en el Skill de Antigravity `tuv-sud-algorithm-ds` (copiado también en `skill-tuv-sud-algorithm-ds/`).

---

## 1. Arquitectura del Design System Oficial

El **Algorithm Design System** (`@tuvsud/design-system`) es la librería corporativa unificada de TÜV SÜD construida sobre **Web Components estándar (Shoelace)** con **wrappers nativos en PascalCase para React** (`@tuvsud/design-system/react`) y empaquetador automático de iconos para **Vite** (`@tuvsud/design-system/vite`).

### 1.1. Instalación desde el Feed Privado de Azure DevOps

1. Requisitos: **Node.js >= 18** (`v24.18.0` instalado) y un **Personal Access Token (PAT)** en Azure DevOps (`tuvsud01`) con alcance **`Packaging (Read)`**.
2. Configurar `.npmrc` en `src/central-datos-web/.npmrc` (nunca subir el PAT al repositorio):
   ```ini
   @tuvsud:registry=https://pkgs.dev.azure.com/tuvsud01/_packaging/design-system/npm/registry/
   always-auth=true
   //pkgs.dev.azure.com/tuvsud01/_packaging/design-system/npm/registry/:username=tuvsud01
   //pkgs.dev.azure.com/tuvsud01/_packaging/design-system/npm/registry/:_password=${TUVSUD_AZURE_PAT}
   //pkgs.dev.azure.com/tuvsud01/_packaging/design-system/npm/registry/:email=npm@tuvsud.com
   ```
3. Instalar paquetes oficiales:
   ```powershell
   npm install @tuvsud/design-system @material-symbols/svg-400
   ```

### 1.2. Configuración Base en React + Vite (`main.tsx` y `vite.config.ts`)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { designSystemIconsVitePlugin } from '@tuvsud/design-system/vite';

export default defineConfig({
  plugins: [
    react(),
    designSystemIconsVitePlugin({ minify: true }),
  ],
});
```

```tsx
// src/main.tsx
import '@tuvsud/design-system/theme/fonts.css';
import '@tuvsud/design-system/tokens/css/light.css';
import '@tuvsud/design-system/tokens/css/dark.css';
import '@tuvsud/design-system/styles/all.css';
import { setDefaultAnimation } from '@tuvsud/design-system';
```

El elemento raíz (`<html lang="es" class="ts-theme-light">`) debe declarar explícitamente la clase de tema (`.ts-theme-light` o `.ts-theme-dark`) y precargar la fuente corporativa **`TUV SUD Pro`** (`TUVSUDPro-Regular_WOFF2.woff2`).

---

## 2. Tokens Semánticos (`--ts-semantic-*`) y Tipografía

Regla estricta del Skill: **prohibido usar colores hexadecimales arbitrarios en componentes**; toda superficie, borde, texto o estado debe referenciar variables `--ts-semantic-*`:

| Token Semántico Oficial | Valor Base (Light) | Uso en Central Datos Web |
| :--- | :---: | :--- |
| `--ts-semantic-color-surface-brand-blue` | `#0046ad` | Acciones primarias (`TsButton`), pestaña activa, borde octágono TÜV SÜD. |
| `--ts-semantic-color-surface-inverted-default` | `#0b253b` | Cabecera global corporativa y barra lateral (`TsSidebar`). |
| `--ts-semantic-color-surface-default` | `#ffffff` | Tarjetas de filtros, paneles KPI y contenedores de tablas. |
| `--ts-semantic-color-surface-subtle` | `#f4f6f9` | Fondo general de aplicación y cabeceras de rejilla. |
| `--ts-semantic-color-border-default` | `#d0dae5` | Líneas divisorias de `1px` en formularios y tablas. |
| `--ts-semantic-color-status-success` | `#0f7b3f` | Inspección *Favorable*, estación sincronizada, campaña SMS confirmada. |
| `--ts-semantic-color-status-warning` | `#b45309` | *Defectos Leves*, desfase de sincronización, exclusión RGPD/Robinson. |
| `--ts-semantic-color-status-danger` | `#c81e1e` | Inspección *Desfavorable / Negativa*, discrepancia VIN OBD, error crítico. |

- **Tipografía**: `'TUV SUD Pro', system-ui, sans-serif` en toda la interfaz, aplicando `font-variant-numeric: tabular-nums` y fuente monoespaciada para matrículas, bastidores VIN (17 caracteres), códigos SEPIVA e importes en euros.
- **Utilidades CSS modulares (`ts-*`)**: Sistema de rejilla y espaciado propio con *breakpoints* infijos `sm`, `md`, `lg`, `xl`, `xxl` (`@tuvsud/design-system/styles/all.css`).

---

## 3. Mapeo de Componentes Oficiales (`Ts*`) a Central Datos Web

De los **84 componentes** incluidos en `@tuvsud/design-system/react`, estos sustituyen directamente controles WinForms y librerías obsoletas del proyecto legacy:

| Necesidad Funcional en Central Datos | Legado Eliminado | Componente Oficial Algorithm DS |
| :--- | :--- | :--- |
| Navegación principal multi-módulo | `mdiMain.vb` + `MenuStrip` / `clsTbr` | `TsSidebar`, `TsHeader`, `TsBreadcrumb`, `TsDropdown` |
| Filtros multi-estación, sociedades y SEPIVA | `CheckedListBox` + `clsCbo` | `TsSelect` (multi-selección con búsqueda), `TsCombobox`, `TsCheckbox` |
| Rangos de fechas de inspección / caducidad | `DateTimePicker` WinForms | `TsDateRangePicker` y `TsDatepicker` (con `lang="es"` nativo `DD/MM/YYYY`) |
| Rejillas CRUD y listados paginados estándar | `clsGrd` / `clsGrX` / `DataGrid` .NET 1.1 | `TsTable` + `TsPagination` *(y `TanStack Table` virtualizado estilizado con `--ts-semantic-*` para exploraciones > 10.000 filas)* |
| Etiqueta QR de credenciales de pista | `ThoughtWorks.QRCode.dll` + `rptEtiqueta.rpt` | **`TsQrCode`** nativo + impresión directa / `QuestPDF` |
| Gestión y validación de `PIN_Inspector` (4 dígitos) | `frmPin` / `TextBox` sin máscara moderna | **`TsOtpInput`** (4 dígitos con validación de secuencias prohibidas) |
| Cuentas bancarias / facturación clientes | `TextBox` manual | **`TsIban`** con validación de formato integrada |
| Importación Excel de campañas / ficheros equipos | `OpenFileDialog` + `Interop.Excel` | **`TsDropzone`** + procesamiento streaming en `CentralDatos.Api` |
| Progreso en vivo de campañas SMS DigitalServi | UI congelada 10 minutos (`DoEvents`) | `TsProgressBar`, `TsBadge`, `TsToast` y `TsAlert` conectados por SignalR/SSE |
| Edición modal y paneles de detalle de inspección | Múltiples ventanas MDI hijas superpuestas | `TsDrawer` (detalle lateral sin perder la tabla) y `TsDialog` |
