# TÜV SÜD Algorithm — Official 84 Components Catalog & Enterprise Mapping

Source: `https://create.tuvsud.com/latest/components/component-overview-RxZWswQY`.

Every component below is available as a Web Component (`<ts-kebab-name>`) or React wrapper (`import { TsPascalName } from '@tuvsud/design-system/react'` or `@tuvsud/design-system/react/<name>`).

---

## 1. Complete Component Inventory (Grouped by Function)

### Navigation & App Shell
- **`TsSidebar` (`<ts-sidebar>`), `TsSidebarGroup`, `TsSidebarItem`**: Primary enterprise left navigation rail (ideal replacement for legacy WinForms MDI `MainMenu`).
- **`TsBreadcrumb` (`<ts-breadcrumb>`), `TsBreadcrumbItem`**: Hierarchical route trail.
- **`TsTabGroup` (`<ts-tab-group>`), `TsTab`, `TsTabPanel`**: Sectioned workspace tabs (e.g., Titular vs. Cliente Facturación, Equipos vs. Archivos vs. Logs).
- **`TsMenu` (`<ts-menu>`), `TsMenuItem`, `TsMenuLabel`, `TsDropdown`**: Context and action menus.
- **`TsTree` (`<ts-tree>`), `TsTreeItem`**: Hierarchical trees (e.g., Manual ITV `Sección -> Bloque -> Defecto -> Subdefecto`).
- **`TsStepper` (`<ts-stepper>`), `TsStep`**: Multi-step wizards (e.g., 2-Phase SMS Campaign preparation -> RGPD review -> confirmation).

### Data Entry, Filters & Specialized Inputs
- **`TsInput` (`<ts-input>`), `TsTextarea`**: Text, search, numeric, and email inputs (`helpText`, `clearable`, `prefix`/`suffix` slots).
- **`TsSelect` (`<ts-select>`), `TsOption`, `TsCombobox` (`<ts-combobox>`)**: Single/multi-select and searchable comboboxes (replaces `clsCbo` including inactive/historical badges).
- **`TsDatepicker` (`<ts-datepicker>`), `TsDateRangePicker` (`<ts-date-range-picker>`), `TsCalendarStatic`, `TsTimePicker`**: Localized date/range pickers. Always set `language="es"` and `locale="es-ES"` (`DD/MM/YYYY`) for Spain (or `ca` / `es-ES` when localized).
- **`TsCheckbox`, `TsSwitch`, `TsRadioGroup`, `TsRadio`, `TsRadioButton`, `TsRangeSlider`**: Boolean and option filters.
- **`TsOtpInput` (`<ts-otp-input>`)**: Digit-by-digit PIN input — **use directly for the 4-digit `PIN_Inspector` management**.
- **`TsIban` (`<ts-iban>`)**: Formatted IBAN input & validator — **replaces legacy `clsCuenta_Banco`**.
- **`TsDropzone` (`<ts-dropzone>`)**: Drag-and-drop file upload — **use for importing Marketing SMS `.xlsx` campaigns and `Citas Previas` `.csv` files**.
- **`TsColorPicker`**: Color input.

### Actions & Buttons
- **`TsButton` (`<ts-button>`), `TsButtonGroup`**: Primary (`variant="primary"`), default, outline, danger, and text actions.
- **`TsIconButton` (`<ts-icon-button>`), `TsCopyButton`**: Compact toolbar/row actions and one-click copy (ideal for copying 17-char VINs or `CodInspeccion`).
- **`TsFloatingButton`, `TsFloatingButtonGroup`, `TsFloatingButtonStack`**: Quick floating actions.
- **`TsLink` (`<ts-link>`)**: Styled semantic links.

### Data Display, Tables & Formatting
- **`TsTable` (`<ts-table>`), `TsPagination` (`<ts-pagination>`)**: Standard Algorithm data tables and page navigation controls. *(For ultra-dense 50k+ row virtualized analytical grids with dynamic column pinning/resizing, pair `TsPagination` + Algorithm `--ts-*` table tokens with headless `TanStack Table v8`)*.
- **`TsCard` (`<ts-card>`), `TsDivider`, `TsSplitPanel`, `TsAccordion`, `TsAccordionItem`, `TsCarousel`**: KPI cards, resizable master-detail panels, and collapsible filter groups.
- **`TsTag` (`<ts-tag>`), `TsBadge` (`<ts-badge>`), `TsAvatar`**: Status pills (*Favorable*, *Desfavorable*, *Negativa*, *SMS Confirmado*, *Estación Online*) and user avatars.
- **`TsQrCode` (`<ts-qr-code>`)**: Built-in client-side QR generator — **use directly for Inspector/Employee `Usuario_Login_Interno` QR badges (`rptEtiqueta` replacement), eliminating `ThoughtWorks.QRCode.dll` and Crystal Reports**.
- **`TsFormatNumber`, `TsFormatDate`, `TsFormatBytes`, `TsRelativeTime`**: Locale-aware formatting (`es-ES` decimal comma `,` and thousands `.` without OS regional crashes).
- **`TsIcon` (`<ts-icon>`)**: Google Material Symbols renderer (`@material-symbols/svg-400`, rounded style default; append `-fill` for filled variant, e.g., `name="home-fill"`).

### Feedback, Overlays & Utilities
- **`TsAlert` (`<ts-alert>`), `TsToast` (`<ts-toast>`)**: Inline alerts and non-blocking toast notifications (replaces blocking WinForms `MsgBox`).
- **`TsDialog` (`<ts-dialog>`), `TsDrawer` (`<ts-drawer>`), `TsPopup`, `TsTooltip`**: Modals, slide-over column/filter drawers, and contextual tooltips.
- **`TsProgressBar`, `TsProgressRing`, `TsSkeleton`, `TsSpinner`**: Async loading indicators for background exports and SMS batch processing.
- **`TsVisuallyHidden`, `TsAnimation`, `TsAnimatedImage`, `TsImageComparer`, `TsMutationObserver`**: Accessibility and layout utilities.
