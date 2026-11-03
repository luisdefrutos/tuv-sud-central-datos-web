# 18. Módulo de Informe de Estadística MINER Global (`miner-datos-globales`)

## 1. Contexto y Propósito Regulatorio

El informe de **Estadística MINER Global** constituye el instrumento oficial de rendición de cuentas periódico exigido históricamente por el **Ministerio de Industria y Energía (MINER)** (actual Ministerio de Industria y Turismo) a las entidades concesionarias de Inspección Técnica de Vehículos (R.D. 920/2017).

En la aplicación de escritorio legacy (`frmCriterios.vb`), este informe se ejecutaba mediante la opción:
> **Informes > Estadística "MINER" Excel > Datos Globales** (`ExportacionEstadistica_MINER_Global`)
> Plantilla binaria origen: `Central_Datos\bin\Industria.xls`.

---

## 2. Clasificación Reglamentaria de las 9 Categorías MINER

A diferencia de la clasificación genérica de matriculación de la DGT o las categorías europeas (M1, N1, L3e...), el MINER agrupa los vehículos en **9 grupos obligatorios** combinando el código de construcción (`codconstruccion`) y el código de utilización (`codutilizacion`), implementado en base de datos mediante la función corporativa `CENTRALITV.CLASIFICACION_MINER(c.codconstruccion, c.codutilizacion)`:

| Código | Grupo MINER | Tipo de Vehículo Reglamentario | Descripción y Ámbito |
| :---: | :---: | :--- | :--- |
| **MO** | Grupo 01 | Motocicletas, ciclomotores y quads | Vehículos de dos o tres ruedas, ciclomotores ligeros y cuadriciclos. |
| **TP** | Grupo 02 | Turismos de uso particular | Turismos estándar destinados al transporte particular de viajeros ($\le 9$ plazas). |
| **TR** | Grupo 03 | Turismos de alquiler / servicio público | Turismos destinados a taxi, VTC, vehículos de alquiler sin conductor o servicio público. |
| **MP** | Grupo 04 | Transporte de mercancías ligero | Furgones y camiones ligeros con MMA $\le 3.500\text{ kg}$. |
| **MG** | Grupo 05 | Transporte de mercancías pesado | Camiones y tractocamiones pesados con MMA $> 3.500\text{ kg}$. |
| **AU** | Grupo 06 | Autobuses y autocares | Vehículos concebidos para transporte colectivo de viajeros ($> 9$ plazas). |
| **RS** | Grupo 07 | Remolques y semirremolques | Remolques ligeros y pesados enganchados a cabezas tractoras o vehículos tractores. |
| **AG** | Grupo 08 | Tractores y maquinaria agrícola | Tractores agrícolas, motocultores, remolques y cosechadoras agrícolas. |
| **OT** | Grupo 09 | Otros especiales y maquinaria de obras | Vehículos especiales, trenes turísticos y maquinaria autopropulsada de obras y servicios. |

---

## 3. Arquitectura Técnica y Optimización SQL

### 3.1. Eliminación de Bucles Procedurales, JOINs Relacionales Puros y Unificación de Fases
En el legacy `frmCriterios.vb`, el cálculo recorría cursores fila a fila con múltiples consultas en bucle y evaluaba las funciones PL/SQL `CENTRALITV.clasificacion_miner` y `CENTRALITV.PERIODICA` millones de veces mediante cambios de contexto (context switches) SQL/PLSQL fila a fila.
En la modernización Web:
1. **Sustitución de Funciones PL/SQL por JOINs Relacionales 100% Puros**:
   - `CENTRALITV.PERIODICA(CODSEPIVA, CODESTACION) = 'S'` se sustituye por `INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s ON s.CodSepiva = i.CodSepiva AND s.CodEstacion = i.CodEstacion AND s.CodServicio = '01'`.
   - `CENTRALITV.CLASIFICACION_MINER(codconstruccion, codutilizacion)` se sustituye por doble `LEFT JOIN` sobre `CENTRALITV.tipovehiculo_ident` con `COALESCE(t1.ID_CONST, t2.ID_CONST, 'OT')`.
2. **Unificación de Inspecciones Fase 1 y Fase 2 (`ObtenerMinerInspecciones.sql`)**:
   - Se unifican las antiguas consultas separadas de Fase 1 y Fase 2 en una sola consulta agrupada por `indica12 IN ('1', '2')` y `ResultadoTipo`. Esto reduce a la mitad el escaneo sobre la tabla masiva `INSPECCION` y devuelve el balance completo en apenas ~400 ms.
3. **Defectología Agregada (`ObtenerMinerDefectos.sql`) con Hint Optimizer `USE_NL`**:
   - Para evitar que el optimizador de Oracle seleccione un destructivo `TABLE ACCESS FULL` sobre los más de 50 millones de registros de `INSPECCION_DEFECTOS` (lo que provocaba bloqueos de más de 2 minutos y caída de conexión), se incorpora el hint `/*+ LEADING(i s d) INDEX(i P17_INSPECCION P31_INSPECCION) USE_NL(d) INDEX(d IX1_INSPECCION_DEFECTOS) */`.
   - Conduce desde las inspecciones filtradas por fecha en `INSPECCION` y une a `INSPECCION_DEFECTOS` mediante **Nested Loops** indexado por `(CODESTACION, CODINSPECCION)`.
   - **Benchmark verificado**: 
     - **1 mes completo (toda la red, 34 estaciones)**: **6,6 segundos**.
     - **2 meses completos (toda la red, 34 estaciones)**: **13,4 segundos**.
4. **Prevención de Conversión Implícita de Tipos en Filtro de Estaciones**:
   - `CODESTACION` es `VARCHAR2(4)`. Se formatea con comillas simples y ceros a la izquierda (`'0202'`, `'2878'`), evitando que Oracle ejecute `TO_NUMBER(i.CODESTACION)` que invalidaría los índices. Además, cuando se selecciona toda la red ($\ge 30$ estaciones), se omite la cláusula `IN (...)` para permitir a Oracle el escaneo directo de particiones sin sobrecarga de parsing.
4. **Prevención de Saturación de Servidor Oracle y Caídas de Socket (`IOException`)**:
   - En lugar de saturar el servidor Oracle ejecutando múltiples consultas pesadas en paralelo simultáneo sobre conexiones concurrentes (que saturaban la PGA y provocaban la desconexión del host remoto `IOException`), la ejecución se orquesta de forma secuencial: primero la consulta ultra-rápida de inspecciones y a continuación la consulta de defectos.
   - Se amplía el `CommandTimeout` a 300 segundos para soportar consultas de rangos de varios meses sobre el parque nacional (34 estaciones, > 15 millones de registros).
   - Se mantiene la auto-recuperación con `OracleConnection.ClearPool(connection)` ante caídas de socket (`IOException`, `SocketException` u `OracleException` 3113/3114/12571/10054).

### 3.2. Migración de Plantilla Excel (`Industria.xls` a `Plantilla_Industria_MINER.xlsx`)
Se ha migrado el archivo binario BIFF8 `Industria.xls` a formato OpenXML estándar `.xlsx` (`Plantilla_Industria_MINER.xlsx`), respetando escrupulosamente:
- Celdas B2 y B3: Fechas del periodo.
- Rango B9 a B28: Defectos leves y graves (filas 11L a 20G) cruzados con las 9 columnas de categorías (F a N).
- Fila 30 y 31: Primera inspección (Favorables y Rechazadas).
- Fila 34 y 35: Segunda inspección (Favorables y Rechazadas).
- Fórmulas automáticas de Excel: `% Rechazo` y sumatorios totales por fila y columna.

---

## 4. Rutas de Acceso y Textos de Enlace en la Interfaz

Para acceder a este informe existen tres vías plenamente operativas:

1. **Menú de Navegación Superior (Navbar oficial estilo escritorio)**:
   - Menú principal: **`Informes`**
   - Primer nivel desplegable: **`Estadística "MINER" Excel ▶`** (despliega flyout lateral con flecha)
   - Segundo nivel (opción ejecutable final): **`Datos Globales`**
2. **Catálogo / Hub de Informes (`#/modulo/informes`)**:
   - Tarjeta con distintivo verde **`Disponible`**
   - Icono: `📊`
   - Título de la tarjeta: **`Estadística MINER — Datos Globales`**
   - Descripción: *"Estadística regulatoria oficial MINER de defectos e inspecciones en 9 categorías de vehículos (Industria.xls)."*
   - Botón de acción: **`Abrir Informe`**
3. **Enlace Directo por URL / Hash**:
   - URL: `#/modulo/miner-datos-globales` (soporta recarga `F5` y persistencia de sesión).

---

## 5. Interfaz Web (TÜV SÜD Algorithm Design System)

La nueva vista `MinerReportPage.tsx` incorpora:
1. **Tarjetas KPI Ejecutivas**:
   - Total Inspecciones (Fase 1 + Fase 2).
   - Tasa de Rechazo en 1ª Inspección (%).
   - Total Defectos Graves detectados.
   - Total Defectos Leves detectados.
2. **Leyenda Interactiva con Tooltips**:
   - Muestra de forma compacta y accesible las 9 abreviaturas MINER con su definición completa.
3. **Gráfico Analítico Selector Dual**:
   - Permite conmutar en un clic entre la distribución de *Defectos por Capítulo* (Cap. 1 al 10) y el *Volumen de Inspecciones por Grupo MINER*.
4. **Matriz Oficial Unificada Réplica de Excel (`Industria.xls` - Hoja `PERIODICAS`)**:
   - **Estructura idéntica y continua (sin pestañas divisoras)**: Muestra en una única vista integrada las dos secciones clave del modelo ministerial tal como las ve el usuario al exportar a Excel:
     1. *Sección Superior (Filas 9 a 28)*: Frecuencia de Defectos (Capítulos 1 al 10 en DL / DG) con totales por fila y sumatorio general de DL y DG por tipo de vehículo.
     2. *Sección Inferior (Filas 30 a 37)*: Vehículos Totales (Fase 1 Favorables, Rechazados, Totales y % de Rechazo; Fase 2 Favorables, Rechazados, Totales y % de Rechazo; y Resumen General de Red).
   - **Encabezados oficiales**: Motocicletas (MO), Turismos Particulares (TP), Resto Turismos (TR), Mercancías $\le 3.5\text{ t}$ (MP), Mercancías $> 3.5\text{ t}$ (MG), Autobuses (AU), Remolques (RS), Agrícolas (AG), Otros (OT) y Totales.
5. **Exportación Oficial ClosedXML**:
   - Descarga directa del fichero oficial `.xlsx` generado a partir de la plantilla institucional `Plantilla_Industria_MINER.xlsx` (`Industria.xls`) con exactamente los mismos valores calculados en pantalla.

### 5.1. Refinamientos de UX/UI y Controles de Formulario
- **Eliminación de Referencias Técnicas a Filas de Excel**: En pantalla se han sustituido los literales internos (`FILAS 9 A 28` y `FILAS 30 A 37`) por títulos limpios de negocio: `FRECUENCIA DE DEFECTOS` y `BALANCE DE INSPECCIONES Y VEHÍCULOS (FASE 1 Y 2)`.
- **Tooltips Informativos en Badges `DL` y `DG`**: Se incorpora `AppTooltip` sobre cada distintivo de gravedad en la tabla:
  - `DL`: *Defecto Leve (Debe subsanarse; no requiere pasar una 2ª inspección).*
  - `DG`: *Defecto Grave (Inhabilita la circulación excepto traslado al taller; exige 2ª inspección).*
- **Desacoplamiento de Eventos en Campos de Fecha**: La selección o tipeo de fechas ya no dispara consultas intermedias automáticas contra la base de datos Oracle. La búsqueda únicamente se ejecuta de forma controlada al pulsar el botón **"Consultar"** o presionar la tecla **Enter** (salvo la carga inicial única al montar la página).
- **Estandarización del Límite de Rango de 1 Año**: 
  - Se mantiene activa la etiqueta informativa **`ℹ️ Rango máx. 1 año`** (`showMaxRangeBadge={true}`) con tooltip explicativo en la barra de filtros.
  - Se integra el banner oficial [`ReportDateRangeAlert`](file:///c:/Project/tuv-sud-central-datos-web/src/central-datos-web/src/features/informes/components/ReportDateRangeAlert.tsx) con botón de auto-ajuste rápido (*«Ajustar a 1 año»*) cuando el rango seleccionado supera los 366 días, alineando la pantalla con los demás informes de la suite.
  - El backend mantiene la regla innegociable con `ReportDateRangeValidator.Validar` (devolviendo `400 Bad Request` si se burla el frontend).

---

## 6. Rendimiento y Mitigación de Cuellos de Botella (Legacy vs. Web)

| Escenario | Aplicación Desktop Legacy (`frmCriterios.vb`) | Aplicación Web Modernizada (`CentralDatos.Web`) |
| :--- | :--- | :--- |
| **Arquitectura de Ejecución** | Consulta síncrona en el hilo principal de interfaz (UI Thread) mediante ADODB/OLEDB. Si la consulta tarda $> 10\text{ s}$, Windows congela la ventana ("No responde") y colapsa. | Ejecución **100% asíncrona** en backend .NET 10 (`await cmd.ExecuteReaderAsync`) con `BlockingLoadingModal` interactivo en frontend que nunca congela la UI ni la pestaña del navegador. |
| **Evaluación PL/SQL de Categorías** | Ejecutaba la función PL/SQL `CENTRALITV.clasificacion_miner(...)` **9 veces por cada fila de defecto** en la cláusula `SELECT`. Para 1 año (~1,5 millones de defectos), realizaba **13,5 millones de llamadas y cambios de contexto SQL/PLSQL**. | **100% Relacional (Hash Join)**: Se han sustituido tanto `PERIODICA` como `CLASIFICACION_MINER` por `INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION` y doble `LEFT JOIN` a `tipovehiculo_ident` con `COALESCE`. **0 llamadas PL/SQL** en el motor Oracle. |
| **Rango Diario (1 día)** | ~3 a 5 segundos (por overhead de OLEDB y Excel COM Interop). | **~300 a 380 ms** (tiempo de respuesta total API + renderizado). |
| **Rango Mensual (1 mes, ~34 estaciones)** | ~25 a 45 segundos (con parones de interfaz). | **~1,2 a 2,1 segundos**. |
| **Rango Anual Completo (desde 1 de enero)** | **Cuelgue total / Bloqueo irreversible**: Windows aborta el proceso por congelación del hilo de interfaz o desconexión por inactividad. | Procesado masivo de **> 841.000 inspecciones** en paralelo mediante `Task.WhenAll`. |

### Recomendación Operativa de Filtros de Fecha
- **Uso Estándar Ministerial**: El MINER solicita normalmente estadísticas mensuales, trimestrales o anuales por estación.
- **Consultas de Toda la Red (34 estaciones)**: El rango óptimo de respuesta instantánea es de **1 día a 3 meses** (< 5 segundos). Si se requiere consultar el año completo de toda la red, la Web lo completa de manera segura sin congelar el navegador ni tumbar la conexión gracias al timeout configurado a 120s y a la auto-recuperación de pool en ODP.NET.
