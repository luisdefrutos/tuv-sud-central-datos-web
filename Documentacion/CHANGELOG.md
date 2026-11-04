# Registro Histórico de Cambios (Changelog)

Todas las modificaciones notables de este proyecto se documentan en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico.

---

## [2.24.0] - 04/11/2026 - *Módulo de Informes de Envíos de Recordatorios (SMS y Email), Conexión Real Oracle Producción y Reactividad Integral*

### 🚀 Implementación Integral del Módulo de Envíos Recordatorios (SMS y Email)
* **Naturaleza 100% de Solo Lectura y Auditoría**:
  * El módulo es estrictamente consultivo sobre los registros históricos de `CENTRALITV.INSPECCION_SMS` y `CENTRALITV.INSPECCION_EMAIL`. No invoca pasarelas externas de mensajería ni servidores SMTP, ni ejecuta `INSERT`/`UPDATE`/`DELETE`.
* **Resolución Definitiva del Acceso a Datos en Oracle Producción (`10.108.206.3:1521` - `orclpr`)**:
  * **Corrección de vinculación de parámetros**: Incorporación obligatoria de `cmd.BindByName = true` en `OracleCommand` para evitar el error `ORA-01008` provocado por la vinculación posicional por defecto en consultas con `UNION ALL`.
  * **Alineación con el catálogo físico real de Oracle**: Corrección del identificador de nombre de estación a `DESESTACION` (en lugar de `NOMBRE_CORTO`), eliminación de columnas inexistentes en `INSPECCION_SMS` / `INSPECCION_EMAIL` e incorporación del `INNER JOIN` con `CENTRALITV.INSPECCION` (`MATRICULA`, `NOMBRE`, `APELLIDOS`, `TELEFONO`, `EMAIL`, `FECHACADUCIDAD`).
  * **Normalización de códigos de sociedad y estaciones**: Mapeo automático de `'TSA'` a `'01'` y `'CAL'` a `'03'` sobre `e.COD_EMPRESA` y soporte dual para códigos de estación con y sin cero a la izquierda (`902` / `0902`).
  * **Verificación de volumen en Producción**: Acceso exitoso a **1.357.813 registros reales** en `INSPECCION_EMAIL` de estaciones como Tres Cantos (2811), Alcobendas (2814), Villalba (2813), Villasante de Montija (0905), Miranda de Ebro (0902) y Belorado (0906), suprimiendo la activación involuntaria del fallback con nombres mock ("ITV Cornellà").
* **Visualización Gráfica Completa (Sin Ranking Truncado) y Terminología Corporativa**:
  * Se eliminó el límite restringido en `InformesEnviosRecordatoriosService.cs` y en el frontend, mostrando **todas las estaciones** con envíos sin truncar en un ranking.
  * Incorporación del componente de barras [`ReportBarChart`](file:///c:/Project/tuv-sud-central-datos-web/src/central-datos-web/src/features/informes/components/ReportBarChart.tsx) con scroll vertical continuo (`.cd-touch-scroll`), diferenciación de sociedad (TSA azul `#0046ad` y CAL verde `#00875a`) y desglose porcentual.
  * Incorporación del componente circular [`ReportDonutChart`](file:///c:/Project/tuv-sud-central-datos-web/src/central-datos-web/src/features/informes/components/ReportDonutChart.tsx) para análisis de cuotas por **Plantilla de Recordatorio** y por **Canal de Notificación** (SMS vs Email).
  * Eliminación total de la palabra informal "donut/donuts" en la interfaz de usuario, utilizando exclusivamente las etiquetas corporativas: **"Dividida (Barras + Circular)"**, **"Todas las Estaciones (Barras con Scroll)"**, **"Circular por Plantilla"** y **"Circular por Canal"**.
* **Reactividad Completa de Filtros (Estaciones, Sociedad, Canal y Plantilla)**:
  * Sincronización bidireccional en `useEnviosRecordatoriosReport.ts` mediante `onFetchReport` y `autoFetchOnFilterChange: true` con debounce automático de 250ms: al marcar, desmarcar o filtrar estaciones o sociedad, se actualizan de forma inmediata los 4 KPIs ejecutivos, los gráficos de barras y circulares, los contadores de pestañas y el grid paginado de datos.
* **Resolución Definitiva del Bug Histórico de la App de Escritorio (`frmCriterios.vb`)**:
  * En la aplicación de escritorio (`frmCriterios.vb:2355`), la exportación de SMS fallaba y no generaba datos debido a una condición duplicada errónea (`If bMail Then` evaluada dos veces en lugar de `If bSMS Then`), y `cmdMostrarPantalla.Visible = False` impedía previsualizar en pantalla.
  * En Central Datos Web se ha implementado la segregación correcta e independiente para SMS y Email, ofreciendo tanto visualización analítica completa en pantalla como exportación multi-hoja a Excel.
* **Backend .NET 10 (Clean Architecture & Minimal APIs)**:
  * **DTOs Especializados (`EnviosRecordatoriosDtos.cs`)**: `FiltrosEnviosRecordatoriosRequestDto`, `FilaResumenEnviosRecordatoriosDto`, `FilaDetalleEnviosRecordatoriosDto`, `KpiEnviosRecordatoriosDto`, `PlantillaRecordatorioCatalogoDto`, `PuntoGraficoEnviosDto` e `InformeEnviosRecordatoriosResponseDto`.
  * **Servicio de Aplicación (`InformesEnviosRecordatoriosService.cs`)**: Cálculo en memoria de KPIs consolidados y generador de libro Excel ClosedXML con 3 pestañas corporativas (`RESUMEN_GLOBAL`, `ENVIOS_SMS` y `ENVIOS_EMAIL`).
  * **Endpoints REST Minimal API (`InformesEndpoints.cs`)**: `GET /api/v1/informes/envios-recordatorios/plantillas`, `POST /api/v1/informes/envios-recordatorios/consultar` y `POST /api/v1/informes/envios-recordatorios/exportar-excel`.
* **Frontend React 19 & TÜV SÜD Algorithm Design System**:
  * **Vista Unificada (`EnviosRecordatoriosReportPage.tsx`)**: Selector de vista segmentada (**"Resumen Totales"** vs **"Destinatarios Enviados"**), 4 tarjetas de KPIs corporativas (`ReportKpiCard`) con iconos oficiales vectoriales `<TsIcon>` (`sms`, `chat`, `mail`, `description`), tabla analítica `.cd-data-table` con ordenación y búsqueda, y modal de ficha individual del envío.
* **Restauración Visual del Navbar Desktop y Documentación MCP Oracle**:
  * Reincorporación de la pestaña "Inicio" con icono corporativo en `Navbar.tsx` y blindaje de las reglas CSS en `responsive.css` (`.cd-nav-mobile-bar { display: none !important }` y `.cd-nav-container-desktop { display: flex !important }`).
  * Creación de la guía técnica `27_guia_creacion_y_configuracion_mcp_oracle.md` documentando el servidor MCP de Oracle `central-datos-db`.

---

## [2.23.0] - 04/11/2026 - *Migración Integral a Iconos Oficiales TÜV SÜD Algorithm Design System y Preservación Estricta de Estética*

### 🎨 Adopción Integral de Iconos Oficiales TÜV SÜD Algorithm Design System (`@tuvsud/design-system`)
* **Eliminación Total y Exhaustiva de Emojis Unicode (187 ocurrencias migradas a 0)**:
  * Sustitución en todos los componentes globales: `Navbar.tsx` (menú burger y cierre), `Header.tsx` (avatar y perfil de usuario), `ErrorBoundary.tsx` (aviso de excepción, reintentar y volver al inicio), `LoginPage.tsx` (descarga de logs diagnósticos) y `App.tsx` (tarjetas de módulos, indicadores y estados).
  * Sustitución en los 8 informes core y 12 páginas de reporte: botones de acción (`Consultar`, `Exportar a Excel`, `Imprimir`, `Actualizar`, `Ver Ficha`), selectores de pestañas (`Barras`, `Donut`, `Ranking`, `Top Clientes`, `Por Estación`, `Por Tipo de Vehículo`), inputs buscadores con lupa y borrado, banners de alerta (`warning`, `cancel`, `info`, `lightbulb`) y tablas agregadas MINER (`check`, `close`).
  * Desacoplamiento de tarjetas KPI ejecutivas en `ReportKpiCard.tsx`: renderizado dinámico vectorial con `<TsIcon>` y mapeador centralizado de tokens, **preservando al 100% los colores de texto y borde originales de cada variante** (naranja `#d97706` en warning, rojo `#dc2626` en danger, verde `#059669` en success, azul `#0046ad` en primary y azul marino `#0b253b` en neutral), así como los estilos corporativos de las insignias (badges) y subtítulos.
  * Migración de catálogos y menús en `navigation.constants.ts`, `InformesHubPage.tsx` y hooks de informes.
* **Preservación Rigurosa de Estética Corporativa TÜV SÜD y Resolución Visual**:
  * **Barra de Navegación (`Navbar.tsx` & `responsive.css`)**: Restauración total de los estilos corporativos de menú tipo Windows Forms (`.cd-menubar`, `.cd-menubar-title`, `.cd-nav-container-desktop`, desplegables hover-switch y versión móvil), solucionando cualquier desmaquetación.
  * **Dimensionamiento Nativo de Iconos (`size` prop)**: Configuración de la propiedad oficial `size={32}` y `size={36}` en tarjetas de módulos de `App.tsx`, `size={28}` en cabeceras de informes (`ReportPageHeader.tsx`), `size={26}` en catálogo de informes (`InformesHubPage.tsx`) y `size={18}` en KPI cards, eliminando problemas de iconos colapsados o diminutos.
  * **Soporte Local y Dev Server (`public/icons/`)**: Distribución directa de los 53 SVGs oficiales en `public/icons/material-symbols/rounded/` garantizando resolución inmediata `200 OK` en Vite dev (`localhost:5173`) sin depender del bundling de producción.
  * **Modales**: Restauradas al 100% las cabeceras corporativas azul marino (`#003366`), textos en blanco, tarjetas con bordes `#e2e8f0` y botones de cierre con `<TsIcon name="close" />`.
  * **Botones**: Respetadas estrictamente las variantes nativas (`primary`, `secondary`, `success`) con icono inyectado vía `slot="prefix"`, manteniendo los botones verdes de exportación a Excel, azules de acción principal y grises de soporte.
  * **Grids y Tablas**: Homologación exhaustiva con `.cd-data-table`, `.cd-table` y `.ts-table`, garantizando el hover reactivo corporativo `var(--ts-semantic-color-background-primary-subtle-hover, #edf5ff) !important` en cada fila de datos de toda la aplicación, sin contaminar tarjetas u otros contenedores.
* **Integración del Plugin de Vite (`designSystemIconsVitePlugin`)**:
  * Configuración de extracción y minificación de 53 iconos vectoriales oficiales Rounded de `@material-symbols/svg-400`.
  * Emisión en `dist/icons/material-symbols/rounded/` (<0.5 KB gzipped por icono) sin dependencias ni llamadas CDN externas.
  * Registro global en `main.tsx` vía `registerGoogleMaterial()`.
* **Guía de Despliegue en Servidor**:
  * Documentada la configuración obligatoria para Microsoft IIS (`web.config` con MIME types `.svg` y `.woff2`), Nginx y despliegues bajo subdirectorio virtual.

### 📋 Hoja de Ruta e Informes Pendientes
* **Documentación Técnica Creada**:
  * `25_guia_despliegue_servidor_iconos_y_plan_informes_sms_mail.md`: Arquitectura del informe operativo de Envíos Recordatorios SMS/Email (`Envios_Sms_Mail`), consultas SQL sobre `INSPECCION_SMS` e `INSPECCION_EMAIL`, tablas de plantillas y propuesta de diseño con Algorithm DS.
  * Actualización del índice maestro `00_INDICE_DOCUMENTACION_MODERNIZACION.md`.

---

## [2.22.1] - 04/11/2026 - *Refinamiento Visual UX/UI Informe Clientes Volumen (C8), Unificación Buscador y Estabilidad de Grid*

### 🎨 Refinamiento de Usabilidad y Estándar Visual (TÜV SÜD Algorithm DS)
* **Unificación de Buscador Global (`ReportTableContainer.tsx` & `responsive.css`)**:
  * Implementación de un input de búsqueda corporativo con mayor contraste y legibilidad (`#64748b`, `opacity: 1`), icono de lupa `🔍` y botón de borrado inmediato `✕`.
  * Homologación uniforme para todos los informes del sistema.
* **Corrección de Gráfica Analítica (`ReportBarChart.tsx`)**:
  * Eliminación del doble scrollbar vertical innecesario.
  * Leyenda corporativa condicional (*Azul: ATISAE / Verde: CAL*): se oculta en la vista **"Top Clientes"** y se activa exclusivamente en **"Por Estación"**.
  * Corrección tipográfica de espaciado en la insignia de conteo (`30 estaciones` / `10 clientes`).
* **Optimización de Grid y Desacoplamiento de KPIs (`ClientesVolumenReportPage.tsx` & `useClientesVolumenReport.ts`)**:
  * Tarjetas KPI ejecutivas convertidas en métricas informativas limpias (sin filtrados cruzados ni saltos de scroll confusos).
  * Eliminación de enlaces y subrayados en celdas del grid (`cifTitular` a texto plano), respondiendo al criterio funcional del usuario.
  * Estructura de anchos mínimos de tabla (`1740px`), padding amplio (`10px 12px`) y `whiteSpace: nowrap` en todas las cabeceras y celdas, previniendo saltos de línea ("Teléfono \n 2") y truncados de texto ("Resultad...").
  * **Búsqueda Numérica en Grid**: Soporte para buscar directamente números de inspecciones (ej. "30") para filtrar de inmediato clientes que acumulen ese volumen.
  * **Control de Límite Mínimo de Inspecciones Validado**: Campo numérico con validación estricta (`>= 1`, normalización a 1 en caso de error, emulando `frmCriterios.vb`), filtros rápidos por presets (`Todos`, `>= 5`, `>= 10`, `>= 20`), banner explicativo visual en el panel y auto-actualización reactiva debounced (250 ms) de los 4 KPIs ejecutivos, gráficas y grid con la cláusula `HAVING COUNT(*) >= :LimiteCuenta`.
  * **Fila de Totales Filtrados (`<tfoot>`) y Hover Homologado**: Fila sticky al pie del grid que suma las inspecciones reales filtradas, resolviendo la discrepancia visual entre número de líneas (ej. 12 registros de desglose) y el volumen acumulado (30 inspecciones en el KPI). Clase `.cd-data-table` con hover `#edf5ff` homologado con toda la suite.
  * **Ampliación del Buscador**: Ancho del contenedor del buscador ampliado a `580px` para visualizar íntegramente el texto del placeholder sin cortes.

---

## [2.22.0] - 04/11/2026 - *Nuevo Módulo Clientes por Volumen de Inspecciones (C8) y Cierre del Bloque de Informes Excel de Fase 2*

### 👥 Nuevo Módulo Vertical: Clientes por Volumen de Inspecciones (`clientes-volumen`)
* **Migración Oficial de `frmCriterios.vb` (`ExportacionClientesVolumenInspecciones` / `Cargar_Dataset_Exportacion_ClientesVolumen`) (Informe C8)**:
  * Implementación vertical completa (.NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Hito de Proyecto**: Cierre definitivo de los 8 nuevos informes de la Etapa C planificados en `13_plan_siguientes_pasos_informes.md`.
  * Análisis de fidelización de grandes cuentas, flotas de transporte y profesionales con mayor concurrencia en la red ITV.
  * Diferenciación de **CIF Titular** (`CIFFACTURA`) y **CIF Factura** (`CIFFACTURAT`) para identificar flotas gestionadas por operadores o empresas de renting.
  * Filtro opcional por **Proyectos Comerciales** activos (`CENTRALITV.PROYECTOS_COMERCIALES` / `CENTRALITV.PROYECTOS_CLIENTES`) y por las 9 categorías reglamentarias **MINER** (`MO`, `TP`, `TR`, `MP`, `MG`, `AU`, `RS`, `AG`, `OT`).
* **Optimización Extrema de Base de Datos Oracle 19c**:
  * **0 Llamadas PL/SQL**: Sustitución de `CENTRALITV.PERIODICA(...) = 'S'` por `INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s ON s.CodSepiva = i.CodSepiva AND s.CodEstacion = i.CodEstacion AND s.CodServicio = '01'`, eliminando el cuello de botella de cambios de contexto.
  * **Eliminación del Popup Modal `InputBox`**: Sustitución del diálogo bloqueante de VB.NET por un selector numérico reactivo (`Mín. Inspecciones: 5`, `10`, `20`) en la barra de filtros de usuario.
  * **Consulta Unificada vs. Bucle $N$**: Ejecución de 1 sola consulta SQL parametrizada con *bind variables* (`:FechaInicio`, `:FechaFin`, `:LimiteCuenta`) para toda la red de estaciones, reduciendo los roundtrips a base de datos de 30 a 1.
* **Backend y Exportación Oficial ClosedXML (.NET 10)**:
  * Repositorio `OracleInformesRepository.ClientesVolumen.cs` con reintento ante desconexión ORA-12570 y timeout de 120s.
  * Servicio `InformesClientesVolumenService.cs` con cálculo de KPIs ejecutivos, rankings y exportación oficial a Excel.
  * Libro Excel multi-pestaña con hoja `TOTAL_CLIENTES_CONSOLIDADO` y hojas individuales por estación `CLIENTES_VOLUMEN_{CodEstacion}` con sumatorios numéricos directos (sin fórmulas de texto propensas a errores de localización).
  * Endpoint protegido con limitador de concurrencia `excel-export-policy` (HTTP 429 ante saturación).
* **Frontend y Experiencia de Usuario (React 19 + TÜV SÜD Algorithm DS)**:
  * Página `ClientesVolumenReportPage.tsx` con 4 KPIs ejecutivos interactivos (*Clientes con Flota*, *Inspecciones Totales*, *Cliente Mayor Demanda*, *Aprobados en Flotas*).
  * Selector gráfico dual: *Top 10 Clientes por Volumen* y *Distribución por Estación* con colores corporativos (Azul `#0046ad` TSA y Verde `#00875a` CAL).
  * Grid paginado con `ReportPaginationBar`, buscador en memoria, ordenación en todas las columnas y hover corporativo `#edf5ff`.
  * Sincronización en URL (`#/modulo/clientes-volumen`) y persistencia F5 en `sessionStorage`.

---

## [2.21.1] - 04/11/2026 — *Refinamiento UX Volumen de Defectos (C7), Paginación, Scroll de Estaciones, Corrección ORA-00979 y Homologación de KPIs*

### 🛠️ Correcciones de Base de Datos Oracle 19c
* **Resolución de ORA-00979 (`no es una expresión GROUP BY`)**:
  * Sustitución en `ObtenerInformeVclDefectos.sql` de funciones escalares desacopladas por agregaciones deterministas `MAX(e.DesEstacion)`, `MAX(TRIM(e.Cod_Empresa))` y `MAX(sub.Descripcion)`.
  * Reducción de la cláusula `GROUP BY` exclusivamente a las claves dimensionales de negocio (`CodEstacion`, `GrupoCategoria`, `Bloque`, `Defecto`, `Subdefecto`, `Gravedad`), optimizando la memoria en el *Shared Pool* mediante *Hash Group By*.
* **Resolución de ORA-00904 (`"D"."CODSECCION": identificador no válido`)**:
  * Ajuste del `INNER JOIN` con `CENTRALITV.INSPECCION_DEFECTOS` para omitir `CodSeccion`, vinculando de manera estricta por `CodEstacion` y `CodInspeccion`.

### 🎨 Experiencia de Usuario, Paginación y Visualización Gráfica (React 19)
* **Barra de Paginación y Scroll Vertical en Tabla**:
  * Integración oficial del componente `ReportPaginationBar` con selector dinámico de tamaño de página (**50, 100, 200, 500 y 1.000 registros**) y navegación entre páginas.
  * Contenedor con scroll vertical continuo (`maxHeight: 620px`) y cabecera de tabla fija (`sticky`, `top: 0`, `zIndex: 3`), permitiendo recorrer los **542 defectos tipificados** de forma fluida.
* **Gráfico de Barras de Estaciones y Eliminación de Naranja Discordante**:
  * Gráfico de barras horizontales conectado al ranking de estaciones con representación de la totalidad de estaciones seleccionadas (las 30 estaciones oficiales de la red ITV).
  * Colores oficiales por sociedad alineados 100% con la leyenda: **Azul corporativo (`#0046ad`)** para TÜV SÜD ATISAE y **Verde corporativo (`#00875a`)** para TÜV SÜD CAL.
  * Scroll vertical continuo (`maxHeight: 360px`, `scrollbar-color: #0046ad #f1f5f9`) y badge dinámico de estaciones consultadas.
* **Homologación de Clics en KPIs y Buscador Inteligente**:
  * **Total Defectos Detectados**: Limpia los filtros y resetea la tabla al estado inicial.
  * **Defectos con Rechazo (G + MG)**: Filtra exclusivamente defectos con gravedad `G` o `MG` mediante la clave `'Rechazo'`, evitando que la búsqueda coincida con letras 'g' sueltas dentro de palabras de descripciones.
  * **Categoría de Vehículo Líder**: Filtra por el código oficial (`M1`), con soporte bidireccional en el buscador de texto (*turismos*, *m1*, *camiones*...).
  * **Defecto Más Frecuente**: Filtra directamente por el código tipificado del defecto (`12.02.01`).
* **Tooltips Descriptivos (`AppTooltip`)**:
  * Incorporación de tooltips explicativos en los badges de `Grupo Cat.` (definición completa del vehículo), `Cód. Defecto` (desglose bloque.defecto.subdefecto) y `Gravedad` (con o sin rechazo reglamentario ITV).

### 📊 Exportación Oficial a Excel (.NET 10 + ClosedXML)
* **Pestaña Consolidada `TOTAL_ESTACIONES_SELECCIONADAS`**:
  * Ajuste del nombre a 30 caracteres (dentro del límite de 31 de Excel).
  * Vuelco íntegro de las 542 filas con la columna `Estación`, configurado como Dataset Maestro apto para la generación de tablas dinámicas.
* **Pestañas Individuales por Estación (`VOLUMEN_DEFECTOS_{CodEstacion}`)**:
  * Estructura 1:1 fiel a la app de escritorio `frmCriterios.vb`.

---

## [2.21.0] - 03/11/2026 — *Nuevo Módulo Volumen de Defectos Detectados (C7), Optimización Relacional 0 PL/SQL y Combos en Cascada*

### ⚠️ Nuevo Módulo Vertical: Volumen de Defectos Detectados (`volumen-defectos` / `defectologia-volumen`)
* **Migración Oficial de `frmCriterios.vb` (`ExportacionVolumenDefectosDetectados` / `Cargar_Dataset_Exportacion_VolumenDefectos`) (Informe C7)**:
  * Implementación vertical completa (.NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * Análisis de frecuencia, tipología y severidad de defectos en primeras inspecciones periódicas (`Periodica = 'S'`, `Indica12 = '1'`, `Anulada = 0`).
  * Desglose en 7 grupos de vehículos homologados: Turismos (`M1`), Autobuses (`M2/M3`), Comerciales (`N1`), Camiones (`N2/N3`), Remolques (`O3/O4`), Ciclomotores (`L1`) y Motocicletas (`L3`).
* **Optimización Extrema de Base de Datos Oracle 19c**:
  * **Eliminación de PL/SQL Escalar**: Sustitución de `CENTRALITV.Periodica(...) = 'S'` por `INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s ON s.CodSepiva = i.CodSepiva AND s.CodEstacion = i.CodEstacion AND s.CodServicio = '01'`, reduciendo el consumo de CPU en más de un 90% y eliminando millones de *context switches*.
  * **Consulta Unificada vs. Bucle $N$**: Ejecución de 1 sola consulta SQL parametrizada en vez de $N$ ejecuciones secuenciales por cada estación seleccionada en el cliente.
  * **Join Eficiente a Catálogos**: Cruce optimizado con `CENTRALITV.DEFECTOSSUB_SECCION` con descripciones oficiales en español (`CodIdioma = 'ESP'`).
* **Backend y Exportación Excel Oficial (.NET 10)**:
  * Consulta externalizada `ObtenerInformeVclDefectos.sql` con *bind variables* y catálogos de `Bloques` y `Elementos`.
  * Repositorio `OracleInformesRepository.VolumenDefectos.cs` y servicio `InformesVolumenDefectosService.cs`.
  * Generador ClosedXML con pestaña `TOTAL_DEFECTOS_CONSOLIDADO` y hojas individuales por estación `VOLUMEN_DEFECTOS_{CodEstacion}` con sumatorios numéricos directos (sin fórmulas `=SUM(...)`).
* **Frontend y Experiencia de Usuario (React 19 + TÜV SÜD Algorithm DS)**:
  * Componente `VolumenDefectosReportPage.tsx` con 4 KPIs ejecutivos dinámicos (`Total Defectos`, `Defectos con Rechazo G+MG`, `Categoría Líder`, `Defecto Top`).
  * Combos en cascada dinámicos: Selector de `Bloque` y `Elemento/Defecto` con carga reactiva y soporte para `-- Todos --`.
  * Visualización gráfica dual conmutable: Ranking Top Defectos (Barras con scroll y color por gravedad: Rojo para MG, Ámbar para G, Azul para L) y Gráfico Donut de reparto por categoría vehicular.
  * Grid paginado con buscador interactivo, ordenación por columnas y badges semánticos de gravedad (`TsBadge`).
  * Enlace y persistencia F5: Sincronización en URL (`#/modulo/defectologia-volumen`) y `sessionStorage`, tarjeta disponible en `InformesHubPage.tsx`.

---

## [2.20.0] - 03/11/2026 — *Nuevo Módulo Inspecciones por Rango Horario (C6), Matriz Térmica Heatmap y Generación con Ollama Local*

### ⏰ Nuevo Módulo Vertical: Inspecciones por Rango Horario (`inspecciones-rango-horario`)
* **Migración Oficial de `frmCriterios.vb` (`ExportacionInspeccionesRangoHorario` / `Cargar_Dataset_Exportacion_InspRangoHorario`) (Informe C6)**:
  * Implementación vertical completa (.NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * Código base de DTOs y mapeos C# generado con el modelo local de Ollama `qwen-antigravity:latest`.
  * Análisis de la distribución de carga de trabajo por franja horaria (06:00 a 21:00 h) y por día de la semana.
  * Selector opcional de fase de inspección (Todas, 1ª Inspección Periódica, 2ª Inspección Reiterada).
* **Backend y Acceso a Datos Oracle (.NET 10)**:
  * Archivo SQL `ObtenerInformeInspRangoHorario.sql` con operador `PIVOT` de Oracle sobre franjas de 06 a 21 h y filtrado dinámico por estación/empresa/fase.
  * Repositorio `OracleInformesRepository.InspRangoHorario.cs` con binding directo por nombre y reintento ante desconexión transitoria ORA-12570.
  * **Corrección de ORA-00904 y Filtro 'TODAS'**: Diagnóstico asistido por modelo local Ollama (`qwen-antigravity`). Corrección de la subconsulta de estaciones para omitir `Cod_Empresa` cuando el filtro es `"TODAS"` (evitando que la consulta devolviese 0 filas en Web) y mapeo automático `"TSA" -> "01"`, `"CAL" -> "03"`.
  * **Corrección de Fórmulas Excel (`#¿NOMBRE?`)**: Sustitución de cadenas de fórmula en inglés (`=SUM(...)`) por inyección de valores calculados nativos numéricos en celdas de total de fila y columna, asegurando compatibilidad 100% en todas las versiones e idiomas de Microsoft Excel.
  * Servicio `InformesInspRangoHorarioService.cs` con cálculo de KPIs ejecutivos, agregación de matriz Heatmap y generación de libro Excel multi-pestaña (`TOTAL_ESTACIONES_SELECCIONADAS` y hojas individuales `INSPECCIONES_ITV_{codEstacion}`).
* **Frontend y Experiencia de Usuario (React 19 + TÜV SÜD Algorithm DS)**:
  * Componente `ReportHeatmapChart.tsx`: Matriz interactiva de 6 días × 16 horas con escala de calor corporativa de 5 niveles y tooltips detallados `AppTooltip`.
  * **Selector Gráfico Condicional y Gráficos por Estación**: Píldoras conmutables `[ 📅 Matriz Térmica Horaria ]` | `[ 📊 Distribución por Estaciones ]` con soporte dual para `ReportBarChart` y `ReportDonutChart`, scroll vertical continuo visible, badge de conteo de estaciones analizadas y coloreado estricto por sociedad (Azul para ATISAE y Verde corporativo `#00875a` para CAL).
  * **Highlight Visual de Columna Horaria de Alto Contraste**: Al filtrar u ordenar por una franja (ej. `10h`), tanto el botón en el Heatmap como la cabecera y columna completa del grid de datos se resaltan de manera inequívoca en azul eléctrico (`#0284c7`) con realce superior y celdas en fondo cielo (`#e0f2fe`) con bordes de 2px, asegurando diferenciación visual instantánea.
  * **Asignación de Color por Sociedad (TSA vs CAL)**: Integración de la clave de sociedad para que estaciones pertenecientes a TÜV SÜD CAL (Miranda `0902`, Villasante `0905`, Belorado `0906`, Briviesca `0908`) se representen en verde corporativo (`#00875a`), mientras que el resto de estaciones de la red (Madrid, Toledo, Cataluña 0826/4308/2511, La Rioja 2605/2607) se muestran en azul (`#0046ad`) al pertenecer formalmente a TÜV SÜD ATISAE.
  * **KPI Dinámico de Estación Líder**: Indicador ejecutivo `Estación Mayor Demanda` que se activa al consultar múltiples estaciones, con filtrado suave hacia el grid al hacer clic.
  * **Búsqueda Avanzada por Franjas Horarias**: Reconocimiento de sintaxis horaria (`10h`, `10:00`, `h10`, `Martes 10h`, `10h > 5`), permitiendo aislar jornadas con actividad en horas específicas.
  * **Columnas Horarias Ordenables**: Las 16 columnas horarias (`06h` a `21h`) admiten ordenación ascendente y descendente al hacer clic en sus cabeceras.
  * **Unificación de Búsqueda por Fechas (Enter / Consultar)**: Aplicación estricta de la regla de informes: la carga inicial se ejecuta con fechas por defecto, pero los cambios posteriores en los selectores de fecha no disparan peticiones automáticas, requiriendo pulsar `Intro` o el botón `🔍 Consultar`.
  * Página `InspRangoHorarioReportPage.tsx`: 4 KPIs ejecutivos con filtrado reactivo hacia el buscador del grid (`filtrarPorValor`), selector de fase, grid paginado con franjas horarias y totales de jornada.
  * Ruta y navegación: Registrado en `navigation.constants.ts` y enrutamiento en `App.tsx` con persistencia F5 en `sessionStorage`.

---

## [2.19.0] - 03/11/2026 — *Nuevo Módulo Bastidores OBD No Coincidentes, Control Antifraude, AppTooltip Unificado y Experiencia Reactiva 100% Responsiva*

### 🔌 Nuevo Módulo Vertical: Bastidores OBD No Coincidentes (`control-obd-no-coincidentes`)
* **Migración Oficial de `frmCriterios.vb` (`Informe_Bastidores_OBD_No_Coincidentes`) y `frmGridBastidoresOBD.vb` (Informe C5)**:
  * Implementación vertical completa (.NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * Control de calidad y antifraude técnico en ITV: identifica discrepancias entre el bastidor de la ficha técnica / documental (`I.NUMBASTIDOR`) y el bastidor electrónico extraído por el escáner OBD de la centralita (`OBD.NUMBASTIDOR_OBD`).
  * Aplicación estricta de las 4 reglas oficiales de filtrado de ruido electrónico (longitud 17, exclusión de caracteres especiales `[-¿?\/<>]`, exclusión de secuencias monótonas repetidas y descarte de errores EEPROM `EEPR READ ERR`).
* **Backend y Acceso a Datos Oracle**:
  * Archivo de consulta parametrizado `ObtenerInformeBastidoresObdNoCoincidentes.sql` optimizado con `INNER JOIN` directo sobre clave primaria compuesta `(CODESTACION, CODINSPECCION)`.
  * Repositorio `OracleInformesRepository.BastidoresObd.cs` con reintento ante desconexión transitoria y timeout de 120 s.
  * Servicio `InformesBastidoresObdService.cs` con agrupación por estación y categoría, cálculo de KPIs y generación Excel multi-hoja (`BASTIDORES_OBD`).
* **Frontend, UX y Diseño Responsivo (React 19 + TÜV SÜD Algorithm DS)**:
  * **Unificación de Tooltips Corporativos (`AppTooltip`)**: Sustitución sistemática del atributo nativo `title` del navegador por el componente oficial `AppTooltip` en KPIs, celdas de tabla y caja de búsqueda.
  * **Navegación Interactiva al Buscador del Grid**: Al hacer clic sobre cualquier KPI interactivo (ej. *Equipo OBD con Más Casos*, *Estación Máxima*) o sobre celdas de bastidor/matrícula, la pantalla realiza un desplazamiento suave (`scrollIntoView`) hasta el buscador del grid, inyecta el valor, aplica un halo visual azul de foco (`box-shadow`) durante 1.5s y sitúa el cursor.
  * **Tooltip Contextual del Filtro**: Mensaje dinámico en `ReportTableContainer.tsx` indicando el filtro activo y cómo limpiarlo para mostrar todos los datos.
  * **Diseño 100% Responsivo**: Layout fluido con `clamp()`, KPIs en `grid auto-fit`, tabla con scroll horizontal táctil (`.cd-touch-scroll`) con primera columna fija (`sticky left: 0`), y modal de comparativa carácter a carácter con ancho y alto adaptativo (`min(720px, 94vw)` y `max-height: 90vh`).
  * **Corrección de Renderizado Duplicado (`App.tsx`)**: Exclusión de la ruta `control-obd-no-coincidentes` del contenedor dummy de módulos pendientes para evitar pantallas montadas simultáneamente.

---

## [2.18.0] - 03/11/2026 — *Nuevo Módulo Estadística MINER Global, Optimización SQL Relacional Pura y Estabilización de Rendimiento*

### 📊 Nuevo Módulo Vertical: Estadística MINER Global (`miner-datos-globales`)
* **Migración Oficial de frmCriterios.vb (ExportacionEstadistica_MINER_Global) e Inyección en Plantilla Ministerial**:
  * Implementación vertical completa (.NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * Réplica visual exacta de la hoja ministerial PERIODICAS con matriz cruzada de 20 filas de defectos (11L a 20G) y 9 categorías vehiculares reglamentarias (MO, TP, TR, MP, MG, AU, RS, AG, OT), además del balance de primera y segunda inspección.
  * Inyección fidedigna en plantilla ministerial oficial Plantilla_Industria_MINER.xlsx preservando todas las fórmulas y sumatorios de celda oficiales.

### ⚡ Optimización SQL Relacional Pura & Eliminación de Cuellos de Botella
* **Sustitución de Funciones PL/SQL por Relacional Puro**:
  * Reemplazo de CENTRALITV.PERIODICA y CENTRALITV.CLASIFICACION_MINER evaluadas fila a fila por INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION y doble LEFT JOIN CENTRALITV.tipovehiculo_ident.
* **Unificación de Inspecciones Fase 1 y Fase 2 (ObtenerMinerInspecciones.sql)**:
  * Se fusionaron las dos consultas separadas de balance en una sola con indica12 IN ('1', '2') y agrupación dual, ahorrando un escaneo de la tabla masiva INSPECCION y reduciendo el tiempo de obtención de fases a ~440 ms.
* **Eliminación de Full Table Scan en Defectos con Hint USE_NL (ObtenerMinerDefectos.sql)**:
  * Inclusión del hint `/*+ LEADING(i s d) INDEX(i P17_INSPECCION P31_INSPECCION) USE_NL(d) INDEX(d IX1_INSPECCION_DEFECTOS) */`, evitando el escaneo completo de los 50M de registros de INSPECCION_DEFECTOS y reduciendo el tiempo de 2 meses a ~13,4 s.
* **Resolución de Error de Host Remoto (IOException / Desconexión Socket)**:
  * Ejecución secuencial controlada (primero balance de inspecciones y después matriz de defectos) para evitar saturación de memoria PGA y sockets concurrentes en el servidor Oracle dedicado.
  * Formateo estricto VARCHAR2('0202', '2878') en filtro de estaciones para preservar índices sin conversiones implícitas a NUMBER.
  * Ampliación del timeout de consulta a 300 segundos (CommandTimeout = 300).

### 🎨 Mejoras UX/UI & Tipografía
* **Corrección de Espaciado Tipográfico en Encabezados**:
  * Títulos de sección FRECUENCIA DE DEFECTOS y BALANCE DE INSPECCIONES Y VEHÍCULOS (FASE 1 Y 2) con espaciado natural de palabras y letter-spacing: 1.2px controlado por CSS.
* **Comportamiento Óptimo de Búsqueda**:
  * Consulta inicial automática al entrar con las fechas por defecto del mes actual.
  * Desacoplamiento del evento de búsqueda en los inputs de fecha (la consulta solo se dispara al pulsar explícitamente Consultar).

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Triple Footer, Identidad de Sociedad y Corrección Bug Legacy*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (.NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a **0,00 €** y **0** inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 vs Periodo 2) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas con comparativas y variaciones porcentuales.
    * Resumen dinámico por Sociedad (TSA / CAL / TOTAL RED) cuadrando al céntimo con el libro Excel.
    * **Triple Fila en Pie de Tabla (`<tfoot>`)**: Subtotal TSA, Subtotal CAL y Total Red Global con cálculo reactivo dinámico.
    * Gráfico comparativo continuo (#1, #2, #3...) de ancho completo con identidad de color corporativo permanente (Azul TSA, Verde CAL) y números negativos en rojo suave.
    * Tabla detallada con paginador homogéneo (`ReportPaginationBar`).

---

## [2.16.0] - 03/11/2026 — *Nuevo Módulo Inspecciones con Cupón Descuento & Estabilización de Inspecciones sin Inspector*

### 🎟️ Nuevo Módulo Vertical: Informe de Inspecciones con Cupón Descuento (`cupon-descuento`)
* **Migración Oficial de `frmCriterios.vb` (`Inspecciones_Con_Cupon_Descuento`)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, React 19 con TÜV SÜD Algorithm DS).
  * **Consulta SQL Indexada de Ultra Alto Rendimiento (`ObtenerInformeCuponDescuento.sql`)**:
    * Optimización con `LEFT JOIN CENTRALITV.CUPONES c ON i.CODCUPON = c.CODCUPON` sin envoltorios `TRIM` en las claves indexadas, permitiendo el uso inmediato del índice.
    * Hint `/*+ INDEX(i P17_INSPECCION P31_INSPECCION) */`.
    * **Benchmark Verificado**: **165 ms** para consulta por estación individual y **3,89 s** para 1 mes completo en toda la red de 30 estaciones (10.968 inspecciones con cupón).
  * **Exportación Oficial a Excel Multi-pestaña**:
    * Generación de libro Excel mediante `ClosedXML` particionado por estación (`CUPONES_DTO_ITV_{CodEstacion}`), idéntico al generado por la aplicación de escritorio legacy.
    * Protegido por limitador de concurrencia `excel-export-policy` (RateLimiter) para garantizar la estabilidad del servidor ante descargas masivas.
  * **Frontend Estandarizado (`CuponDescuentoReportPage.tsx`)**:
    * 4 Tarjetas KPI financieras (`Inspecciones con Cupón`, `Total Descuento Aplicado`, `Importe Abonado en Caja`, `Campaña Más Utilizada`).
    * Selector dual de gráficos interactivos: Ranking por estación en barras (`ReportBarChart`) y distribución de promociones en gráfico circular (`ReportDonutChart`).
    * Grid de 9 columnas con búsqueda en memoria, ordenación global previa a paginación y modal de ficha técnica.

### 📄 Paginación Homogénea en Todos los Informes (`ReportPaginationBar`)
* **Componente Oficial Reutilizable (`ReportPaginationBar.tsx`)**:
  * Creación e integración del componente estándar de paginación con selector interactivo de tamaño de página (`25, 50, 100, 200, 500`) homogéneo en todos los informes de listado tabular (`CuponDescuentoReportPage`, `SinInspectorReportPage`, `DefectoObdReportPage`).
  * Unificación de la experiencia de usuario: contador textual (`Página X de Y - Z registros en total`), botones corporativos de navegación (`« Primera`, `‹ Anterior`, `página / total`, `Siguiente ›`, `Última »`) y selector reactivo que resetea automáticamente a la página 1.

### 🛠️ Estabilización y Mejoras en Inspecciones sin Inspector (`control-sin-inspector`)
* **Corrección de Error de Anidación e Hidratación de React 19 (`<colgroup>`)**:
  * Eliminación de comentarios y nodos de texto dentro de `<colgroup>` en las tablas de `SinInspectorReportPage.tsx` y `CuponDescuentoReportPage.tsx`, eliminando el error de consola de React 19 que provocaba comportamientos anómalos o pantallazos blancos al renderizar.
* **Estabilización de Referencias de Estaciones en `useReportFilters`**:
  * Creación de la constante a nivel de módulo `TODAS_LAS_ESTACIONES_CODIGOS` para evitar que `estacionesPermitidas` re-instancie una nueva matriz cada vez que el contexto de usuario actualiza la sesión, erradicando los re-disparos involuntarios de `useEffect` ('reactividad fantasma a los pocos segundos').
* **Tarjetas KPI Interactivas y Botones de Filtro Rápido**:
  * Integración de comportamiento interactivo en las tarjetas KPI de `SinInspectorReportPage`: hacer clic en *Fase 1*, *Fase 2* o *Total* filtra reactivamente las inspecciones correspondientes.
* **Selector Dual Permanente de Gráficos con Estado Vacío Corporativo**:
  * El selector de gráficos (`📊 Barras` / `🍩 Cuota por Estación`) permanece visible incluso si el resultado no tiene incidencias (0 inspecciones sin inspector), mostrando una tarjeta informativa verde de calidad conforme en lugar de hacer parpadear o colapsar la vista.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.15.0] - 03/11/2026 — *Blindaje de la Aplicación con ErrorBoundary y Corrección de Props de Componentes*

### 🛡️ Estabilidad y Blindaje de UI contra Pantallas en Blanco (React 19)
* **Componente Corporativo `ErrorBoundary` (`src/components/common/ErrorBoundary.tsx`)**:
  * Implementación del patrón Error Boundary para capturar excepciones no controladas durante el ciclo de vida o renderizado de componentes hijos, impidiendo que React desmonte el árbol completo de la aplicación.
  * Tarjeta de contingencia corporativa TÜV SÜD con detalle de error, traza técnica en desplegable para depuración y botones de acción rápida (*"🔄 Reintentar Carga"*, *"🔃 Recargar Aplicación"* y *"🏠 Ir al Inicio"*).
* **Aislamiento por Módulo y a Nivel Raíz en `App.tsx`**:
  * Envoltorio global en `App()` protegiendo la raíz de la aplicación.
  * Envoltorio individual por módulo (`control-sin-inspector`, `defecto-obd`, `duracion-promedio`, `numero-inspecciones`, `facturacion`, `ultima-fecha`). Si un módulo sufre una anomalía aislada, la cabecera corporativa y la barra de navegación superior permanecen 100% operativas e interactivas.
* **Corrección de Propiedades de Web Components (`TsBadge`)**:
  * Unificación de la propiedad `size="small"` en lugar del valor no estándar `size="sm"` en `SinInspectorReportPage.tsx` y `DefectoObdReportPage.tsx`.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.14.0] - 02/11/2026 — *Base Común de Informes, Skill Local de Informes & Módulo de Inspecciones sin Inspector*

### 🤖 Skill Oficial del Proyecto: `tuv-sud-central-datos-informes`
* **Creación y Registro de la Skill Local (`.agents/skills/tuv-sud-central-datos-informes/SKILL.md`)**:
  * Estandarización oficial de arquitectura "Thick Server / Thin Client", doble validación de fechas (máximo 1 año natural / 366 días), fechas iniciales replicadas exactamente de la app de escritorio según cada formulario, hover `#edf5ff` en tablas, modal bloqueante y protección opcional de concurrencia.
  * Añadida al control de versiones de Git para que esté disponible para todo el equipo y agentes en cualquier clon del repositorio.

### 🧱 Base Común y Estandarización de Informes (Etapas A y B1 del Plan)
* **Frontend (React 19 + TypeScript)**:
  * `useReportFilters`: Hook desacoplado que centraliza las fechas por defecto (día 1 de mes a hoy), validación reactiva de rango (< 366 días), retardo debounce de 250 ms en filtros rápidos (sociedad, fase, estaciones), bloqueo de auto-búsqueda en fechas y vaciado de datos ante rangos inválidos.
  * `useReportTable`: Hook para búsqueda en memoria, ordenación global previa a la paginación con reseteo a página 1 y navegación paginada reactiva.
  * `ReportDateRangeAlert`: Componente oficial con `<TsAlert variant="warning" open>` y botón interactivo *"Ajustar a 1 año"*.
  * `ReportPageHeader`: Cabecera unificada con miga de pan oficial, botón de vuelta a informes, títulos limpios y contenedor de acciones.
* **Backend (.NET 10 Web API)**:
  * `ReportDateRangeValidator`: Validador centralizado de fechas con ajuste a las 23:59:59 y control estricto de 366 días.
  * **Limitador de Concurrencia de Exportaciones (`RateLimiter`)**: Política `excel-export-policy` con `ConcurrencyLimiter` (máximo 3 descargas concurrentes en memoria y 10 en cola) aplicada a todos los endpoints `/exportar-excel`, evitando saturaciones de CPU y RAM. Retorna HTTP 429 informativo ante congestión.

### 🔍 Nuevo Módulo Vertical: Informe de Inspecciones sin Inspector (`control-sin-inspector`)
* **Migración Oficial de `frmCriterios.vb` (`Inspecciones_Sin_Inspector`)**:
  * Consulta SQL indexada de alto rendimiento sobre `CENTRALITV.INSPECCION` unida a `CENTRALITV.ESTACIONES`, localizando inspecciones no anuladas sin inspectores asignados (`CODINSPECTOR IS NULL AND ...`).
  * Endpoint API: `POST /api/v1/informes/sin-inspector/consultar` y `POST /api/v1/informes/sin-inspector/exportar-excel`.
  * Generación de libro Excel multi-pestaña por estación (`SIN_INSPECTOR_{CodEstacion}`) con `ClosedXML`.
  * Pantalla `SinInspectorReportPage` con KPIs corporativos, ranking por estación en barras, grid de 9 columnas con hover `#edf5ff`, ordenación global y modal de ficha técnica.
* **Resolución de Bucle Infinito, Pantallazo Blanco y Estabilidad de KPIs**:
  * Diagnóstico 1: Invocación en cada render de `options.onClearData` como función anónima dentro de `useSinInspectorReport`, la cual provocaba la invalidación constante de la matriz de dependencias de `useEffect` en `useReportFilters`, abortando peticiones activas con `AbortController` (ORA-12570) y rearmando un timer de 250 ms en ciclo perpetuo.
  * Diagnóstico 2 (Pantalla en blanco / Crash en render): En `sinInspectorApi.ts`, los puntos del gráfico mapeaban `detallesTooltip` con propiedad `label` en vez de `nombre`. Al renderizar el tooltip dentro de `ReportBarChart`, `AppTooltip.tsx` ejecutaba `item.nombre.replace(...)`, lanzando un `TypeError: Cannot read properties of undefined (reading 'replace')` no capturado que desmontaba todo el árbol React ("pantallazo blanco").
  * Diagnóstico 3 (KPIs ausentes): En caso de rango de fechas sin inspecciones (o durante la carga inicial), el bloque de KPIs no se mostraba si `data` era nulo.
  * Solución: Estabilización de referencias con `useRef` para todos los callbacks, mapeo estricto `{ nombre, valor }` en el API adapter, protección defensiva de cadenas en `AppTooltip` y en las columnas de la tabla con `(item.nombre || '').replace(...)`, blindaje ante nulos en el predicado de búsqueda/ordenación (`f.marca ?? ''`), y visualización permanente de las 4 tarjetas KPI con estado de carga o valor cero garantizado.
* **Optimización SQL para Rangos Anuales y Limpieza de Fugas Técnicas en UI**:
  * Cuello de botella en 1 año (de 20,2 s a 2,3 s): El hint `INDEX(i P17_INSPECCION)` forzaba un acceso individual por ROWID sobre 1,5 millones de filas anuales e ignoraba el índice compuesto `P31_INSPECCION (CODESTACION, FECHAINSPECCION)`. Se actualizó a `/*+ INDEX(i P17_INSPECCION P31_INSPECCION) */` y `LEFT JOIN`, reduciendo el tiempo de respuesta a 2,34 s (estación individual) y 2,78 s (red completa de 30 estaciones en 362 días, 7,2x más rápido).
  * Limpieza estricta de datos técnicos en UI: Se eliminaron todas las menciones a tecnologías internas ("Oracle", "ClosedXML", "base de datos", "índices optimizados") en modales de carga, alertas y tooltips de `SinInspectorReportPage`, `DuracionPromedioReportPage`, `NumeroInspeccionesReportPage` y `ui.constants`, sustituyéndolas por mensajes 100 % corporativos orientados al usuario final.
  * Selector dual de visualización gráfica (Barras y Donut): Integración del conmutador de vistas corporativo idéntico a `NumeroInspecciones` para alternar entre "📊 Barras (Ranking)" y "🍩 Cuota por Estación", reutilizando `ReportDonutChart` sin alterar ni sobrecargar la exportación oficial a Excel.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.13.0] - 02/11/2026 — *Módulo de Inspecciones con Defecto OBD (Bloque 15) & Reingeniería SQL de Alto Rendimiento*

### ⚡ Reingeniería y Optimización de la Consulta SQL de Defectos OBD (`ObtenerInformeDefectosObd.sql`)
* **Diagnóstico de Bloqueo / Timeout en Base de Datos**:
  * La tabla `CENTRALITV.INSPECCION_DEFECTOS` cuenta con más de **50 millones de registros históricos** indexados por su clave primaria compuesta `(CODESTACION, CODINSPECCION, INDDEFECTO)`. La columna `BLOQUE` no cuenta con índice individual.
  * Al estructurar inicialmente la consulta con una CTE `obd_defectos` filtrando por `BLOQUE = '15'` y forzar `LEADING(dfc i e)`, el optimizador CBO de Oracle iniciaba un **Full Table Scan sobre 50 millones de filas**, provocando que cualquier consulta se bloqueara y excediera el tiempo límite de espera (timeout > 120s).
* **Solución de Alto Rendimiento (Index-Driven Nested Loops)**:
  * Se invirtió la estrategia de acceso conduciendo la consulta desde `CENTRALITV.INSPECCION i` mediante el hint `/*+ LEADING(i dfc e) INDEX(i P17_INSPECCION P31_INSPECCION) USE_NL(dfc) USE_NL(e) */`.
  * Oracle localiza inmediatamente en memoria las inspecciones acotadas por el rango temporal mediante el índice de fecha `P17_INSPECCION` y se conecta directamente a los defectos de esas inspecciones específicas mediante **Nested Loops** sobre el índice primario `PK_INSPECCION_DEFECTOS`.
  * Se optimizó el filtrado de estaciones en `OracleInformesRepository.Obd.cs` usando `i.CODESTACION IN (...)` de forma numérica pura, garantizando la poda de particiones sin funciones de conversión de tipos.
* **Tiempos de Respuesta Verificados**:
  * Rango de 2 días: **95 ms**.
  * Rango de 7 días: **2,81 s** (1.533 registros analizados).
  * Rango de 1 mes completo: **13,98 s** (5.448 registros analizados).

### 🔌 Nuevo Módulo Vertical: Informe de Inspecciones con Defecto OBD
* **Digitalización Técnica del Bloque 15 (Emisiones OBD)**:
  * Réplica y modernización integral de `frmCriterios.vb` (`Inspecciones_Defectos_OBD`), eliminando las consultas en bucle paginado de `clsCur` y las dependencias de automatización COM de `EXCEL.EXE`.
  * Consulta SQL indexada de alto rendimiento (`ObtenerInformeDefectosObd.sql`) sobre `CENTRALITV.INSPECCION_DEFECTOS` (Bloque 15, Defectos 02/03 Gasolina/Diésel, Subdefecto 06, Códigos 02, 03, 04, 05, 31, 51) unida directamente a `CENTRALITV.INSPECCION` y `CENTRALITV.ESTACIONES`.
* **Arquitectura "Thick Server / Thin Client" & Doble Validación**:
  * **Backend (.NET 10 Web API)**:
    * `InformesDefectoObdService`: Cálculo y agregación centralizada de KPIs ejecutivos (Total Defectos, Motores Diésel, Motores Gasolina, Defectos Graves DG vs Leves DL, Estación con más anomalías).
    * Validación estricta de coherencia de fechas y límite máximo de 366 días (año bisiesto).
    * Desglose de tipología reglamentaria con descripciones oficiales del manual ITV (MIL encendida, conector inaccesible, códigos de anomalía DTC en centralita, etc.).
    * **Fidelidad 1:1 en Exportación Excel (Opción A - Multi-Pestaña)**: Replicación exacta del comportamiento y estructura del cliente desktop (`frmCriterios.vb`), generando un libro `.xlsx` nativo (OpenXML / ClosedXML) con **pestañas separadas por cada estación** con anomalías (`DEFECTOS_OBD_4004`, `DEFECTOS_OBD_2875`, etc.), cabeceras en negrita y columnas autoajustadas, garantizando cero sorpresas y compatibilidad total con macros preexistentes.
  * **Frontend (React 19 + TypeScript)**:
    * `useDefectoObdReport`: Hook con validación reactiva previa, alerta corporativa `TsAlert`, ordenación multi-columna global y filtrado en tiempo real.
    * `DefectoObdReportPage`: Página completa rediseñada bajo el TÜV SÜD Algorithm Design System (`@tuvsud/design-system`):
      * **Eliminación del Distintivo "Oficial"**: Retirado el badge redundante `<TsBadge>Oficial</TsBadge>` situado junto al título en todas las cabeceras de informes (`Defectos OBD`, `Número de Inspecciones`, `Duración Promedio`, `Facturación`).
      * **Estabilización de Ancho de Tabla y Scroll Horizontal**:
        * Implementado `table-layout: fixed` con `<colgroup>` y anchos predeterminados en todas las columnas.
        * Ampliado el ancho de la columna `Gravedad` a `155px` y de `Fase` a `80px` (ancho mínimo de tabla `1210px`), aislando el badge de gravedad (`Defecto Grave (DG)`) y formateando `Fase` como una píldora centrada e independiente para eliminar cualquier solapamiento o colisión visual entre ambas columnas.
        * Las celdas de `Estación` y `Vehículo` cuentan ahora con `overflow: hidden`, `text-overflow: ellipsis` y tooltip descriptivo con `AppTooltip`.
        * Se elimina la aparición/desaparición errática de scroll horizontal al pasar de una página con nombres cortos a otra con textos largos.
      * **Blindaje frente a ORA-12570 y Debounce de Filtros Rápidos**:
        * **Frontend**: Añadido un debounce de 250 ms al alternar filtros rápidos (`TSA`, `CAL`, `Fases`, estaciones) para evitar colisión de peticiones concurrentes canceladas.
        * **Backend**: Control de excepciones específico en `OracleInformesRepository.Obd.cs` capturando `OracleException` con código `12570` cuando `cancellationToken.IsCancellationRequested`, evitando que el debugger de Visual Studio interrumpa la ejecución ante cancelaciones normales del cliente.
      * **Modal Bloqueante en Exportación Excel**: Inclusión de `BlockingLoadingModal` oficial con spinner corporativo durante la generación y descarga del fichero Excel en todos los informes, con botones inactivos (`disabled`) cuando no hay datos (`data.filas.length === 0`).
      * **Contador de Registros Estandarizado**: Actualizado `ReportTableContainer` con la propiedad `unidadRegistros` para mostrar `"Mostrando 50 de 1201 registros"` en lugar de `"estaciones"`.
      * **Selector de Gráficos Homogéneo**: Alineado a la derecha (`justifyContent: 'flex-end'`) mediante botonera segmentada unificada idéntica a los demás informes.
      * **Paginación Reactiva en Grid**: Selector combo configurable (`50`, `100`, `200`, `500` registros por página) con controles de navegación completa y reinicio reactivo ante cambios.
      * **Ordenación Global Robusta sin Rotura por Paginado**: Las columnas ordenan el conjunto global de datos antes de paginar, reseteando a la página 1 para inspeccionar los primeros registros ordenados sin perder consistencia.
      * **Unificación de Eventos de Búsqueda Homogénea**:
        * El clic en filtros rápidos (`Fase: Todas / 1ª Fase / 2ª Fase`, `Sociedad: Todas / TSA / CAL`) y en el selector de estaciones (marcar, desmarcar, seleccionar estación) ejecuta la búsqueda o refresco de inmediato en todos los informes, actualizando KPIs, gráficos y tablas.
        * Los selectores de fechas (`Desde`, `Hasta`) no ejecutan búsquedas directas en ningún informe, esperando a que el usuario pulse el botón "Consultar" o presione la tecla **Enter** (formulario `<form>` nativo con `type="submit"`).
      * **Gráficos Donut sin Euros**: Corrección del formateador a unidades contables de defectos (`def.`) y eliminación de textos hardcodeados de estaciones en tooltips.
      * **Ranking con Scroll Completo**: Vista de todas las estaciones en `ReportBarChart` con ancho suficiente para evitar roturas de línea en el desglose Diésel/Gasolina.
      * **Indicador Informativo de Límite (Opción A)**: Distintivo unificado `ℹ️ Rango máx. 1 año` en `ReportFiltersBar` con `AppTooltip` contextual (*"Puede seleccionar libremente cualquier periodo de fechas hasta un máximo de 1 año (365 días) por consulta para optimizar el rendimiento."*), visible de forma homogénea y autoexplicativa en todos los informes sin inducir a confusión sobre el periodo por defecto (mes en curso).
      * **Validación Reactiva de Fechas (> 1 año) y Limpieza de Grid Inconsistente**:
        * Activado el atributo `open` y `heading="Validación de Rango de Fechas"` en el componente `<TsAlert>` de `DefectoObdReportPage`, garantizando su visibilidad inmediata ante rangos mayores a 366 días o fecha fin anterior a fecha inicio.
        * Incorporado botón interactivo *"Ajustar a 1 año"* dentro del banner de alerta para corregir automáticamente el rango con un solo clic.
        * Limpieza estricta de datos obsoletos (`setData(null)`) al activarse la alerta de fechas o pulsar "Consultar" con rango inválido, evitando que permanezcan en pantalla registros o KPIs desalineados que induzcan a confusión sobre las fechas reales de la petición.
        * El cuerpo de la tabla muestra un mensaje informativo contextual: *"Indique un rango de fechas válido (máximo 1 año) para realizar la consulta."*
      * **Efecto Hover Homogéneo en Filas del Grid**: Implementado `transition: 'background-color 0.15s ease'` y eventos `onMouseEnter` / `onMouseLeave` con el azul suave corporativo (`#edf5ff`) sobre fondo alternado (`#ffffff` / `#f8fafc`), idéntico al comportamiento del resto de grids de la aplicación.
* **Navegación e Integración**:
  * Registrado el módulo `'defecto-obd'` en `IMPLEMENTED_SCREENS` (`navigation.constants.ts`) y habilitado en el catálogo general de informes (`InformesHubPage.tsx`) y en el enrutamiento principal con persistencia de F5 (`App.tsx`).

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.12.0] - 02/11/2026 — *Persistencia de Sesión F5, Gráfico Donut de Tramos de Agilidad, Ordenación Ascendente y Logging de Consultas SQL*

### ⚡ Optimización Masiva de Consultas Oracle (1 Año), Tooltips Unificados y Cuota por Estación
* **Optimización Extrema de Consultas Oracle para Rangos Anuales (1.2M Filas)**:
  * **Informe de Duración Promedio (`ObtenerInformeDuracionPromedio.sql`)**:
    * **Diagnóstico de Cuello de Botella**: La consulta invocaba la función PL/SQL `CENTRALITV.CLASIFICACION_MINER(i.CodConstruccion, i.CodUtilizacion)` directamente fila a fila en el `GROUP BY` y `SELECT`, provocando más de 1.200.000 context switches entre el motor SQL y PL/SQL y ejecutando 1.2M de subconsultas sobre `TIPOVEHICULO_IDENT` (tardaba **34.13 segundos**).
    * **Solución**: Preagregación en un primer paso CTE puramente relacional agrupando por `(CODESTACION, CodConstruccion, CodUtilizacion)` reduciendo 1.2M filas a ~300 combinaciones. La clasificación MINER se evalúa únicamente sobre esas 300 filas.
    * **Resultado**: Tiempo reducido de **34.13 s a 3.98 s (-88.3% de latencia)** con idéntico resultado contable.
  * **Informe de Facturación por Inspección (`ObtenerInformeFacturacion.sql`)**:
    * **Diagnóstico**: Realizaba un `LEFT JOIN` fila a fila con `CENTRALITV.FORMAPAGO` sobre 1.2M de filas dentro de la agregación, forzando un `VIEW PUSHED PREDICATE` repetido por cada estación en `NESTED LOOPS` (tardaba 20s en frío).
    * **Solución**: Preagregación en dos niveles (Single-pass CTE sobre `INSPECCION` agrupando por `CODESTACION` y `CODFORMAPAGO`), y posterior agregación relacional a `FORMAPAGO` sobre apenas ~150 filas.
    * **Resultado**: Tiempo de consulta anual reducido de **19.04 s a 4.80 s (-74.8%)**.
* **Unificación Total de Tooltips Corporativos (`AppTooltip`)**:
  * Eliminación de todos los elementos `<title>` nativos de SVG en `ReportDonutChart.tsx`.
  * Incorporación de modo flotante/controlado en `AppTooltip.tsx` mediante coordenadas de ratón (`isOpen` + `targetCoords`), mostrando el mismo diseño corporativo (fondo blanco, sombra tridimensional, lista de estaciones desglosadas y scroll táctil) al pasar el cursor sobre cualquier sector del gráfico circular.
  * Reemplazo de los atributos nativos `title` en tarjetas `ReportKpiCard.tsx` y elementos de cabecera.
* **Sustitución de Texto Confuso**:
  * En `NumeroInspeccionesReportPage.tsx`: reemplazado el botón `📊 Distribución Mix Red` por `📊 Cuota por Estación`.
* **Doble Validación Reforzada (Negocio en Backend + Cliente en React)**:
  * Backend: validación de rango no negativo y soporte de hasta 366 días (año bisiesto) en `InformesFacturacionService`, `InformesNumeroInspeccionesService` y `InformesDuracionPromedioService`.
  * Frontend: validación reactiva en tiempo real en los 3 hooks antes de emitir la llamada de red, con alerta corporativa inmediata si se supera el año.

### 🛡️ Blindaje de Sockets Oracle y Control de Excepciones en F5 / Depuración Visual Studio
* **Resolución de `System.IO.IOException` al Recargar Página (F5)**:
  * **Causa Raíz Diagnosticada**: Al pulsar F5 en el navegador mientras una consulta Oracle está en ejecución, la desconexión abrupta del socket HTTP por parte del navegador (`ERR_ABORTED`) dispara la señal del `CancellationToken` de ASP.NET Core (`HttpContext.RequestAborted`). Al cancelar la escritura/lectura sobre el socket TCP de ODP.NET Thin (puerto 1521), el driver de red lanza una excepción `System.IO.IOException` ("*Unable to write data to the transport connection: Se ha forzado la interrupción de una conexión existente por el host remoto..*"). Al no estar capturada en la capa de persistencia, Visual Studio detenía la ejecución mostrando el diálogo de excepción no controlada por el usuario.
  * **Tratamiento en Repositorios (`OracleEstacionesRepository.cs` y `OracleInformesRepository.cs`)**:
    * Captura explícita de `OperationCanceledException` e `IOException` cuando `cancellationToken.IsCancellationRequested` es `true`, registrándolo en log a nivel `Information` ("*Consulta cancelada por el cliente al recargar la página (F5)*") y devolviendo listas vacías de forma segura sin propagar el error.
    * Mecanismo de **Auto-Recuperación de Pool de Conexiones (`OracleConnection.ClearPool`)**: Si la desconexión es motivada por un socket inactivo cerrado por el firewall remoto de Oracle, se purga el pool con `OracleConnection.ClearPool(conn)` y se reintenta la consulta limpiamente una vez.

### 🔄 Persistencia de Sesión y Navegación al Recargar (F5)
* **Solución de redirección no deseada al Login en recarga (F5)**:
  * En `src/CentralDatos.Api/Program.cs`: se condicionó `app.UseHttpsRedirection()` a entornos que no sean de desarrollo (`if (!app.Environment.IsDevelopment())`). Esto evita la redirección HTTP 307 que los navegadores web aplican entre puertos HTTP (`5113`) y HTTPS (`7179`), la cual causaba que la cabecera `Authorization: Bearer <token>` fuera despojada al consultar `/api/v1/auth/me` a través del proxy de Vite.
  * En `src/central-datos-web/src/App.tsx`: sincronización bidireccional de la pantalla activa mediante `window.location.hash` (`#/modulo/${itemId}`) y respaldo en `sessionStorage` (`cd_active_item`, `cd_active_group`), con escucha del evento `hashchange` para preservar la vista y estado tras recargar o usar el historial del navegador.
  * En `src/central-datos-web/src/constants/navigation.constants.ts`: inclusión de `'duracion-promedio'` en `IMPLEMENTED_SCREENS`.

### 💡 Componente Unificado de Tooltip / Title Especial (`AppTooltip`)
* **Perfeccionamiento Visual, Impresión Aislada y Retención Exacta de Pantalla (F5)**:
  * **Persistencia Integral de Pantalla Activa en F5**: Implementado `getInitialNavigation()` en `App.tsx` para leer prioritariamente el fragmento hash (`#/modulo/duracion-promedio`, etc.) y `sessionStorage` de forma que al recargar la página nunca se devuelva al usuario al listado general de informes ni al inicio, sino exactamente a la pantalla y filtros donde estaba trabajando.
  * **Impresión de Crystal Reports en Ventana Independiente**: Sustitución del mecanismo de iframe interno por `window.open('', '_blank', ...)` en los 3 visores de Crystal Reports (`DuracionPromedio`, `NumeroInspecciones` y `PreviewModal`). El diálogo de impresión de Windows se abre sobre una ventana emergente limpia, manteniendo la aplicación y el modal de origen 100% intactos y con el foco preservado.
  * **Ranking Completo con Scroll**: Eliminado el recorte artificial de Top 10 en `ReportBarChart.tsx`. Ahora se visualizan todas las estaciones o tipos analizados directamente en la lista scrollable sin requerir clicks adicionales.
  * **Eliminación del Término "Donut" en toda la Interfaz**: Reemplazada la denominación "Donut" por términos corporativos y descriptivos (`📊 Cuota por Tipo`, `⏱️ Tramos de Tiempo`, `📊 Distribución Cuota`).
  * **Paleta Cromática Intuitiva y Diferenciada para Tipos de Vehículo**: Cada categoría reglamentaria (Turismos, Mercancías, Motos, Agrícolas, etc.) dispone de un color corporativo único y de alto contraste, evitando tonalidades uniformes de azul y haciendo que el sector circular, la leyenda y el tooltip sean inmediatamente reconocibles.
  * **Corrección de Apertura Automática del Navegador en Visual Studio (F5)**:
  * **Configuración de `launchUrl` en `launchSettings.json`**: Se corrigió el valor erróneo absoluto (`http://localhost:5173`) que provocaba que Visual Studio no supiera cómo abrir el navegador o lo cancelara en silencio. Se estableció en blanco (`""`) con el perfil `http` como predeterminado.
  * **Redirección Raíz Dinámica en `Program.cs`**: En modo desarrollo (`app.Environment.IsDevelopment()`), la ruta raíz `/` redirige automáticamente a `http://localhost:5173`, garantizando que cuando Visual Studio abre el navegador en `http://localhost:5113/`, este salte de inmediato a la aplicación web React/Vite.
  * **Auditoría Integral de Responsividad (Mobile, Tablet y Desktop)**:
  * **Botonera de Vistas de Gráficos Adaptativa (`.cd-chart-mode-group` / `.cd-chart-views-bar`)**: En pantallas de escritorio se mantiene inline alineada a la derecha; en tablets y móviles se transforma automáticamente en una botonera estructurada de 2x2 simétrica (o 1 columna en móviles ultraestrechos < 480px) para máxima comodidad táctil.
  * **Grid de Tarjetas KPI a Prueba de Overflow**: Configuración de `gridTemplateColumns: repeat(auto-fit, minmax(min(100%, 220px), 1fr))` garantizando adaptación fluida sin rotura en anchos estrechos.
  * **Barras de Ranking Ajustadas (`.cd-barchart-row`)**: Reducción proporcional de columnas en dispositivos móviles para preservar la visibilidad de etiquetas, barras y valores.
  * **Ancho Seguro para Tooltip (`AppTooltip`)**: Limitación dinámica de ancho a `min(calc(100vw - 28px), 380px)` para evitar desbordamientos laterales en pantallas de smartphones.
  * **Mejoras de Usabilidad en Tooltip y Barra de Filtros**:
  * **Tooltip en Fondo Blanco**: Sustitución del fondo oscuro por blanco (`#ffffff`) corporativo con sombra tridimensional azul (`rgba(0, 70, 173, 0.16)`), borde superior de 3px con el color del tramo y tipografía oscura de alta legibilidad (`#0b253b` / `#1e293b`).
  * **Posicionamiento directo en el Cursor**: El tooltip se ancla inmediatamente en las coordenadas del puntero (`clientX`, `clientY`).
  * **Scroll interactivo sobre la tarjeta**: Habilitación de `pointerEvents: 'auto'` y persistencia con retardo de 220ms, permitiendo al usuario mover el cursor dentro del tooltip para desplazarse por el listado de estaciones.
  * **Ajuste de la Barra de Filtros**: Compactación de inputs y selectores para que el botón `🔍 Consultar` permanezca en la misma línea sin saltar a una fila solitaria.
  * **Sustitución del `title` nativo por componente corporativo enriquecido**:
  * Implementación de `src/components/common/AppTooltip.tsx` con diseño alineado a **TÜV SÜD Algorithm Design System**: fondo azul marino (`#0b253b`), acentos semánticos por tramo/sociedad y tipografía `TUV SUD Pro`.
  * Renderizado mediante `createPortal` en `document.body` con cálculo automático de coordenadas (`fixed`) para garantizar visibilidad sin cortes por `overflow` o SVG.
  * Desglose estructurado de estaciones: al pasar el ratón por los tramos del Donut de Agilidad o las barras del ranking, muestra el listado completo de estaciones con código, nombre, duración promedio y badge de sociedad.
  * Corrección gramatical en etiquetas singulares (`1 estación` vs `X estaciones`).

### ⏱️ Tramos de Agilidad Operativa en Donut y Ordenación de Tipos de Vehículo
* **Nuevo Gráfico Donut de Tramos de Agilidad Operativa**:
  * Sustitución del gráfico Donut de Sociedades (que aportaba bajo valor analítico) por el nuevo modo `⏱️ Tramos de Tiempo (Donut)`.
  * Agrupación automática de las estaciones seleccionadas en 4 intervalos operativos:
    * **Ágiles (< 25 min)**: verde `#059669`
    * **Estándar (25 - 35 min)**: azul corporativo `#0046ad`
    * **Tiempo Elevado (35 - 45 min)**: ámbar de atención `#d97706`
    * **Demora / Crítico (> 45 min)**: rojo de alerta `#dc2626`
  * Muestra el porcentaje y número exacto de estaciones ITV por intervalo para un diagnóstico gerencial inmediato.
* **Ordenación Ascendente en "Por Tipo de Vehículo"**:
  * En `DuracionPromedioReportPage.tsx`, se configuró `sortOrder="asc"` en el gráfico de barras por tipo de vehículo, visualizando en primer lugar las tipologías con inspección más rápida (motocicletas, turismos) y en último lugar las de mayor duración (autobuses, pesados).
* **Mantenimiento del Criterio Visual de 30 Minutos en el Grid Analítico**:
  * Se conserva la colorimetría de alerta ejecutiva en la columna "Duración Promedio (min)", destacando en verde (`#047857`) tiempos <= 30 min y en rojo (`#b91c1c`) demoras > 30 min.

### 📝 Trazabilidad y Logging de Sentencias SQL Ejecutadas
* **Configuración de Logging de Consultas Finales Parametrizadas**:
  * Nueva opción configurable `"LogExecutedSql": true` dentro de la sección `"CentralItv"` en `appsettings.json`.
  * En `OracleInformesRepository.cs` y `OracleEstacionesRepository.cs`, se implementó el método `LogSqlEjecutada()` que sustituye los marcadores `:FechaInicio`, `:FechaFin` y colecciones de `:codigosEstacion` con sus valores literales formateados para Oracle (`TO_DATE('...', 'YYYY-MM-DD HH24:MI:SS')`).
  * Registro estructurado en Serilog tanto en consola como en ficheros rotativos `logs/central-datos-YYYYMMDD.log` para facilitar la depuración, auditoría y análisis de planes de ejecución.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.11.0] - 30/10/2026 — *Módulo Oficial de Duración Promedio de Inspecciones Periódicas (001), Fidelidad 1:1 Crystal Reports y Gráficos Visuales*

### ⏱️ Módulo de Duración Promedio de Inspecciones (001)
* **Nuevos Endpoints Analíticos (.NET 10 Minimal APIs)**:
  * `POST /api/v1/informes/duracion-promedio/consultar`: Agregación de alto rendimiento en el servidor para el grid analítico, 4 tarjetas de KPI ejecutivas, ranking de agilidad de estaciones y distribución por tipología de vehículo según clasificación oficial MINER.
  * `POST /api/v1/informes/duracion-promedio/exportar-excel`: Exportación directa a formato CSV / Excel con delimitador español (`;`), codificación UTF-8 con BOM y cabeceras oficiales.
* **Consulta SQL Exacta 1:1 con la App de Escritorio (`ObtenerInformeDuracionPromedio.sql`)**:
  * Ejecución directa sobre Oracle mediante Dapper + ODP.NET Thin.
  * Agregación precalculada con hint de índices `P17_INSPECCION` y `P31_INSPECCION`.
  * Filtro estricto `ANULADA = 0`, `CodSepiva IN ('001')` (inspecciones periódicas), `HoraFinal IS NOT NULL`, `HoraCobro IS NOT NULL` y `HoraFinal >= HoraCobro`. Se elimina el corte artificial de 180 min para replicar fielmente el cálculo de `frmCriterios.vb:2856-2857` (`ROUND(Avg((HoraFinal - HoraCobro)*24*60), 1)`).
  * Integración con la función oficial `CENTRALITV.CLASIFICACION_MINER(CodConstruccion, CodUtilizacion)` y ordenación por `CENTRALITV.TIPOS_CLASIFICACION_MINER.ORDEN`.
* **Filtro de Fase Integrado y Responsivo en `ReportFiltersBar`**:
  * El filtro de fase (`Todas`, `1ª Fase`, `2ª Fase`) se traslada a la barra horizontal de filtros `ReportFiltersBar`, situado inmediatamente al lado del selector de fechas para un flujo natural e intuitivo.
  * Se mantiene la barra totalmente responsiva (`flexWrap: 'wrap'`).
  * En la cabecera de la página se eliminan duplicidades, dejando en la zona derecha exclusivamente los dos botones de acción: `🖨️ Imprimir (Crystal Report)` y `🔄 Actualizar Datos`.
* **Consistencia Corporativa en la Columna Sociedad**:
  * La columna "Sociedad" del grid analítico adopta el mismo estándar de texto y badge que `FacturacionReportPage` y `NumeroInspeccionesReportPage`, mostrando `TÜV SÜD ATISAE (TSA)` o `TÜV SÜD CAL (CAL)` con su correspondiente badge semántico.
* **Corrección de Ordenación en Ranking de Agilidad (`ReportBarChart`)**:
  * Se añade la propiedad `sortOrder?: 'desc' | 'asc' | 'none'` a `ReportBarChart` (por defecto `'desc'`).
  * En el ranking de agilidad se configura `sortOrder="asc"`, mostrando en primer lugar (#1) la estación con menor duración promedio (más ágil) y en último lugar la más lenta, solventando la inversión reportada en la interfaz gráfica.
* **Métricas Visuales Enriquecidas con Gráficos Donut (`ReportDonutChart`)**:
  * Se incorpora un selector de visualizaciones con 4 alternativas sin sobreingeniería:
    1. `📊 Ranking Agilidad (Menor a Mayor)`: Barras horizontales ordenadas de mayor a menor celeridad.
    2. `🚗 Por Tipo de Vehículo`: Barras con duración media por categoría MINER.
    3. `🍩 Cuota por Tipo (Donut)`: Gráfico circular con la distribución porcentual de inspecciones por tipología de vehículo.
    4. `🏢 Cuota Sociedades (Donut)`: Gráfico circular con la distribución de volumen entre TSA y CAL.
* **Réplica Oficial 1:1 de Crystal Reports (`rptDuracionPromedio`) en `CrystalReportDuracionPromedioModal.tsx`**:
  * Adaptado fielmente al informe clásico de escritorio en A4 vertical (Portrait):
    * Marco enmarcado con título oficial: `DURACIÓN PROMEDIO DE INSPECCIONES (EN MINUTOS) / INSPECCIONES PERIÓDICAS 001`.
    * Desglose por tipo de vehículo (`TIPO DE VEHÍCULO: MOTOCICLETAS`, etc.) con exactamente 2 columnas: `ESTACIÓN ITV` y `DURACIÓN (MIN.)` redondeada a entero, junto con el pie `Promedio: [valor]`.
    * Bloque final de `FILTRO APLICADO AL INFORME` con fecha inicial, fecha final, fase y listado de estaciones analizadas, idéntico a la página 10 del informe clásico de Crystal Reports.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.10.0] - 30/10/2026 — *Restricción Integral de Estaciones por Permisos de Usuario (`CENTRAL_GENERAL`) y Optimización Reactiva del KPI Redondo*

### 🔐 Seguridad y Permisos de Estaciones por Usuario (Active Directory / Oracle)
* **Permisos Oficiales de Central Datos (`CENTRALITV.EMPLEADO_PERMISOS`)**:
  * Se alinea la obtención de estaciones permitidas con la lógica histórica de la aplicación de escritorio (`clsGeneral.vb: Cargar_Centros_Permitidos("CENTRAL_GENERAL")`).
  * Para operadores (como `defru-li`), se consultan las estaciones asignadas en `CENTRALITV.EMPLEADO_PERMISOS` con `CodPermiso = 'CENTRAL_GENERAL'`, `Activo = -1` y `VALOR = 'SI'`, devolviendo exactamente sus centros autorizados (`0902`, `2811`, `2812`, `4308`).
  * Los supervisores mantienen acceso íntegro a todas las estaciones de la red (`Central_Datos = -1`).
  * Bloqueo preventivo de acceso si un usuario no supervisor carece de estaciones autorizadas en el módulo de Central Datos.
* **Aplicación Integral en Toda la Aplicación Web**:
  * **Pantalla de Inicio / "Últimos datos centralizados" (`UltimosDatosCentralizados.tsx` & `useUltimosDatos.ts`)**:
    * Se aplica el filtro de estaciones permitidas a la tabla principal, mostrando exclusivamente las 4 estaciones asignadas al usuario en lugar de toda la red.
    * Las 4 tarjetas de resumen métrico (`Total Estaciones`, `TSA`, `CAL`, `Última Inspección Centralizada`) y los botones de filtro rápido de sociedad (`Todas`, `TSA`, `CAL`) recalculan sus cifras dinámicamente sobre las estaciones autorizadas del operador.
  * **Módulos de Informes (`FacturacionReportPage.tsx` y `NumeroInspeccionesReportPage.tsx`)**:
    * Los selectores desplegables `ReportFiltersBar` reciben `estacionesPermitidas` para limitar las estaciones elegibles y restringir los filtros de sociedad.

### 🍩 Gráfico Circular Dinámico (KPI Redondo / Donut Cuota)
* **Recálculo Reactivo Inmediato (`useNumeroInspeccionesReport.ts`)**:
  * Se corrige el cálculo de `graficoCuotaDinamico`: ahora se computa directamente a partir de las filas visibles (`filasFiltradasYOrdenadas`), desglosando `Fase 1 Favorables`, `Fase 1 Rechazadas`, `Fase 2 Favorables` y `Fase 2 Rechazadas`.
  * Se elimina la discrepancia que provocaba que el gráfico se quedara en blanco o sin datos al marcar y desmarcar estaciones en el filtro.
  * Respeto de la paleta semántica en el componente `ReportDonutChart`: Fav. F1 (Azul corporativo `#0046ad`), Rech. F1 (Rojo `#dc2626`), Fav. F2 (Celeste `#0284c7`), Rech. F2 (Naranja `#ea580c`).
  * Limpieza y reseteo defensivo del estado de hover al variar los datos representados.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.09.0] - 30/10/2026 — *Módulo Oficial de Número de Inspecciones (Favorables y Rechazadas por Fase) y Réplica Crystal Reports 1:1*

### 📊 Módulo de Número de Inspecciones (Fase 1 y Fase 2)
* **Nuevos Endpoints Analíticos (.NET 10 Minimal APIs)**:
  * `POST /api/v1/informes/numero-inspecciones/consultar`: Agregación de alto rendimiento en el servidor para el grid analítico, 4 tarjetas de KPI ejecutivas y gráficos comparativos de barras y tarta.
  * `POST /api/v1/informes/numero-inspecciones/exportar-excel`: Exportación directa a formato CSV / Excel con delimitador español (`;`), codificación UTF-8 con BOM y cabeceras oficiales.
* **Consulta SQL Optimizada (`ObtenerInformeNumeroInspecciones.sql`)**:
  * Ejecución directa sobre Oracle mediante Dapper + ODP.NET Thin.
  * Agregación precalculada en un solo paso (`Single-Pass CTE`) con hint de índices sobre `P17_INSPECCION` y `P31_INSPECCION`.
  * Filtro estricto `ANULADA = 0` y segregación por fase y resultado exactamente igual a la aplicación de escritorio (`frmCriterios.vb`):
    * `Favorables1`: `RESULTADO IN ('1', '2') AND INDICA12 = '1'`
    * `Rechazadas1`: `RESULTADO IN ('3', '4') AND INDICA12 = '1'`
    * `Favorables2`: `RESULTADO IN ('1', '2') AND INDICA12 = '2'`
    * `Rechazadas2`: `RESULTADO IN ('3', '4') AND INDICA12 = '2'`
* **Dashboard y Grid Analítico Web (Thin Client)**:
  * 4 KPIs ejecutivos: Total Inspecciones, 1ª Inspección (Fase 1), 2ª Inspección (Fase 2) y % Rechazo Global.
  * Gráfico comparativo dual: alternancia instantánea entre Ranking de Estaciones por volumen y Distribución de Cuota de la red.
  * Tabla con ordenación multicriterio ascendente/descendente en todas las subcolumnas y fila resumen de totales de la red.
  * Reutilización máxima y estricta de componentes existentes de Algorithm DS: `ReportFiltersBar`, `ReportKpiCard`, `ReportBarChart`, `ReportDonutChart`, `ReportTableContainer`, `SortIndicator` y `BlockingLoadingModal`.
  * Validación en cliente y servidor con límite de rango a 365 días y alertas dinámicas en tiempo real.
  * **Interactividad y Limpieza Reactiva**: Al desmarcar todas las estaciones en el filtro, el grid se vacía al instante mostrando aviso instructivo, los 4 KPIs se limpian a cero, los gráficos muestran su estado vacío y los botones de exportación a Excel e impresión Crystal Report se desactivan automáticamente al no haber datos que mostrar.

### 🖨️ Réplica Oficial 1:1 de Crystal Reports (`rptInspFavorablesRechazadas`)
* **Impresión Aislada y Sin Ruido en A4 Apaisado (`CrystalReportNumeroInspeccionesModal.tsx`)**:
  * Réplica tipográfica y estructural exacta del formato clásico de Crystal Reports con cabecera enmarcada, parámetros de fechas/estaciones y desglose en 3 bloques de 4 columnas:
    * Fase 1 (1ª Inspección): Favorables, Rechazadas, Total, % Rechazo.
    * Fase 2 (2ª Inspección): Favorables, Rechazadas, Total, % Rechazo.
    * Total Inspecciones: Total Fav., Total Rech., Total Insp., % Rechazo.
  * Impresión mediante iframe oculto aislado: se eliminan botones, scrollbars y bordes del navegador, ajustando la red completa de estaciones en **1 sola página A4 horizontal**.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.08.0] - 30/10/2026 — *Módulo Oficial de Facturación de Inspecciones y Réplica Crystal Reports 1:1*

### 📊 Módulo de Facturación e Inspecciones Centralizadas
* **Nuevo Endpoint Analítico (.NET 10 Minimal APIs)**:
  * `POST /api/v1/informes/facturacion/consultar`: Agregación de alto rendimiento en el servidor para el grid analítico, tarjetas de KPI ejecutivas y gráficos comparativos.
  * `POST /api/v1/informes/facturacion/exportar-csv`: Exportación inmediata a formato CSV / Excel con delimitadores en español (`;`) y BOM UTF-8 para apertura directa en Microsoft Excel.
* **Consulta SQL Optimizada (`ObtenerInformeFacturacion.sql`)**:
  * Ejecución directa sobre Oracle mediante Dapper + ODP.NET Thin.
  * Agregación en un solo paso (`Single-Pass CTE`) con hint de índices sobre `P17_INSPECCION` y `P31_INSPECCION`, reduciendo tiempos de consulta en base de datos de producción de 78 segundos a subsegundos.
* **Dashboard y Grid Analítico Web**:
  * 4 KPIs ejecutivos en cabecera: Facturación Neta Total, Total Inspecciones, Ticket Medio por Inspección y Estación con Mayor Facturación (con filtro de exclusión de facturación cero).
  * Gráfico comparativo dual: alternancia instantánea entre Ranking de Barras y Cuota de Mercado (%) con tokens de color corporativos TÜV SÜD (Azul `#0046ad` para TSA y Verde `#00875a` para CAL).
  * Selector multisección de estaciones con opciones de "Marcar todas" y "Desmarcar todas" sin interferencias de eventos.

### 🖨️ Réplica Oficial 1:1 de Crystal Reports (`rptResumenInspecciones`)
* **Desglose Completo por Formas de Pago (`CENTRALITV.FORMAPAGO`)**:
  * Integración con la tabla de formas de pago replicando exactamente la lógica del escritorio (`frmCriterios.vb`):
    * **Contados (`CODTIPOFORMAPAGO IN ('C', 'X')`)**: Nº Inspecciones, Base, IVA, Tasas y Total.
    * **Terceros (`CODTIPOFORMAPAGO IN ('3', 'O')`)**: Nº Inspecciones, Base, IVA, Tasas y Total.
    * **Tarjetas (`CODTIPOFORMAPAGO = 'T'`)**: Nº Inspecciones, Base, IVA, Tasas y Total.
    * **Totales Oficiales**: Nº Inspecciones, Base, IVA (Sumado), Tasas, Tasas de Tráfico, Tasas de Industria, Total y Gratuitas.
  * Concordancia matemática al céntimo contra las liquidaciones contables y los informes clásicos de escritorio.
* **Impresión Aislada y Sin Ruido en A4 Apaisado (`CrystalReportPreviewModal.tsx`)**:
  * Mecanismo de impresión desacoplado mediante *iframe* oculto: se suprimen al 100% los botones de la pantalla, la barra del visor, los fondos grises y los scrollbars.
  * Configuración estricta `@page { size: A4 landscape; margin: 5mm 6mm; }` en orientación horizontal.
  * La tabla de 23 columnas, junto con el enmarcado de título, criterios (`IVA SUMADO`, fechas, estaciones) y fila de totales finales, entra con exactitud en **1 sola hoja de papel (Página 1 de 1)** sin columnas cortadas ni saltos extraños de página.

### 🧹 Usabilidad y Limpieza de Interfaz
* **Menú "Aplicación"**: Eliminada la opción redundante *"Salir"*, manteniendo exclusivamente *"Últimos datos centralizados"*.
* **Insignias y Tooltips**: Información técnica de base de datos (host/SID) visible únicamente en entornos de desarrollo mediante atributos `title` limpios.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.07.0] - 30/10/2026 — *Resiliencia de Auditoría, Cola Offline y Diagnóstico Técnico Local*

### 📡 Resiliencia y Auditoría Desconectada (Offline Buffer & Auto-Sync)
* **Arquitectura de Cola Local Offline (`auditQueue.ts`)**:
  * Implementación de un buffer circular seguro en `localStorage` (límite de 100 eventos) que captura automáticamente los registros de auditoría y navegación en caso de corte de red o indisponibilidad temporal del servidor.
  * Trazabilidad temporal de alta precisión: cada evento sincronizado en diferido se etiqueta con `[Offline HH:mm:ss]`, permitiendo auditar la hora real de la operativa en planta.
* **Sincronización Automática en Lote (*Auto-Flush*)**:
  * Escucha activa del evento nativo `window.addEventListener('online')` para reanudar y volcar en segundo plano los eventos retenidos sin intervención del usuario.
  * Nuevo endpoint en .NET 10 Minimal APIs: `POST /api/v1/auth/audit/batch` con inserción transaccional en Oracle (`CENTRALITV.LOG_AUDITORIA_WEB`) y registro en Serilog.
* **Diagnóstico Técnico Descargable para Soporte (CAU)**:
  * Generación y descarga directa en el navegador de informes de diagnóstico técnico (`tuv-sud-central-datos-diagnostico-YYYYMMDD-HHmmss.log`) con metadatos de red, usuario, URL, navegador, resolución y traza de eventos en cola.
  * Accesible desde el banner global de advertencia offline en `App.tsx` y desde la alerta de incidencia de comunicación en `LoginPage.tsx`.
* **Documentación Técnica**:
  * Actualización de `10_arquitectura_logging_auditoria_y_seguridad_pentest.md` incorporando la Sección 7 con diagrama de flujo Mermaid y especificación técnica exhaustiva.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.06.0] - 30/10/2026 — *Estabilidad de Login, Notificaciones Pentest-Safe y Ordenación Robusta de Red*

### 🔐 Autenticación y Experiencia de Usuario (Login)
* **Erradicación del Parpadeo y Pantalla en Blanco en Error de Acceso**:
  * Desacoplamiento del estado global `isLoading` en `AuthContext.tsx`, impidiendo el desmontaje accidental de `LoginPage.tsx` durante el procesamiento de credenciales.
  * Migración del estado de progreso a un indicador local (`isLoggingIn`) exclusivo del botón de acción.
  * Incorporación de `action="javascript:void(0);"` en el formulario para neutralizar recargas nativas indeseadas del navegador.
* **Componente `TsAlert` Cerrable y Móvil**:
  * Integración estable de `<TsAlert>` corporativo situado sobre el botón de envío, con cierre manual (`closable` y `onTsAfterHide`).
  * Estilos elásticos con `wordBreak: 'break-word'` y `maxWidth: '100%'` adaptados a pantallas de smartphone.
* **Unificación y Cumplimiento Pentest (OWASP ASVS / CWE-204 & CWE-208)**:
  * Eliminación de filtros asimétricos de longitud en frontend (`length < 2`) para evitar cualquier tipo de inferencia o enumeración de cuentas.
  * Mensaje genérico y neutral ante cualquier fallo de validación o contraseña incorrecta: *"Las credenciales introducidas no son válidas o no dispone de autorización para acceder al sistema."*.

### 📊 Monitor de Estaciones y Ordenación
* **Agrupación Ponderada de Sociedades**:
  * Implementación de la función `getPesoSociedad` en `useUltimosDatos.ts` (`TSA / ATISAE = 1`, `CAL = 2`, `Otras = 99`), asegurando que las estaciones pertenecientes a la misma sociedad permanezcan estrictamente agrupadas bajo cualquier ordenación.
  * Criterio de desempate determinista secundario (*tie-breaker*) alfabético por denominación y código de estación.
* **Solución al Bloqueo/Congelación de Columnas**:
  * Unificación atómica del estado de ordenación en `orden: { columna, direccion }` dentro del hook `useUltimosDatos.ts`, eliminando los bailouts y side-effects de React 18 que congelaban la tabla tras sucesivos clics.
  * Ordenación nativa SQL actualizada en `ObtenerUltimosDatosCentralizados.sql` con `ORDER BY e.Cod_Empresa, e.DesEstacion`.
* **Optimización de Estilos en Tabla**:
  * Reemplazo de manipulación DOM imperativa en cabeceras `th` por clases nativas CSS (`.cd-table-th`, `.cd-table-th-active`) en `responsive.css`.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [2.05.0] - 29/10/2026 — *Hito de Autenticación, Auditoría, Logging y Responsividad* (Commits: `504f50a`, `5860865`)

### 🔐 Seguridad y Autenticación
* **Autenticación Multicanal Completa (.NET 10 + JWT)**:
  * Soporte para Active Directory corporativo vía LDAP (`WW001.ITGR.NET`).
  * Autenticación de cuenta técnica de sistema `SUPERVISOR` con hash maestro de base de datos.
  * Suplantación de identidad controlada (`SUPERVISOR:USUARIO`) para soporte de segundo nivel.
  * Autenticación de empleados internos/planta sin dominio contra `COMUN.PERSONA`.
  * Soporte para Windows Single Sign-On (SSO Intranet).
* **Emisión de Tokens JWT**:
  * Firma simétrica SHA-256 de 8 horas de duración con claims de rol, estaciones autorizadas y supervisor.
* **Blindaje frente a Pentest (OWASP CWE-209 & CWE-203/204)**:
  * Mensajes de error unificados y neutrales (*"Credenciales no válidas o acceso no autorizado."*) para evitar enumeración de usuarios.
  * Supresión total de `ex.Message`, errores ORA y stack traces en las respuestas HTTP y en componentes `<TsAlert>`.
  * Eliminación de trazas de credenciales en la consola del navegador.

### 📊 Lógica de Negocio y Estaciones
* **Cálculo de Sincronización Centralizado en Backend**:
  * Traslado de toda la lógica de cálculo de desfases temporales a la entidad de dominio `EstacionUltimoDato`.
  * Generación de etiquetas legibles en español sin abreviaturas confusas (*"Al día (Hoy)"*, *"Alerta (hace X días)"*, *"Crítico (> 1 año)"*).
  * Niveles semánticos calculados (`success`, `warning`, `danger`) y descripciones de accesibilidad (*tooltips*).
* **Refactorización Limpia con Custom Hook (`useUltimosDatos`)**:
  * Desacoplamiento total entre la lógica de estado/filtrado y la vista visual JSX.
  * Reducción de `UltimosDatosCentralizados.tsx` a una plantilla puramente declarativa y legible.

### 📝 Sistema Híbrido de Logging y Auditoría
* **Auditoría Transaccional en Base de Datos (Oracle)**:
  * Integración con la tabla histórica `CENTRALITV.LOG_ACCESOS_MODULOS` (inicio y fin de sesión).
  * Creación y despliegue idempotente de la nueva tabla `CENTRALITV.LOG_AUDITORIA_WEB` con secuencia y trigger para trazabilidad de navegación, clics y tiempos de respuesta.
* **Diagnóstico Técnico de Infraestructura con Serilog**:
  * Configuración de ficheros rotativos diarios en disco: `logs/central-datos-YYYYMMDD.log`.
  * Retención automática de 30 días y límite de 50 MB por fichero con partición incremental.
  * Los errores de conexión de Oracle se aíslan exclusivamente en fichero para evitar dependencias circulares.
* **Middleware Global de Excepciones**:
  * Captura global de errores 500 no controlados con volcado a disco y entrega de respuesta segura al cliente.

### 📱 Diseño Responsivo
* **Adaptabilidad Universal**:
  * Reestructuración responsiva del layout principal, cabecera y barra de navegación (`Header`, `Navbar`, `App`).
  * Espaciados elásticos mediante funciones CSS `clamp()`.
  * Soporte de scroll táctil fluido (`cd-touch-scroll`) con indicadores visuales para tablas en dispositivos móviles y tabletas.
  * Reorganización en columna de los filtros y buscador en pantallas estrechas (< 768px).

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [1.1.0] - 29/10/2026 — *Optimizaciones de Rendimiento y Negocio* (Commit: `cca987e`)

### Añadido
* Migración de consultas SQL nativas sobre `CENTRALITV.PARAMETROS_ESTACIONES` a **Dapper con ODP.NET Thin**.
* Constantes de negocio de sociedades (`ATISAE` código `01`, `CAL` código `02`).
* Filtrado operativo de las 29 estaciones oficiales activas de TÜV SÜD.
* Componente vectorial corporativo del logotipo TÜV SÜD (`TuvSudLogo.tsx`).
* Soporte para conexión directa a Oracle `ORCLDV` por puerto TCP `1521` eliminando el doble salto SOAP.

---

## [2.17.0] - 03/11/2026 — *Nuevo Módulo Excel Facturación Comparativa (TSA / CAL), Corrección Bug Arrastre Legacy y Ranking Visual*

### 📈 Nuevo Módulo Vertical: Excel Facturación de Inspecciones Comparativa (`facturacion-excel`)
* **Migración Oficial de `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` (Informe C3)**:
  * Implementación vertical completa (Oracle SQL, .NET 10 Web API, ClosedXML y React 19 con TÜV SÜD Algorithm DS).
  * **Corrección Definitiva del "Bug de Arrastre" del Legacy**:
    * En el código VB.NET legacy (`clsExcelFacturacion.vb`), la variable de matriz `ingresosInspecciones(0, 3)` se declaraba fuera del bucle de estaciones sin limpiarse, duplicando datos en UMAs vacías e inflando artificialmente el total en más de **589.445,24 €** y **14.254 inspecciones**.
    * En Central Datos Web se establece aislamiento estricto por estación con inicialización explícita a `0,00 €` y `0` inspecciones, garantizando 100% de coincidencia al céntimo con la base de datos Oracle.
  * **Exportación Oficial a Plantilla Excel (`.xlsx`) mediante ClosedXML**:
    * Inyección de datos respetando la plantilla corporativa oficial `Plantilla Informe de facturación.xlsx` con recálculo dinámico de fórmulas de subtotales por CC.AA, ratios interanuales y totales por sociedad (TSA y CAL).
  * **Frontend Estandarizado (`FacturacionComparativaReportPage.tsx`)**:
    * Selector dual de rangos de fechas (Periodo 1 de Referencia vs Periodo 2 Actual / Comparado) con botón de actualización compacto.
    * 4 Tarjetas KPI interactivas (`Facturación Periodo Actual`, `Inspecciones Fase 1`, `Ingreso Medio / Insp.`, `Estaciones Comparadas`).
    * Resumen comparativo por Sociedad (TSA / CAL / TOTAL GLOBAL) con chips de variación porcentual semántica.
    * Gráfico comparativo de barras (`ReportBarChart`) continuo de ancho completo (`#1, #2, #3...` en orden vertical descendente), ordenado por tasa de crecimiento real (desde los mayores crecimientos positivos hasta los negativos en rojo tenue).
    * Tabla detallada con ordenación en todas las columnas y paginador homogéneo con selector de tamaño (`ReportPaginationBar`).

---

## [1.0.0] - 29/10/2026 — *Inicialización del Proyecto Web* (Commit: `18a3f6f`)

### Añadido
* Andamiaje de Clean Architecture en .NET 10:
  * `CentralDatos.Domain`: Entidades base y reglas de negocio.
  * `CentralDatos.Application`: Casos de uso y DTOs.
  * `CentralDatos.Infrastructure`: Adaptadores de persistencia y configuración.
  * `CentralDatos.Api`: Minimal APIs y Swagger/OpenAPI.
* Proyecto Frontend en React 19 + TypeScript + Vite:
  * Integración del sistema de diseño corporativo **TÜV SÜD Algorithm Design System** (`@tuvsud/design-system`).
  * Configuración de tokens semánticos CSS y tipografía oficial `TUV SUD Pro`.
* Primer prototipo visual del monitor de estaciones ITV.

