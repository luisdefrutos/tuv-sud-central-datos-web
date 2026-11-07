# 31. Plan de optimización — Localización de Inspecciones y exportación Excel

**Estado a 07/11/2026:** se implementó el límite SQL de 5.000 filas de detalle para Elementos y Defectos, la agregación por estación para esas consultas y la exportación XLSX streaming hasta 300.000 filas. La generación de Localización ahora se ejecuta en segundo plano y la descarga se inicia al finalizar. El plan Oracle real y la exportación representativa de 193.000 filas siguen pendientes de validación; no se atribuye una mejora de latencia sin esa medición.
**Alcance inicial:** `inspecciones` (primer localizador). Las pantallas de inspecciones, defectos, elementos y mediciones comparten el localizador y su comportamiento visual; Defectos reutiliza también la misma acción Excel.

**Actualización 06/11/2026:** se habilitaron en los cuatro localizadores los criterios de titular y cliente de facturación que ya existen en el contrato de consulta; los filtros de facturación incorporan el `LEFT JOIN` a `CLIENTES` en las consultas de defectos, elementos y mediciones solo cuando se usan. La búsqueda local mantiene el orden y filtra el índice precalculado, evitando reordenar filas por cada término.

**Diagnóstico y ajuste 07/11/2026 (Localización de Elementos y Defectos):** para total y conteos por estación, se ejecuta una agregación completa y después una consulta de detalle limitada a 5.000. En Defectos se añadió conducción desde `INSPECCION` por índices de fecha y nested loops hacia `INSPECCION_DEFECTOS`/`DEFECTOSSUB_SECCION`, siguiendo el patrón probado en otras consultas del proyecto; debe verificarse que el optimizador lo use con el SQL_ID de esta ruta. El límite se implementa envolviendo el `ORDER BY` en una subconsulta y aplicando `ROWNUM` exterior, compatible con versiones anteriores a Oracle 12c. El alias auxiliar de estación debe comenzar por letra; un alias sin comillas con prefijo `_` provoca `ORA-00911`. Esto evita transferir/procesar todo el detalle en la API, pero hace dos recorridos de los joins. Se añadió telemetría separada para agregación, apertura y lectura del cursor de detalle. En la exportación se sustituyeron los diccionarios por fila por arreglos posicionales para reducir asignaciones .NET; la generación sigue leyendo Oracle y escribiendo XLSX secuencialmente, pero ya no mantiene abierta la petición HTTP durante ese trabajo.

**Cuellos de botella por confirmar en Oracle:** (1) el agregado completo por estación sobre los joins de Elementos o Defectos; (2) el coste del segundo recorrido y del ordenamiento top-5.000; (3) si Oracle acepta/aplica los hints de índice/nested loops y estima bien la cardinalidad; (4) filtros con comodín inicial (`LIKE '%...%'`) o funciones sobre columnas, que pueden impedir accesos por índice. El filtro principal de fechas mantiene el predicado sargable. Los hints añadidos para Defectos siguen sin verificación en el plan de esta ruta; no hacer más ajustes ni retirar joins hasta comparar filas, `DBMS_XPLAN.DISPLAY_CURSOR(..., 'ALLSTATS LAST')`, lecturas lógicas y tiempo en Oracle.

**Pantalla de inspecciones defectos:** el segundo acceso del menú de Inspecciones usa una vista web independiente basada en la pantalla de escritorio: estación/fechas/fase, NIF, criterios compactos de vehículo y cascada sección/bloque/elemento/defecto. La vista reutiliza el contrato de consulta, selección de columnas y exportación del localizador de defectos. Muestra los KPI siempre visibles en un recuadro independiente con tooltips personalizados no interactivos; los gráficos por estación están en otro recuadro y tienen su propio control para mostrarlos u ocultarlos. El grid comparte con Localización búsqueda sobre los campos admitidos, ordenación global, paginación, contadores, hover y acceso a la ficha; las cabeceras permanecen fijas durante el scroll horizontal y vertical.

**Paridad pendiente de comprobar con escritorio:** los joins principales de `INSPECCION`, `INSPECCION_DEFECTOS` y `DEFECTOSSUB_SECCION` coinciden con la consulta legacy. Elementos conserva la comparación de fecha final a medianoche del escritorio; otros tipos de Localización extienden el final del día. La web valida un máximo de 366 días y permite exportar hasta 300.000 filas. No se debe afirmar equivalencia exacta de resultados/Excel hasta validar con una consulta comparable de Oracle.

**Unificación visual:** se creó la skill [inspecciones-ui](./skill-inspecciones-ui/SKILL.md) como guía para los elementos compartidos entre Localización y Defectos: KPI sin contenedor redundante, grid, controles, cabeceras y textos/posiciones del selector de gráficos. Los filtros y contenidos propios de cada informe se mantienen independientes.

**Límites de filas:** el servicio fija en 5.000 el máximo retenido para el grid y en 300.000 el máximo exportable a Excel. El selector de página (25/50/100/200/500) solo controla cuántas filas renderiza cada página dentro de la muestra cargada; no amplía el máximo de 5.000. El XLSX se escribe en streaming y usa un temporal, lo que reduce memoria pero no elimina el coste de CPU, Oracle, disco y transferencia.

## 1. Resumen ejecutivo

La consulta de pantalla devuelve un máximo de 5.000 filas. Para Elementos y Defectos, el total exacto y el conteo por estación se calculan con una agregación SQL separada; la base procesa las relaciones completas y después consulta el detalle acotado. Para otros localizadores, los conteos pueden depender de la lectura del cursor hasta el final. El número 193.752 reportado por el usuario no es un resultado medido en esta ejecución y debe cotejarse con el total, filtros y plan SQL de la solicitud web.

La exportación genera un XLSX completo hasta 300.000 registros con OpenXML streaming sobre un archivo temporal; el límite se aplica en frontend y backend. El umbral de confirmación sigue siendo 50.000 filas. La API acepta un trabajo en segundo plano, el frontend consulta su estado y descarga el XLSX terminado. La cola en memoria admite hasta diez trabajos pendientes y procesa uno a la vez; los archivos completados se conservan hasta dos horas y se limpian periódicamente. Si la cola está llena, responde HTTP 429. Streaming reduce la memoria máxima del conjunto y workbook, pero no el volumen que Oracle debe leer ni el trabajo de serialización y disco. Los trabajos no son durables: un reinicio de la API descarta el estado de cola y los archivos antiguos se limpian al iniciar o periódicamente.

**Presentación unificada del volumen:** el resumen compacto del grid distingue filas cargadas y encontradas; el tooltip del buscador explica que solo filtra las filas cargadas. Sobre 50.000 se solicita confirmación al pulsar Excel. Al superar 300.000 el botón se deshabilita y aparece un icono informativo. Las reglas están en [inspecciones-volumen-datos](./skill-inspecciones-volumen-datos/SKILL.md).

La modal de Localización permite cancelar la consulta mediante `AbortSignal`; falta validar con Oracle real que la cancelación detenga el cursor y libere recursos. La exportación en segundo plano no ofrece cancelación manual ni porcentaje de progreso en UI. El aviso de volumen aparece cuando termina el cálculo de total; no reduce por sí mismo el tiempo de consulta.

Al cancelar una consulta, el proveedor Oracle puede manifestar la interrupción del socket como `IOException` además de `OracleException` ORA-12570. Si el token está cancelado, el repositorio normaliza ambos casos como `OperationCanceledException`, que el endpoint maneja como cancelación del cliente y no como fallo inesperado.

**Medición realizada en Producción el 06/11/2026:** entre el 01/01/2026 y el 06/11/2026, sin aplicar restricción de estaciones ni otros filtros, el conteo de inspecciones no anuladas fue **1.032.667**. Es el total de red, no un recuento acotado a las estaciones autorizadas para un usuario web concreto. El conteo tardó aproximadamente **1.748 ms desde el envío del SQL hasta recibir la fila de resultado**, sin incluir la conexión. Esta medición es de cliente SQL*Plus y no equivale al tiempo interno de CPU/ejecución reportado por Oracle.

El número medido es el conteo de filas base de `CENTRALITV.INSPECCION` con los predicados principales del localizador y no necesariamente coincide con las filas del informe cuando hay relaciones 1:N. La medición es una referencia histórica y no permite inferir el rendimiento del SQL actual de Elementos ni su exportación a 300.000 filas. Para determinar el volumen real se debe repetir el conteo con los mismos filtros/estaciones de la petición web y comparar la semántica de filas.

La conexión directa MCP falló con `ORA-12660`: Oracle Production negocia Native Network Encryption, que no admite el modo Thin de `node-oracledb`. El Oracle Client local disponible es de 32 bits y no puede cargarse en el proceso Node.js de 64 bits. Para obtener el conteo se usó SQL*Plus local con una transacción `READ ONLY`, sin registrar credenciales ni devolver datos de inspecciones. No se midió el SQL completo con las columnas y joins del informe, ni su plan real.

`Failed to fetch` tampoco identifica por sí solo la causa: significa que el navegador no obtuvo una respuesta HTTP utilizable y puede deberse a una conexión interrumpida, un timeout o una caída del servidor, entre otras causas.

## 2. Evidencia en el código actual

| Área | Comportamiento observado | Referencia |
|---|---|---|
| Lectura Oracle | `CommandTimeout` de 120 segundos. En Elementos, la consulta agregada recorre todas las coincidencias para total/gráfico y la consulta de detalle aplica `FETCH FIRST 5000`; los demás tipos pueden consumir el cursor completo para obtener el total. | [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs) |
| Grid | Retiene como máximo 5.000 filas. En Elementos y Defectos, total/conteos se calculan con una agregación separada; el grid no transfiere el resto de las filas de detalle. | [`InformesLocalizacionService.cs`](../../src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs) |
| SQL dinámico | El predicado principal de fecha usa límites parametrizados sobre `FECHAINSPECCION`; es sargable en principio. Los filtros opcionales pueden añadir funciones, `NOT EXISTS` o patrones `LIKE` con comodín inicial. La ordenación por estación/fecha se añade cuando esas columnas están seleccionadas. | [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs) |
| Joins y agregación | La consulta principal de inspecciones añade joins opcionales y solo agrega `LISTAGG` de defectos si se selecciona esa columna. El coste real dependerá del plan de ejecución, cardinalidades, restricciones e índices de Oracle. | [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs) |
| Exportación | Permite hasta 300.000 filas y consume el cursor completo, escribiendo XLSX con OpenXML a un temporal en un trabajo de fondo. El navegador descarga mediante una petición de archivo, sin crear un `Blob` completo en JavaScript. | [`InformesLocalizacionService.cs`](../../src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs), [`InformesEndpoints.cs`](../../src/CentralDatos.Api/Endpoints/Informes/InformesEndpoints.cs) |
| Concurrencia | El limitador de exportaciones tiene valores por defecto `PermitLimit = 20` y `QueueLimit = 50`; se aplica también a otros endpoints de exportación. Debe ajustarse según el consumo medido y el alcance compartido. | [`Program.cs`](../../src/CentralDatos.Api/Program.cs), [`appsettings.json`](../../src/CentralDatos.Api/appsettings.json) |
| Cliente | La exportación inicia un trabajo, consulta su estado y descarga con una navegación de archivo del navegador, evitando retener el XLSX completo en memoria JavaScript. La transferencia final aún puede fallar por red o servidor. | [`localizacionApi.ts`](../../src/central-datos-web/src/features/inspecciones/api/localizacionApi.ts), [`useLocalizacionReport.ts`](../../src/central-datos-web/src/features/inspecciones/hooks/useLocalizacionReport.ts) |

### Hipótesis a medir, no causas confirmadas

1. **Dos recorridos del agregado y detalle (Elementos):** total/gráfico requieren procesar todas las coincidencias y el grid realiza luego su propia consulta. Evitar el segundo recorrido exige una estrategia de consulta que preserve conteos por estación, columnas configurables y orden; no cambiarla sin plan/benchmarks.
2. **Ordenación antes del top 5.000:** puede resolverse como top-N (`SORT ORDER BY STOPKEY`) o derivar en una ordenación mayor según el plan y la proyección seleccionada.
3. **Filtros avanzados:** búsquedas con `%` inicial, funciones como `PERIODICA`/`CLASIFICACION_MINER` y `NOT EXISTS` pueden impedir o limitar el uso de índices según el plan y los datos.
4. **Joins y `LISTAGG`:** pueden aumentar cardinalidad, CPU, memoria temporal o coste de ordenación. Debe verificarse si los joins son 1:1 y si el listado se necesita en las columnas activas.
5. **XLSX:** el servidor no acumula workbook/filas en memoria, pero el cursor permanece abierto durante serialización/escritura a disco. El navegador descarga el archivo directamente en vez de construir un `Blob`; medir CPU, disco y transferencia.
6. **Timeout o desconexión:** el comando Oracle tiene timeout de 120 segundos. Sin logs correlacionados de API, Oracle y navegador no se puede atribuir `Failed to fetch` a un único componente.

No se dispone en este análisis de estadísticas de Oracle, índices de producción, `DBMS_XPLAN`/plan real ni logs correlacionados. La medición de 1.748 ms corresponde al SQL de conteo, no a una ejecución completa del SELECT dinámico ni a la generación de XLSX. Por tanto, no se recomienda añadir hints ni crear índices todavía.

## 3. Propuestas de evolución aún pendientes

Las propuestas de preconteo con confirmación previa siguen pendientes. El trabajo de exportación asíncrono ya está implementado, aunque aún requiere pruebas de integración/carga y no tiene cola durable. El flujo de consulta calcula el agregado y las primeras filas en una sola petición; Elementos/Defectos usan dos consultas SQL secuenciales para total/gráfico y detalle.

### 3.1 Flujo de consulta y grid (conteo total + muestra de 5.000)

1. Centralizar la construcción de filtros y la semántica de filas para que el conteo, la muestra del grid y la exportación representen el mismo conjunto lógico. El conteo debe envolver o reproducir la consulta efectiva del localizador, incluidos joins que puedan multiplicar filas; contar solo `INSPECCION` no siempre equivale al número de filas del informe.
2. Al pulsar **Consultar**, ejecutar primero un preconteo Oracle parametrizado. El conteo no debe seleccionar todas las columnas ni materializar cada fila en .NET. Tiene que respetar filtros, estación/sociedad autorizadas y duplicidad real de la proyección.
3. Si el preconteo detecta un volumen normal, devolver el total y consultar en Oracle las primeras 5.000 filas mediante ordenación determinista y límite en servidor.
4. Si supera un umbral de aviso aún por acordar, mostrar la advertencia y solicitar confirmación antes de recuperar la muestra. Texto orientativo: **“La consulta coincide con N registros. Puede ser pesada. La tabla mostrará solo los primeros 5.000. ¿Continuar?”** Permitir cancelar sin cargar las filas. El conteo ya habrá consumido recursos; avisarlo antes de iniciar el conteo cuando el rango o los filtros indiquen una consulta potencialmente amplia.
5. Si confirma, recuperar como máximo 5.000 filas. El contador compacto del grid debe indicar filas visibles, cargadas y encontradas. No mostrar un banner de volumen que repita el contador ni descargar el millón de filas al navegador.
6. La búsqueda local, ordenación y paginación del grid actuarán solo sobre esas 5.000 filas. Para que “primeros” tenga significado estable, Oracle debe producir un orden determinista antes del límite. Si se requiere orden global sobre todos los registros, el orden debe ejecutarse en Oracle antes del límite; el orden local del grid no puede prometerlo.
7. El conteo por estación del gráfico/KPIs debe venir de una agregación Oracle separada y coherente con los filtros, o etiquetarse como referido a la muestra. No calcular estadísticas de red a partir de las 5.000 filas y presentarlas como totales.
8. La vista no debe quedar en estado ambiguo si el conteo y el SELECT de muestra fallan en momentos distintos. Mostrar etapa, cancelar operaciones anteriores y vincular cada respuesta al mismo conjunto de filtros. Si los datos cambian entre consultas, el total es una instantánea aproximada del momento del preconteo; documentar/indicar esa semántica o mantener la misma instantánea Oracle cuando sea viable.

**Coste a aceptar y medir:** el conteo exacto es una operación adicional y puede tardar. La medición existente (~1,75 s) es solo un `COUNT(*)` sobre la tabla base; no demuestra que el conteo exacto con filtros y joins del informe tenga ese coste. Si es demasiado caro, opciones a evaluar son cache breve por filtros, resumen/materialización aprobada por DBA o mostrar “más de N” tras una consulta limitada; no presentar un conteo parcial como exacto.

### 3.2 Flujo de exportación XLSX completa y pesada

1. El botón de exportar usa el total del último resultado válido para advertir antes de iniciar: número de registros encontrado, tiempo potencialmente elevado y efecto sobre la carga de Oracle. Sobre 50.000 registros solicita confirmación explícita al pulsar el botón. Si cambian filtros o selección de columnas, invalidar el conteo anterior.
2. Para Localización ya se usa un trabajo asíncrono identificado: la API responde al encolar, el frontend consulta estado y descarga al finalizar. La cola en memoria admite diez trabajos pendientes y ejecuta uno a la vez; una cola llena responde HTTP 429. No hay progreso porcentual ni cancelación manual. Validar y dimensionar concurrencia mediante pruebas de carga antes de ampliarla.
3. El trabajador abre un cursor Oracle y escribe cada fila secuencialmente a un XLSX con OpenXML streaming. No acumula un millón de diccionarios ni un workbook ClosedXML completo en RAM. El archivo temporal permite separar la generación de la transferencia HTTP, pero el cliente aún recibe el archivo como Blob y la descarga puede consumir memoria del navegador.
4. Se reutiliza el mismo constructor de filtros/columnas/joins y conversiones de tipos que el informe actual. Se mantienen las filas, columnas, datos y filtros aplicados. La API no devuelve todavía como metadato el número de filas exportadas.
5. Respetar los límites XLSX: máximo de **1.048.576 filas por hoja**, incluida la cabecera; hasta **16.384 columnas**. Poner los filtros y metadatos en una hoja separada para que no consuman filas de datos. Repartir en hojas numeradas al superar 1.048.575 filas de datos por hoja. Para el conteo medido de 1.032.667 filas, una hoja de datos cabe por el límite técnico si hay una sola fila de cabecera y columnas válidas; esto **no** garantiza que la memoria/tiempo o el tamaño comprimido sean viables.
6. No se entrega un libro parcial como completo. Si falla la generación (incluido el timeout Oracle actual de 120 segundos), el trabajo se marca fallido y la UI muestra el error disponible; faltan pruebas con Oracle real y de disco lleno.
7. El estado se asocia a la identidad del llamante y el identificador aleatorio no se publica como ruta estática. Los archivos se guardan en la carpeta temporal del servidor y expiran a las dos horas; limpieza periódica y al iniciar. La cola no es durable y no comparte estado entre instancias; reinicios o despliegues pueden interrumpir trabajos.
8. Se mantiene el máximo de 300.000 filas; la cola admite hasta diez pendientes y una activa. Revisar estos límites con carga, columnas, tamaño de disco y recursos. Nunca truncar silenciosamente.

### 3.3 UX y mensajes de estado

- Consulta: **“Preparando consulta y calculando coincidencias…”**; después informar total y, para volúmenes altos, pedir confirmación antes de recuperar las 5.000 filas.
- Resultado: **“N registros encontrados; se muestran los primeros 5.000.”** Cuando N ≤ 5.000, indicar cuántos se muestran sin sugerir truncamiento.
- Búsqueda/orden local: aclarar que operan sobre la muestra cargada; si se necesita búsqueda/orden global, debe convertirse en operación servidor-side.
- Exportación: al pulsar el botón, mostrar diálogo de confirmación para volúmenes mayores de 50.000; actualmente se presenta estado de exportación sin porcentaje ni cancelación y se descarga al finalizar.
- Errores diferenciados: límite XLSX/recursos, saturación, HTTP 429, cancelación, timeout Oracle, almacenamiento y error de red cuando exista evidencia. No presentar `Failed to fetch` como diagnóstico específico.
- Logs correlacionados por identificador de consulta/trabajo: filtros no sensibles o su hash, cantidad estimada/final, duración de conteo/consulta/serialización, filas escritas, tamaño del artefacto, cancelación, memoria pico y resultado. La cola ya registra inicio, fallo y finalización con ID de trabajo.

### 3.4 Alternativas consideradas

| Alternativa | Ventaja | Riesgo/coste | Evaluación |
|---|---|---|---|
| Mantener solo 5.000 filas y decir “más de 5.000” | Barato, sin conteo exacto adicional | No satisface el requisito de informar el total | Fallback si el conteo exacto resulta inasumible |
| Conteo exacto + muestra de 5.000 | UX clara; separa total y grid | Ejecuta conteo completo y luego otro SELECT; consistencia si Oracle cambia | Enfoque propuesto para estudiar y medir |
| Ejecutar query completa y cortar después en .NET | Fácil de conservar con el código actual | Recorre/transfiere todas las filas; sigue siendo el cuello de botella | Rechazado como optimización del grid |
| XLSX síncrono con ClosedXML y `byte[]` | Menos cambios de infraestructura | Alto pico de RAM, timeout, respuesta larga; límite de filas por hoja | Rechazado para exportaciones de gran volumen |
| Trabajo XLSX asíncrono y escritura streaming a archivo temporal | La petición inicial termina al encolar; no requiere retener todas las filas/libro en RAM | Cola en memoria no durable, sin progreso porcentual/cancelación, almacenamiento temporal y necesidad de pruebas de carga | Implementado para Localización; endurecimiento operativo pendiente |
| CSV comprimido por streaming como alternativa de emergencia | Menor coste y admite volúmenes superiores | No es XLSX ni conserva estilos/tipos/formato corporativo | Alternativa opcional si XLSX rebasa límites operativos |

### 3.5 Diagnóstico y medición necesarios

- La aplicación registra por separado duración del agregado, apertura del cursor de detalle, lectura del detalle, tiempo hasta la primera fila, filas leídas/guardadas y errores Oracle. En exportación registra tiempo total, filas y tamaño del XLSX.
- Ejecutar la misma petición con el SQL_ID y revisar `DBMS_XPLAN.DISPLAY_CURSOR(..., 'ALLSTATS LAST')`; comparar E-Rows/A-Rows, `Buffers`, `Reads`, `A-Time`, operación `SORT ORDER BY STOPKEY`, acceso por fecha y joins a elementos/defectos. El comando de exportación mantiene un timeout Oracle de 120 segundos: el job evita el timeout HTTP durante la generación, pero no amplía ese límite SQL.
- Medir por separado una consulta sin exportación y una exportación real; en exportación, el tiempo de lectura incluye serialización XLSX en el callback y escritura temporal. Registrar CPU, disco, memoria pico, tamaño del XLSX y duración de descarga.
- Comparar el conteo por estación con un conteo independiente y el total de filas detalladas; probar filtros sin comodín y con comodín inicial, selección de columnas mínima/máxima y códigos de estación representativos.
- La consulta real sigue pendiente de ejecutar con credenciales Oracle autorizadas. No modificar hints ni eliminar la segunda pasada hasta disponer de plan y métricas que demuestren equivalencia y mejora.

### 3.6 Comportamiento implementado de límites y confirmación

- Umbral provisional de confirmación Excel: **50.000 registros**, definido como constante en el hook de Localización; revisar cuando existan medidas de latencia y recursos.
- Grid: el contador compacto informa filas visibles, filas conservadas (hasta 5.000) y total encontrado. El tooltip del buscador aclara que la búsqueda local se realiza solo sobre las filas cargadas; no se muestra una alerta permanente duplicada.
- Excel: al pulsar exportar, entre 50.001 y 300.000 se solicita confirmación explícita en un diálogo. Por encima de 300.000 el botón queda deshabilitado y un icono informativo explica el límite y que se deben ajustar filtros.
- El servicio comprueba el máximo de 300.000 mientras consume el cursor y corta la operación con un error explícito; no se entrega un XLSX parcial como completo.
- La interfaz deshabilita **Exportar a Excel** cuando el total encontrado supera 300.000. El resumen compacto del grid diferencia página visible, filas cargadas y total encontrado.
- La generación XLSX usa OpenXML streaming sobre archivo temporal en un trabajo de fondo; la UI consulta estado cada dos segundos y descarga al finalizar. No se informa porcentaje ni se ofrece cancelación manual.
- Los selectores de filtros en cascada abortan solicitudes obsoletas al cambiar de selección.
- El servicio comprueba el token al procesar filas y limpia el temporal en caso de fallo/cancelación del proceso de API. No se expone cancelación manual al usuario.
- Pendiente de validar con una API conectada a Oracle que el `CancellationToken` detiene el comando/cursor y libera recursos; no se ha hecho aún una prueba de integración ni se ha exportado un conjunto grande.
- Aunque el XLSX ya no materializa todas las filas ni el libro en memoria, la consulta Oracle sigue leyendo todos los registros exportados y conserva el timeout de comando de 120 segundos. El trabajo en segundo plano elimina la espera de generación en la petición inicial, pero no evita un timeout Oracle, falta de disco ni una interrupción de red durante la descarga.

### 3.7 Fluidez del grid en el navegador

- La búsqueda ahora prepara un texto normalizado por fila cuando llegan los datos y reutiliza ese índice en vez de convertir todas las celdas a minúsculas en cada tecla.
- La búsqueda se limita a columnas de texto, fecha e identificadores técnicos; excluye medidas/cantidades numéricas que no son campos adecuados para búsqueda libre.
- El input mantiene estado local y confirma la búsqueda con debounce de 180 ms; limpiar actualiza el texto al instante y la actualización de resultados se marca como transición no urgente.
- El hover de filas se resuelve con CSS en lugar de guardar cada movimiento del puntero en estado React; antes esto podía volver a renderizar toda la página al pasar por filas.
- Se mantiene la página de 50 filas por defecto y el máximo de 5.000 filas cargadas. Esta mejora reduce trabajo de renderizado y búsqueda en el cliente, pero no cambia el tiempo de Oracle ni sustituye una virtualización si la cantidad de columnas/página se aumenta significativamente.

## 4. Fases de trabajo

| Fase | Trabajo | Resultado verificable |
|---|---|---|
| 0. Viabilidad | Medir conteo exacto, muestra 5.000, consulta completa y XLSX en entorno autorizado; guardar plan/lecturas/memoria. | Coste real de cada fase y umbrales de aviso/cancelación definidos. |
| 1. Contrato SQL | Unificar filtros y definir identidad/duplicidad de filas; comparar conteo con SQL efectivo; fijar orden determinista. | Conteo y filas representan el mismo resultado lógico. |
| 2. Consulta de pantalla | Preconteo, confirmación para resultados grandes, consulta Oracle limitada a 5.000 y agregado completo o etiquetado de muestra. | Se informa el total validado y la API nunca materializa más de 5.000 filas de grid. |
| 3. Exportación asíncrona | Cola en memoria acotada, lectura de cursor secuencial, XLSX streaming a archivo temporal, consulta de estado y descarga. | Exportación íntegra sin cargar todas las filas/libro entero en RAM; falta validar bajo carga y tras reinicio. |
| 4. UX y operación | Confirmaciones, estados de trabajo, permisos, expiración, limpieza y cuotas; añadir progreso/cancelación como mejora. | El usuario entiende que consulta/exportación son pesadas; los límites de cola/archivo se verifican bajo carga. |
| 5. Validación | Contratos, regresión XLSX, carga concurrente, disco, reinicio de IIS y límites de hoja/columna. | Capacidad y límites acordados verificados en entorno representativo. |

## 5. Pruebas y criterios de aceptación

- **SQL y consulta:** filtros de fecha inclusivos, estación/sociedad, fase, filtros avanzados, selección dinámica de columnas y casos con `LISTA_DEFECTOS`; comparar identidad y contenido de filas con el comportamiento actual en un dataset controlado.
- **Total y muestra:** 0, 1, 5.000, 5.001 y más de un millón de coincidencias; contrastar total exacto con un conteo independiente y comprobar que grid devuelve las primeras 5.000 en orden determinista, nunca más.
- **Semántica SQL:** probar filtros, joins 1:1 y 1:N, columnas opcionales, `LISTA_DEFECTOS`, estaciones autorizadas y cambios concurrentes entre conteo/lectura; el KPI total no debe contar inspecciones si el informe devuelve filas duplicadas (ni viceversa).
- **UX de carga:** umbral de aviso, confirmación y cancelación antes de la carga de filas/exportación; mostrar claramente N total y 5.000 mostrados.
- **XLSX:** 0, 1, 5.000, alrededor del máximo de hoja y más de 1.048.575 filas de datos; revisar hojas numeradas, metadatos separados, columnas, tipos, filtros y conteo final; ninguna salida parcial se presenta como completa.
- **Streaming y recursos:** medir RAM pico, CPU, temporales, tamaño final, throughput, tiempo, concurrencia, limpieza ante fallo y descarga grande en navegadores soportados.
- **Resiliencia y seguridad:** cancelación, timeout Oracle, HTTP 429, reinicio del proceso/IIS, expiración, permisos de descarga y ausencia de fuga de datos entre usuarios.
- **Carga:** fijar objetivos numéricos de duración, RAM y concurrencia después de obtener una línea base, no inventarlos ahora.
- **Alcance:** ejecutar regresión de defectos, elementos y mediciones si se reutilizan componentes SQL o de exportación.

## 6. Decisiones pendientes antes de implementar

1. ¿El total de resultados de la pantalla debe ser exacto, aceptando el coste de un preconteo, o se admite un conteo aproximado para evitar una segunda operación Oracle?
2. ¿La exportación grande debe ser un XLSX único con hojas segmentadas, o se acepta además ofrecer CSV comprimido si el XLSX rebasa límites operativos?
3. Acordar umbral de confirmación “consulta pesada”, máximo de duración, concurrencia de trabajos y cuota de almacenamiento después de medir.
4. Definir infraestructura de trabajos/archivos para IIS (instancia única o compartida, reinicios, almacenamiento temporal y limpieza).
5. Confirmar si búsqueda y orden del grid solo necesitan operar en los primeros 5.000 resultados, o si se exige que actúen sobre todo el conjunto en servidor.
6. Acordar entorno/dataset autorizado para medir el SQL dinámico completo, especialmente con el conjunto de estaciones del usuario.

La exportación XLSX streaming asíncrona hasta 300.000 filas y la descarga directa del navegador ya están implementadas. Siguen pendientes la medición con Oracle real, el progreso/cancelación, las cuotas y las pruebas de carga/operación; el aumento de límite no certifica por sí solo el rendimiento con 193.000 filas.

## 7. Referencias de código

- [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs)
- [`InformesLocalizacionService.cs`](../../src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs)
- [`InformesEndpoints.cs`](../../src/CentralDatos.Api/Endpoints/Informes/InformesEndpoints.cs)
- [`Program.cs`](../../src/CentralDatos.Api/Program.cs)
- [`appsettings.json`](../../src/CentralDatos.Api/appsettings.json)
- [`localizacionApi.ts`](../../src/central-datos-web/src/features/inspecciones/api/localizacionApi.ts)
- [`useLocalizacionReport.ts`](../../src/central-datos-web/src/features/inspecciones/hooks/useLocalizacionReport.ts)
