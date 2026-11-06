# 30. Módulo de Localización de Inspecciones, Defectos, Elementos y Mediciones (`3. Inspecciones`)

> **Fecha de Implementación**: 06/11/2026
> **Versión**: `2.29.0`
> **Pantallas Web**: `loc-inspecciones`, `loc-defectos`, `loc-elementos`, `loc-mediciones` y `InspeccionesHubPage`
> **Equivalencia Legacy**: `frmCriteriosLocalizacion.vb`, `frmCriteriosLocalizacionDefectos.vb`, `frmCriteriosLocalizacionElementos.vb`, `frmCriteriosLocalizacionMediciones.vb` y selectores `frmCampos_*Localizados.vb`

---

## 1. Visión General y Arquitectura Unificada

El grupo de menú **3. Inspecciones** en *Central Datos* reúne cuatro herramientas de búsqueda avanzada y auditoría técnica sobre el histórico de `CENTRALITV`. En la aplicación de escritorio VB.NET, estos cuatro módulos estaban implementados mediante formularios duplicados (~4.800 líneas de código con SQL concatenado en el cliente).

En **Central Datos Web**, los cuatro informes se han unificado bajo una arquitectura **Thick Server / Thin Client** conducida por metadatos (*Metadata-Driven Engine*):

| ID Ruta Web | Título Funcional | Tabla de Metadatos Oracle | Hoja Excel Oficial |
| :--- | :--- | :--- | :--- |
| `loc-inspecciones` | Localización de Inspecciones | `CENTRALITV.CAMPOS_INSPECCIONESLOCALIZADAS` | `INSPECCIONES_LOCALIZADAS` |
| `loc-defectos` | Localización de Defectos | `CENTRALITV.CAMPOS_DEFECTOSLOCALIZADOS` | `DEFECTOS_LOCALIZADOS` |
| `loc-elementos` | Localización de Elementos | `CENTRALITV.CAMPOS_ELEMENTOSLOCALIZADOS` | `ELEMENTOS_LOCALIZADOS` |
| `loc-mediciones` | Localización de Mediciones | `CENTRALITV.CAMPOS_MEDICIONESLOCALIZADAS` | `MEDICIONES_LOCALIZADAS` |

---

## 2. Prevención de Cuellos de Botella en Oracle SQL y Web

1. **Eliminación de *Hard Parsing* y SQL Injection (`OracleInformesRepository.Localizacion.cs`)**:
   - Todas las condiciones de filtrado (`FECHAINI`, `FECHAFIN`, estación/es, tipos de vehículo, servicio, inspección, fase, resultado, matrícula, bastidor, marca, modelo, bloque, defecto, subdefecto, elemento, umbrales de frenado, emisiones, opacidad y OBD) se inyectan mediante **Bind Variables (`OracleParameter`)**.
   - Soporte 1:1 del comodín `*` de la aplicación de escritorio (convertido de forma segura a `%` con `UPPER(...) LIKE :p_...` parametrizado).
2. **Proyección Dinámica Blanca (Whitelist de Metadatos)**:
   - Las columnas seleccionadas por el usuario se validan contra el catálogo cacheado en memoria de `CAMPOS_*LOCALIZADOS` (`NOMBRE_MOSTRAR`, `VALOR`, `ENCABEZADO_TABLA`, `POR_DEFECTO = -1`). Ningún identificador SQL arbitrario viaja desde el navegador.
3. **JOIN Condicional de `LISTA_DEFECTOS`**:
   - La subconsulta agregada `LISTAGG(ID.CODBLOQUE || '.' || ...)` sobre `INSPECCION_DEFECTO` es costosa en rangos amplios. El motor SQL solo incluye el `LEFT JOIN` a `LISTA_DEFECTOS` cuando el usuario solicita explícitamente dicha columna en su selección de campos.
4. **Prevención de `ORA-01791: not a SELECTed expression`**:
   - Dado que las consultas de localización utilizan `SELECT DISTINCT` con columnas dinámicas elegidas por el usuario, el `ORDER BY` se resuelve por posición ordinal de las columnas proyectadas (`ORDER BY 1, 2`), evitando fallos de Oracle cuando el usuario desmarca `ESTACION` o `FECHA_ENTRADA`.
5. **Filtro de Sin Inspección Periódica Posterior (`NOT EXISTS`)**:
   - En `loc-inspecciones`, la opción *"Sin insp. periódica posterior"* reemplaza la subconsulta correlacionada lenta del legacy por un `NOT EXISTS` indexado sobre `INSPECCION` y `TIPO_INSPECCION`.
6. **Paginación Server-Side y KPIs en Una Sola Pasada**:
   - La tabla web recibe páginas acotadas (`25`, `50`, `100` filas) mientras el backend calcula los 4 KPIs ejecutivos y las distribuciones para gráficos (Top Estaciones y Resultado/Calificación) sin transferir decenas de miles de filas por JSON.
7. **Protección frente a `ORA-01013` en Carga de Catálogos y `StrictMode`**:
   - Las consultas ligeras de metadatos y combos (`ObtenerColumnasMetadataAsync`, `ObtenerCatalogosComunesAsync`, `ObtenerBloquesLocalizacionAsync`, `ObtenerElementosLocalizacionAsync`, `ObtenerSubdefectosLocalizacionAsync`) utilizan `CancellationToken.None` al poblar la caché en memoria para que el doble montaje de `React.StrictMode` o un cambio rápido de filtro no dispare `System.OperationCanceledException: ORA-01013` en el depurador de Visual Studio, además de sincronizar `useLocalizacionReport.ts` (`catalogLoadedRef`) para evitar lanzar dos consultas simultáneas en el arranque.

---

## 3. Fidelidad 1:1 en Exportación Excel (`InformesLocalizacionService.cs`)

El servicio de exportación con `ClosedXML` réplica exactamente el formato generado por `ExportarExcel()` en `frmCriteriosLocalizacion*.vb`:
- **Nombre de hoja oficial** según el modo (`INSPECCIONES_LOCALIZADAS`, `DEFECTOS_LOCALIZADOS`, `ELEMENTOS_LOCALIZADOS`, `MEDICIONES_LOCALIZADAS`).
- **Cabeceras dinámicas** en fila 1 usando `ENCABEZADO_TABLA` de las columnas seleccionadas por el usuario (con estética corporativa TÜV SÜD `#003366`, texto blanco en negrita y autofiltro).
- **Saneamiento de fechas nulas o corruptas**: Cualquier `FECHA_ULTIMA_ITV` anterior al año `1980` se exporta en blanco, idéntico al comportamiento del cliente pesado.
- **Bloque de trazabilidad de filtros aplicados**: En la fila `Rows.Count + 4`, columna `A`, se estampan en negrita `"Filtros aplicados en la búsqueda:"` seguido en las filas inferiores por cada criterio activo (`resumenFiltros`).

---

## 4. Estructura de Archivos Implementados

### Backend (`.NET 10`)
- `src/CentralDatos.Application/Features/Informes/DTOs/LocalizacionDtos.cs`
- `src/CentralDatos.Application/Features/Informes/Interfaces/IInformesLocalizacionService.cs`
- `src/CentralDatos.Application/Features/Informes/Interfaces/IInformesRepository.cs`
- `src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs`
- `src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs`
- `src/CentralDatos.Api/Endpoints/Informes/InformesEndpoints.cs`

### Frontend (`React 19 + TypeScript + @tuvsud/design-system`)
- `src/central-datos-web/src/features/inspecciones/types/localizacion.types.ts`
- `src/central-datos-web/src/features/inspecciones/api/localizacionApi.ts`
- `src/central-datos-web/src/features/inspecciones/hooks/useLocalizacionReport.ts`
- `src/central-datos-web/src/features/inspecciones/components/LocalizacionColumnSelectorModal.tsx`
- `src/central-datos-web/src/features/inspecciones/pages/InspeccionesHubPage.tsx`
- `src/central-datos-web/src/features/inspecciones/pages/LocalizacionReportPage.tsx`

---

## 5. Estandarización Visual y Ajustes UI/UX (`v2.29.1`)

Se aplicó una homologación integral de la interfaz en `LocalizacionReportPage.tsx`, `LocalizacionColumnSelectorModal.tsx`, `ReportDonutChart.tsx` y `AppTooltip.tsx` siguiendo el estándar corporativo de la aplicación:

1. **Botones y Filtros Generales**:
   - **Acciones en cabecera superior derecha**: Los botones `"Seleccionar campos"` y `"Exportar a Excel"` se ubican agrupados arriba a la derecha en `ReportPageHeader`.
   - **Botón único `"Consultar"`**: Se fusionan `"Consultar"` y `"Filtrar Grid"` en un único botón principal `"Consultar"` (además de soportar tecla `Enter` en cualquier input de criterios) que aplica todos los filtros sobre la consulta.
   - **Criterios divididos en 2 pestañas independientes**: En `loc-inspecciones`, los filtros avanzados se organizan en 2 pestañas claras (`1. Datos Vehículo y Vencimiento` y `2. Titular / Cliente Facturación`), cada una con contador de criterios activos y su propio botón `"Limpiar filtro..."`.
   - **KPI 4 `"Criterios de Búsqueda Activos"`**: Se mejora la claridad y funcionalidad del cuarto KPI mostrando un tooltip interactivo con el desglose completo de filtros aplicados y navegación directa con scroll suave hacia el pie de auditoría al hacer clic.
   - **Pie de filtro con código + nombre de estación**: El resumen de estaciones concatena el código y el nombre completo (`0202 - ALBACETE, ...`).

2. **Modal `"Seleccionar campos"` (`LocalizacionColumnSelectorModal.tsx`)**:
   - Cabecera con degradado azul corporativo más claro (`linear-gradient(135deg, #0046ad 0%, #1d63c8 100%)`).
   - Píldora inferior de conteo (`14 de 81 columnas seleccionadas`) con espaciado tipográfico holgado (`display: inline-flex; gap: 5px`).
   - Posición y estilo estandarizados de los botones de acción a la derecha del pie (`Cancelar` / `Aceptar`).

3. **Grid `"Listado Detallado (INSPECCIONES_LOCALIZADAS)"`**:
   - **Cabecera y hover unificados**: Cabecera en azul corporativo `#0046ad` (`.cd-table-th` / `.cd-table-th-active`) con texto blanco y efecto hover de fila en `#edf5ff`.
   - **Primera columna fija (`Frozen`) `"Ficha"`**: El botón azul `"Ficha"` se fija como primera columna inamovible a la izquierda (`position: sticky; left: 0`) tanto en `<thead>` como en `<tbody>`.
   - **Barra superior de controles del grid**: A la izquierda, buscador rápido con placeholder explícito; a la derecha, paginador superior (`Página 1 de X` + botones de navegación) y selector de `"Registros por página"` agrupados en una sola línea.
   - **Ordenación visual y cronológica en cabeceras**: Iconos de ordenación arriba/abajo (`SortIndicator`) de alto contraste y soporte de ordenación cronológica real para fechas en formato `DD/MM/YYYY` (`parseSpanishDate`).
   - **Paginación inferior con estándar de usabilidad**: Al cambiar de página desde el paginador inferior, se realiza `scrollIntoView({ behavior: 'smooth', block: 'start' })` hacia la cabecera del grid.

4. **Gráficos y Tooltips**:
   - Botones de conmutación de gráficos con iconos oficiales (`bar_chart` y `pie_chart`).
   - Tooltips (`AppTooltip.tsx`) unificados con fondo degradado azul corporativo suave (`#eff6ff` -> `#ffffff`) y borde `#bfdbfe`.
   - Ranking de barras por estación con colores corporativos diferenciados para estaciones **ATISAE** (`#0046ad` azul) y **CAL** (`#00875a` verde) y etiqueta completa `Código - Nombre`.
   - Gráfico circular (`ReportDonutChart.tsx`) con leyenda lateral derecha dotada de scroll vertical compacto (`maxHeight: 205px`) para reducir la altura total de la tarjeta.

5. **Exportación a Excel**:
   - La exportación a Excel se ejecuta estrictamente con los filtros globales de la consulta SQL (`buildPayload()`), ignorando cualquier filtro visual/local del buscador rápido del grid, idéntico al comportamiento de la aplicación de escritorio.

### 5.1 Segunda iteración UI/UX (contención del grid y KPIs accionables)

- **KPIs con acción real al hacer clic** (y teclado `Enter`/`Espacio`, clase `.cd-kpi-action` con realce *hover*/foco):
  1. *Registros Localizados* → limpia el buscador local, desplaza al listado y pone el foco en el buscador.
  2. *Estaciones con Datos* → abre el gráfico *Ranking Barras* por estación y desplaza hasta él.
  3. *Columnas Activas* → abre el selector de campos.
  4. *Criterios de Búsqueda Activos* → desplaza al pie de filtros.
  - La sección de destino se resalta brevemente (Web Animations API) para que la acción sea evidente.
- **Cabecera del grid**: título y contador *"Mostrando X de Y registros (N columnas)"*, con el **buscador justo debajo**; a la derecha solo el selector *"Registros por página"*. **La paginación queda únicamente abajo.**
- **Contención del grid**: el listado deja de usar `TsCard` (que crecía con el contenido) y pasa a un contenedor `section` con `width/maxWidth: 100%` y `minWidth: 0`. La tabla hace *scroll* interno en ambos ejes (`max-height: min(68vh, 760px)`, `60vh` en móvil) con **cabecera sticky** y **columna "Ficha" fija** en la esquina (`top: 0; left: 0`). Se elimina el ancho mínimo artificial de 1100 px.
- **Pie de filtros ajustado al ancho del grid**: los criterios simples se muestran como *chips* que saltan de línea y las **estaciones se listan una por línea (`Código - Nombre`)** en columnas responsivas (`grid auto-fill minmax(230px, 1fr)`).

### 5.2 Ajustes de usabilidad UI/UX (`v2.29.1`)

- Esta revisión sustituye la interacción por clic descrita en la iteración anterior: los KPI son informativos, conservan sus tooltips descriptivos y no anuncian acciones.
- **Acciones junto a los filtros**: `"Seleccionar campos"` y `"Exportar a Excel"` quedan alineados a la derecha, inmediatamente encima de `"Consultar"`.
- **KPIs informativos**: las cuatro tarjetas no son clicables y conservan sus tooltips descriptivos, sin textos que insinúen una acción.
- **Acción del grid**: se mantiene la cabecera fija `"Ficha"` y cada fila muestra un botón `"Ver"` con fondo blanco y borde/texto azules.
- **Ancho del gráfico**: el bloque del gráfico por estación ocupa el 100 % del contenedor, alineado con la región de KPIs.
- Se conserva el título del grid `"Listado Detallado (INSPECCIONES_LOCALIZADAS)"`.

### 5.3 Ajustes de disposición UI/UX (`v2.29.2`)

- Se eliminan los nombres de formularios `frmCriterios...` de los subtítulos visibles.
- Los botones de selección de campos y exportación quedan fuera del contenedor de filtros, alineados a la derecha en una sola fila.
- Los KPI mantienen tooltips personalizados con sus datos de contexto y no son clicables.
- Se amplía la separación vertical entre el encabezado del listado y su contador.
- El contenedor del gráfico donut ocupa el ancho disponible completo, igual que el de barras.

### 5.4 Revisión de navegación y selectores (`v2.29.3`)

- Se verificó la correspondencia de los cuatro localizadores entre tarjetas del hub, menú, rutas hash y componentes de página.
- Los fallos al cargar las listas dependientes de sección/bloque/defecto se muestran como error en la página, evitando combos vacíos sin explicación.
