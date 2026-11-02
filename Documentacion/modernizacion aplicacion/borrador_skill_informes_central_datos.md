# ==============================================================================
# SKILL: tuv-sud-central-datos-informes
# DESCRIPCIÓN: Estándar y Patrones Oficiales de Desarrollo de Informes
#              para la Modernización Web de Central Datos ITV (TÜV SÜD)
# STACK: .NET 10 Web API (ODP.NET Thin + ClosedXML) + React 19 (TypeScript + Algorithm DS)
# ==============================================================================

---
name: tuv-sud-central-datos-informes
description: Guía, estándares y patrones oficiales obligatorios para el desarrollo de módulos de informes y exportaciones en Central Datos Web (TÜV SÜD).
---

# ESTÁNDAR OBLIGATORIO DE INFORMES — CENTRAL DATOS WEB

Este documento define el patrón arquitectónico, reglas de negocio y diseño visual que DEBEN seguirse en TODOS los informes de Central Datos. Ningún informe debe implementarse de forma aislada o improvisada; todos deben reutilizar la infraestructura común y replicar fielmente el comportamiento validado.

---

## 1. ARQUITECTURA GENERAL: "THICK SERVER / THIN CLIENT"

1.1. RESPONSABILIDADES:
  - Backend (.NET 10): Es el ÚNICO responsable del cálculo de KPIs ejecutivos, agregaciones, porcentajes, categorizaciones, ordenaciones previas de negocio y generación de archivos Excel.
  - Frontend (React 19): Se limita a consumir DTOs ya calculados y representarlos fielmente. NUNCA debe recalcular sumas globales, promedios o KPIs pesados en el navegador.

1.2. DOBLE VALIDACIÓN ESTRICTA:
  - Cliente (Frontend): Validación reactiva antes del envío mediante `useReportFilters` / `validarRango`.
  - Servidor (Backend): Validación obligatoria en Application Service mediante `ReportDateRangeValidator.Validar(inicio, fin)`. Arroja `ArgumentException` (HTTP 400) si la petición burla al cliente.

---

## 2. GESTIÓN DE FECHAS Y REGLAS DE BÚSQUEDA

2.1. FECHAS POR DEFECTO (REPLICAR LA APP DE ESCRITORIO EN CADA INFORME):
  - Las fechas iniciales y finales NO son fijas ni genéricas; **DEBEN replicar exactamente el comportamiento del formulario correspondiente de la app de escritorio** (`frmCriterios.vb`, `frmCriteriosExcel.vb`, etc.).
  - Por ejemplo:
    - En la mayoría de informes de `frmCriterios.vb`: se cargan por defecto desde el día de ayer (`DateAdd(Day, -1, Now)`) hasta hoy (`Now`).
    - En comparativas anuales (`frmCriteriosExcel.vb`): se cargan dos rangos comparativos (año anterior vs año en curso).
    - En informes específicos: se utilizará el rango propio que tuviese configurado ese informe en la app legacy.
  - La infraestructura web (`useReportFilters`) admite `defaultFechaInicio` y `defaultFechaFin` parametrizables por informe.

2.2. LÍMITE DE RANGO MÁXIMO (PROTECCIÓN GLOBAL):
  - Máximo permitido: 1 año natural / bisiesto (366 días) para evitar saturación de memoria y tiempos de espera en consultas masivas.
  - La fecha fin no puede ser anterior a la fecha de inicio.
  - Distintivo visual obligatorio en la barra de filtros: `ℹ️ Rango máx. 1 año` con tooltip informativo (`AppTooltip`).

2.3. REGLA DE ORO DE BÚSQUEDA (DISPARO DE CONSULTAS):
  - SELECTORES DE FECHAS (Desde / Hasta): **NUNCA DEBEN BUSCAR DIRECTAMENTE AL CAMBIAR**. Esperan siempre a que el usuario pulse el botón "Consultar" o presione la tecla Enter (formulario con `onSubmit` nativo).
  - FILTROS RÁPIDOS (Fase: Todas / 1ª / 2ª; Sociedad: Todas / TSA / CAL; Selector de Estaciones): **SÍ DISPARAN LA BÚSQUEDA INMEDIATAMENTE**, actualizando al instante KPIs, gráficos y tablas.
  - DEBOUNCE OBLIGATORIO: Todo filtro rápido interactivo debe usar un retardo *debounce* de 250 ms con `AbortController` para cancelar la petición anterior y evitar colisiones de sockets concurrentes en Oracle.

2.4. COMPORTAMIENTO ANTE FECHAS INVÁLIDAS (> 366 DÍAS O FIN < INICIO):
  - Mostrar banner corporativo `<TsAlert variant="warning" open heading="Validación de Rango de Fechas">` (usar `ReportDateRangeAlert`).
  - Incluir botón interactivo *"Ajustar a 1 año"* que recalcula automáticamente la fecha fin (`fechaInicio + 1 año - 1 día`) y cierra la alerta.
  - **VACIADO PREVENTIVO DE DATOS (`setData(null)`)**: Si las fechas son inválidas, se limpian inmediatamente el grid y los KPIs. NUNCA dejar datos obsoletos en pantalla que contradigan los selectores de fecha visibles.
  - MENSAJE EN TABLA VACÍA: Mostrar *"Indique un rango de fechas válido (máximo 1 año) para realizar la consulta."*

---

## 3. ESTÁNDAR VISUAL Y COMPONENTES (TÜV SÜD ALGORITHM DS)

3.1. CABECERA:
  - Usar siempre `ReportPageHeader`.
  - Miga de pan interactiva: `Inicio > Informes > [Nombre Informe]`.
  - Botón de navegación: `← Volver a Informes`.
  - PROHIBIDO añadir insignias o badges de "Oficial" junto al título. Título limpio con icono temático y subtítulo descriptivo.

3.2. BARRA DE FILTROS:
  - Usar siempre `ReportFiltersBar`.
  - Respetar `allowedStations`: los usuarios no supervisores solo pueden ver y consultar sus estaciones autorizadas.
  - Desplegable de estaciones flotante con z-index elevado y posicionamiento absoluto sin cortes.

3.3. SELECTOR DE VISTA DE GRÁFICOS:
  - Ubicación obligatoria: Alineado a la derecha (`justifyContent: 'flex-end'`).
  - Diseño: Botonera segmentada unificada (`border: 1px solid #cbd5e1`, botón activo con fondo `#0046ad` y texto blanco, inactivo fondo `#ffffff` y texto `#334155`).

3.4. GRÁFICOS Y TOOLTIPS:
  - PROHIBIDO el atributo HTML nativo `title="..."`. Usar siempre el componente corporativo `AppTooltip`.
  - Formateador de valores contextual: solo usar `€` en facturación; en defectos o inspecciones usar `def.` o `insp.`.
  - Gráficos de barras (`ReportBarChart`): Altura con scroll vertical (`maxHeight: '380px'`) para mostrar la totalidad de estaciones de la red sin corte de textos.

---

## 4. ESTÁNDAR DEL GRID Y TABLA DETALLADA

4.1. ESTRUCTURA FIJA Y CONTROL DE SCROLL:
  - Usar `table-layout: fixed` y `<colgroup>` con anchos en píxeles predefinidos para TODAS las columnas.
  - Definir un `minWidth` global en la tabla (ej. 1100px - 1210px) para que el scroll horizontal sea estable y no parpadee al paginar.
  - Celdas con texto variable (`Estación`, `Vehículo`): usar `overflow: hidden`, `textOverflow: 'ellipsis'`, `whiteSpace: 'nowrap'` y envolver en `AppTooltip`.

4.2. AISLAMIENTO DE COLUMNAS ESTRECHAS:
  - Dar ancho suficiente a pastillas y badges (ej. `Gravedad` mínimo 150px para alojar `Defecto Grave (DG)`).
  - Formatear columnas como `Fase` como píldoras centradas (`textAlign: 'center'`, padding y borde sutil) para evitar invasión visual con columnas vecinas.

4.3. HOVER INTERACTIVO OBLIGATORIO:
  - Cada fila `<tr>` debe tener `transition: background-color 0.15s ease`.
  - `onMouseEnter`: Cambiar fondo al azul suave corporativo TÜV SÜD (`#edf5ff`).
  - `onMouseLeave`: Restaurar color de fila alternada (`#ffffff` en pares, `#f8fafc` en impares).

4.4. ORDENACIÓN Y PAGINACIÓN:
  - ORDENACIÓN GLOBAL PREVIA: Al hacer clic en una cabecera de columna, la ordenación debe ejecutarse sobre **TODO el array de datos antes de paginar**, reseteando siempre a la página 1.
  - Indicadores de ordenación: Usar `<SortIndicator direction={...} />`.
  - Paginación: Selector combo configurable (`50`, `100`, `200`, `500` por página) y botones (« Primera, ‹ Anterior, indicador Página X de Y, Siguiente ›, Última »).
  - Contador: `"Mostrando 50 de X registros"` (usar `unidadRegistros="registros"` en `ReportTableContainer`).

4.5. FICHA TÉCNICA DE DETALLE:
  - Columna final "Detalle" con botón `🔍 Ficha` que abre un modal flotante con todos los datos técnicos de la inspección.

---

## 5. EXPORTACIÓN A EXCEL (.XLSX) Y PROTECCIÓN DEL SERVIDOR

5.1. ESTRUCTURA DEL ARCHIVO:
  - Fidelidad 1:1 con la aplicación de escritorio (`frmCriterios.vb`).
  - Si el informe original generaba pestañas por estación, crear hojas independientes nombradas `{PREFIJO}_{CodEstacion}` (ej. `DEFECTOS_OBD_4004`, `SIN_INSPECTOR_4004`).
  - Cabeceras en negrita, sombreado gris claro corporativo (`#F1F5F9`) y ajuste automático de columnas (`AdjustToContents()`).

5.2. MODAL BLOQUEANTE Y BOTÓN INACTIVO:
  - Durante la descarga, mostrar obligatoriamente `BlockingLoadingModal` con spinner corporativo y mensaje explicativo.
  - Botón "Exportar a Excel" deshabilitado (`disabled`) si `isLoading`, `isExporting` o no hay datos (`!data || data.filas.length === 0`).

5.3. PROTECCIÓN DEL SERVIDOR (OPCIONAL / CONFIGURABLE):
  - En servidores con recursos ajustados, se puede activar limitación de concurrencia en /exportar-excel.
  - El límite es 100% configurable (o desactivable) según la memoria RAM del servidor y el volumen real de peticiones concurrentes.
  - No es obligatorio si el servidor cuenta con recursos holgados o hay pocas exportaciones anuales simultáneas.

---

## 6. BASE DE DATOS Y SQL DE ALTO RENDIMIENTO (ORACLE)

6.1. OPTIMIZACIÓN CBO Y EVITAR FULL TABLE SCANS:
  - NUNCA lanzar consultas con filtrado primario sobre columnas no indexadas en tablas de 50M de filas (`CENTRALITV.INSPECCION_DEFECTOS`).
  - Conducir siempre la consulta desde `CENTRALITV.INSPECCION i` utilizando el índice de fecha `P17_INSPECCION` y uniendo a estaciones y defectos mediante **Nested Loops** (`/*+ LEADING(i ...) USE_NL(...) */`).

6.2. BLINDAJE DE CANCELACIÓN Y RED:
  - Capturar `OracleException` con código `12570` cuando `cancellationToken.IsCancellationRequested` para evitar interrupciones innecesarias en el depurador de Visual Studio.
  - Reintento automático con pool limpio (`ClearPool`) ante errores transitorios de red (`12541`, `12571`, `3113`, `3114`).
  - Timeout de comando: Configurar `cmd.CommandTimeout = 120` segundos.

---

## 7. PIEZAS BASE OBLIGATORIAS A REUTILIZAR

En lugar de reescribir código en cada informe, DEBEN utilizarse siempre las siguientes piezas comunes ya creadas:

  FRONTEND:
  - `useReportFilters`: Gestión de fechas, sociedad, estaciones, fase, debounce y validación.
  - `useReportTable`: Búsqueda, ordenación global y paginación reactiva.
  - `ReportPageHeader`: Cabecera corporativa con miga de pan y botones.
  - `ReportDateRangeAlert`: Banner de aviso con botón "Ajustar a 1 año".
  - `ReportFiltersBar`: Barra unificada de filtros con dropdown de estaciones.
  - `ReportTableContainer`: Contenedor de tabla con búsqueda y contador de registros.
  - `ReportBarChart` / `ReportDonutChart`: Gráficos oficiales con `AppTooltip`.
  - `BlockingLoadingModal`: Modales bloqueantes de carga y exportación.

  BACKEND:
  - `ReportDateRangeValidator`: Validación unificada de 366 días y ajuste a las 23:59:59.
  - `excel-export-policy`: Limitador de concurrencia en `InformesEndpoints.cs`.

---

## 8. CHECKLIST DE ENTREGA PARA CADA NUEVO INFORME

Antes de dar por completado un informe, verificar:
- [ ] Backend compila con 0 errores y 0 advertencias (`dotnet build`).
- [ ] Frontend compila y empaqueta limpiamente (`npm run build`).
- [ ] El informe aparece en el catálogo de informes (`InformesHubPage.tsx`) y en el menú oficial (`navigation.constants.ts`).
- [ ] La navegación resiste la recarga F5 y mantiene el hash `#/modulo/...` en la URL.
- [ ] El rango > 366 días muestra la alerta, el botón "Ajustar a 1 año" y vacía la tabla.
- [ ] Los filtros rápidos refrescan con debounce de 250 ms.
- [ ] Las fechas NO buscan al cambiar de día.
- [ ] El grid tiene anchos fijos, tooltip en textos largos y hover `#edf5ff` en filas.
- [ ] La exportación a Excel genera las hojas oficiales y muestra el modal bloqueante.
- [ ] Documentación sincronizada en `CHANGELOG.md` y en `Documentacion/modernizacion aplicacion/`.
- [ ] PROHIBIDO AUTO-COMMIT: Esperar instrucción expresa del usuario para commitear.

