# TÜV SÜD Algorithm — CSS Design Tokens & Utility Classes Reference

Source: `https://create.tuvsud.com/latest/get-started/onboarding-for-developers/css-tokens-aaqEFDri` and `css-utilities-qXWxHdF5`.

All tokens are exposed as CSS custom properties (`var(--ts-...)`) and automatically adapt between `.ts-theme-light` and `.ts-theme-dark`.

---

## 1. Semantic Color Tokens

### Brand & Surface Tokens
| CSS Custom Property | Light Mode | Dark Mode | Usage |
| :--- | :---: | :---: | :--- |
| `--ts-semantic-color-surface-brand-blue` | `#0046ad` | `#dcebfe` | Primary TÜV SÜD brand blue accent/surface |
| `--ts-semantic-color-surface-brand-gray` | `#f2efed` | `#2c2c31` | Corporate neutral brand gray container |
| `--ts-semantic-color-surface-brand-green` | `#02eca6` | `#059467` | Brand green highlight |
| `--ts-semantic-color-surface-brand-orange` | `#ff774b` | `#fb923c` | Brand orange highlight |
| `--ts-semantic-color-surface-base-default` | `#ffffff` | `#000000` | Default card / page base surface |
| `--ts-semantic-color-surface-neutral-default` | `#f9f9f9` | `#171717` | Subtle secondary / table header surface |
| `--ts-semantic-color-surface-inverted-default` | `#0b253b` | `#f7faff` | Deep navy inverted header / sidebar surface |
| `--ts-semantic-color-surface-primary-default` | Primary tint | Dark primary | Highlighted info/selected surface |
| `--ts-semantic-color-surface-success-default` | `#e8fff1` | `#133f25` | Positive / Favorable inspection status surface |
| `--ts-semantic-color-surface-warning-default` | `#fffff1` | `#592c12` | Warning / Minor defect / Pending sync surface |
| `--ts-semantic-color-surface-danger-default` | `#fff4f4` | `#5f1b1b` | Error / Rejected / OBD mismatch status surface |

### Interactive Background State Tokens
State suffixes: `default` | `hover` | `active` | `disabled`.
- `--ts-semantic-color-background-base-[default|hover|active|disabled]` (`#ffffff` / `#e8e8e8` / `#d1d1d1` in light)
- `--ts-semantic-color-background-primary-dark-[default|hover|active|disabled]` (`#0b253b` / `#11131d` / `#000000` in light)
- `--ts-semantic-color-background-primary-subtle-[default|hover|active|disabled]` (`#f0f6ff` / `#dcebfe` / `#bedbfe` in light; `#1e3b8a` / `#0046ad` / `#1d4fd7` in dark)
- `--ts-semantic-color-background-success-subtle-[default|hover|active|disabled]` (`#e8fff1` / `#c7ffdc` / `#a8fbc5` in light)
- `--ts-semantic-color-background-warning-subtle-[default|hover|active|disabled]` (`#ffffe3` / `#fff5b3` / `#ffe675` in light)
- `--ts-semantic-color-background-danger-subtle-[default|hover|active|disabled]` (`#ffeaea` / `#ffcece` / `#ffb6b6` in light)
- `--ts-semantic-color-background-neutral-subtle-[default|hover|active|disabled]` (`#f4f4f4` in light)

### Text, Icon & Border State Tokens
State suffixes: `default` | `hover` | `active` | `disabled`.
- **Text**: `--ts-semantic-color-text-[base | primary | success | warning | danger | neutral | inverted]-[state]`
- **Icon**: `--ts-semantic-color-icon-[base | primary | success | warning | danger | neutral | inverted]-[state]`
- **Border**:
  - `--ts-semantic-color-border-base-[state]`
  - `--ts-semantic-color-border-primary-dark-[state]`
  - `--ts-semantic-color-border-primary-subtle-[state]`
  - `--ts-semantic-color-border-success-subtle-[state]`
  - `--ts-semantic-color-border-warning-subtle-[state]`
  - `--ts-semantic-color-border-danger-subtle-[state]`
  - `--ts-semantic-color-border-neutral-subtle-[state]`

---

## 2. Typography Tokens (`TUV SUD Pro`)

Base stack: `font-family: 'TUV SUD Pro', system-ui, sans-serif;`

- **Headlines** (`Bold`, `Bold Italic`, or `Regular` via `-thin-`):
  - `--ts-semantic-typography-headline-100`: `0.75rem / 1rem` (12px)
  - `--ts-semantic-typography-headline-200`: `0.875rem / 1rem` (14px)
  - `--ts-semantic-typography-headline-300`: `1rem / 1.25rem` (16px)
  - `--ts-semantic-typography-headline-400`: `1.125rem / 1.25rem` (18px)
  - `--ts-semantic-typography-headline-500`: `1.25rem / 1.5rem` (20px)
  - `--ts-semantic-typography-headline-600`: `1.75rem / 2rem` (28px)
  - `--ts-semantic-typography-headline-700`: `2rem / 2.25rem` (32px)
  - `--ts-semantic-typography-headline-800`: `2.5rem / 3rem` (40px)
  - `--ts-semantic-typography-headline-900`: `3rem / 3.5rem` (48px)
- **Body** (`Regular` or `-italic-`):
  - `--ts-semantic-typography-body-100`: `0.75rem / 1rem` (12px — ideal for high-density data tables)
  - `--ts-semantic-typography-body-200`: `0.875rem / 1.25rem` (14px — standard enterprise UI text)
  - `--ts-semantic-typography-body-300`: `1rem / 1.5rem` (16px)
- **UI Controls** (`Medium`, `-bold-`, or `-thin-`):
  - `--ts-semantic-typography-ui-100`: `0.75rem / 0.75rem`
  - `--ts-semantic-typography-ui-200`: `0.875rem / 0.875rem`
  - `--ts-semantic-typography-ui-300`: `1rem / 1rem`
  - `--ts-semantic-typography-ui-400`: `1.25rem / 1.25rem`

---

## 3. Spacing, Radius, Z-Index, Transitions & Shadows

### Spacing Scale (`--ts-semantic-size-space-*`)
| Token | Value | px | Token | Value | px |
| :--- | :---: | :---: | :--- | :---: | :---: |
| `space-0` | `0rem` | 0px | `space-600` | `1.25rem` | 20px |
| `space-50` | `0.125rem` | 2px | `space-700` | `1.5rem` | 24px |
| `space-100` | `0.25rem` | 4px | `space-750` | `1.75rem` | 28px |
| `space-200` | `0.375rem` | 6px | `space-800` | `2rem` | 32px |
| `space-300` | `0.5rem` | 8px | `space-900` | `2.5rem` | 40px |
| `space-400` | `0.75rem` | 12px | `space-1000` | `3rem` | 48px |
| `space-450` | `0.875rem` | 14px | `space-1200` | `4rem` | 64px |
| `space-500` | `1rem` | 16px | `space-1600` | `8rem` | 128px |

### Border Radius (`--ts-semantic-size-radius-*`)
`none` (`0`), `xs` (`0.063rem`), `sm` (`0.125rem`), `md` (`0.25rem`), `lg` (`0.375rem`), `xl` (`0.5rem`), `2xl` (`0.625rem`), `3xl` (`0.75rem`), `pill` (`99999px`).

### Shadows, Z-Index & Transitions
- **Shadows**: `--ts-semantic-shadow-focused`, `--ts-semantic-shadow-light-[xs|sm|md|lg]`, `--ts-semantic-shadow-dark-[xs|sm|md|lg]`.
- **Z-Index**: `--ts-semantic-distance-zIndex-[dropdown | drawer | dialog | toast | tootip]`.
- **Transitions**: `--ts-semantic-transition-duration-[xfast (50ms) | fast (150ms) | medium | slow (500ms) | xslow (1000ms)]`.

---

## 4. Modular CSS Utilities (`@tuvsud/design-system/styles/*`)

Import `@tuvsud/design-system/styles/all.css` (or granularly `base.css`, `containers.css`, `grid.css`, `flexbox.css`):
- **Prefix**: Every utility starts with `ts-` (e.g., `ts-container`, `ts-heading-h1`, `ts-flex`, `ts-items-center`, `ts-justify-between`, `ts-grid-cols-3`, `ts-gap-4`).
- **Responsive Infix (`-{bp}-`)**: Unlike Tailwind's `md:` prefix, Algorithm uses an infix breakpoint notation:
  - Breakpoints: `sm` (`576px`), `md` (`768px`), `lg` (`992px`), `xl` (`1200px`), `xxl` (`1400px`).
  - Examples: `ts-grid-cols-1 ts-grid-cols-md-2 ts-grid-cols-xl-4`, `ts-justify-lg-center`.

