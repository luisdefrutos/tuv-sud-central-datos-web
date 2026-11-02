# Registro Histórico de Cambios (Changelog)

Todas las modificaciones notables de este proyecto se documentan en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico.

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

## [1.1.0] - 29/10/2026 — *Optimizaciones de Rendimiento y Negocio* (Commit: `cca987e`)

### Añadido
* Migración de consultas SQL nativas sobre `CENTRALITV.PARAMETROS_ESTACIONES` a **Dapper con ODP.NET Thin**.
* Constantes de negocio de sociedades (`ATISAE` código `01`, `CAL` código `02`).
* Filtrado operativo de las 29 estaciones oficiales activas de TÜV SÜD.
* Componente vectorial corporativo del logotipo TÜV SÜD (`TuvSudLogo.tsx`).
* Soporte para conexión directa a Oracle `ORCLDV` por puerto TCP `1521` eliminando el doble salto SOAP.

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

