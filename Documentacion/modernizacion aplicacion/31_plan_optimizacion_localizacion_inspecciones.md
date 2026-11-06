# 31. Plan de optimización — Localización de Inspecciones y exportación Excel

**Estado:** diagnóstico y rediseño pendientes; se añadió una prueba provisional de UX para avisos, confirmación y cancelación, y se reforzó en el servicio el rechazo de exportaciones que superarían el límite actual. No se modificaron el SQL ni la capacidad de 150.000 filas del servidor.  
**Alcance inicial:** `inspecciones` (primer localizador). Las mejoras comunes solo se extenderán a defectos, elementos y mediciones tras verificar que no alteran sus resultados.

## 1. Resumen ejecutivo

La implementación actual no limita el trabajo que Oracle y la API realizan al número de filas que conservan para responder:

- La consulta web conserva como máximo 5.000 filas, pero sigue leyendo el cursor completo para calcular el total y los conteos por estación.
- La exportación solicita conservar como máximo 150.000 filas y también lee el cursor completo. El servicio ahora rechaza el resultado si `TotalRegistros` supera el límite, antes de construir el workbook; dentro del límite construye un libro ClosedXML en memoria, lo copia a un `byte[]` y el navegador recibe el archivo como `Blob`.
- El límite de 150.000 evita entregar un libro truncado desde el endpoint de aplicación, pero no limita el trabajo de Oracle ni la lectura del cursor.

Por ello, un rango con un volumen muy alto puede tardar aunque el grid muestre solo 5.000 filas. Se descarta por ahora añadir un preconteo: no se ha demostrado que el coste adicional sea necesario ni eficiente. El aviso seguirá apareciendo al terminar la consulta y conocer el total. Si posteriormente se requiere una confirmación previa, primero habrá que medir el preconteo con los filtros y joins reales.

Como prueba aislada de UX, el frontend muestra un aviso cuando la consulta terminada supera **50.000 registros** y pide confirmación antes de exportar entre **50.001 y 150.000**. Se rechazan desde la interfaz y el servicio las exportaciones superiores a **150.000**, máximo que conserva actualmente el servicio, para evitar generar un Excel parcial. Los 50.000 son un umbral provisional —aproximadamente diez veces el máximo del grid— y deberán ajustarse con métricas reales.

La modal de Localización permite cancelar la consulta mediante `AbortSignal`; debe verificarse en el entorno de prueba que la cancelación llega a Oracle y detiene efectivamente el cursor. No se ofrece cancelación manual de exportación: aunque una desconexión HTTP puede propagarse al servidor, la serialización de ClosedXML es síncrona y no admite interrupción cooperativa. Cancelar en esa fase puede dejar el servidor consumiendo recursos hasta terminar un archivo que ya no se entregará. El aviso de búsqueda aparece al terminar la consulta y conocer el total; no reduce por sí mismo el tiempo de consulta.

Al cancelar una consulta, el proveedor Oracle puede manifestar la interrupción del socket como `IOException` además de `OracleException` ORA-12570. Si el token está cancelado, el repositorio normaliza ambos casos como `OperationCanceledException`, que el endpoint maneja como cancelación del cliente y no como fallo inesperado.

**Medición realizada en Producción el 06/11/2026:** entre el 01/01/2026 y el 06/11/2026, sin aplicar restricción de estaciones ni otros filtros, el conteo de inspecciones no anuladas fue **1.032.667**. Es el total de red, no un recuento acotado a las estaciones autorizadas para un usuario web concreto. El conteo tardó aproximadamente **1.748 ms desde el envío del SQL hasta recibir la fila de resultado**, sin incluir la conexión. Esta medición es de cliente SQL*Plus y no equivale al tiempo interno de CPU/ejecución reportado por Oracle.

El número medido es el conteo de filas base de `CENTRALITV.INSPECCION` con los predicados principales del localizador. La consulta del localizador usa joins opcionales `LEFT JOIN`, por lo que su resultado no puede ser menor que este conteo y podría ser mayor si alguna relación multiplica filas. El volumen total de red excede en casi siete veces el límite actual de 150.000 filas que conserva la exportación. **No se generó Excel**, ya que la implementación actual lee el cursor completo, trunca silenciosamente el libro al máximo y construye el archivo completo en memoria; no es una exportación íntegra ni una prueba segura de viabilidad. Si la cuenta web solo tiene acceso a un subconjunto de estaciones, se requiere repetir el conteo con esos códigos para determinar el tamaño de su exportación.

La conexión directa MCP falló con `ORA-12660`: Oracle Production negocia Native Network Encryption, que no admite el modo Thin de `node-oracledb`. El Oracle Client local disponible es de 32 bits y no puede cargarse en el proceso Node.js de 64 bits. Para obtener el conteo se usó SQL*Plus local con una transacción `READ ONLY`, sin registrar credenciales ni devolver datos de inspecciones. No se midió el SQL completo con las columnas y joins del informe, ni su plan real.

`Failed to fetch` tampoco identifica por sí solo la causa: significa que el navegador no obtuvo una respuesta HTTP utilizable y puede deberse a una conexión interrumpida, un timeout o una caída del servidor, entre otras causas.

## 2. Evidencia en el código actual

| Área | Comportamiento observado | Referencia |
|---|---|---|
| Lectura Oracle | `CommandTimeout` de 120 segundos; no se aplica un límite de filas en el SQL. El lector incrementa el total y agrega por estación hasta agotar el cursor, aunque ya haya alcanzado `maxFilasRetorno`. | [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs) |
| Grid | Retiene hasta 5.000 filas; el total y el gráfico por estación dependen de haber leído todas las filas del cursor. | [`InformesLocalizacionService.cs`](../../src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs) |
| SQL dinámico | El predicado principal de fecha usa límites parametrizados sobre `FECHAINSPECCION`; es sargable en principio. Los filtros opcionales pueden añadir funciones, `NOT EXISTS` o patrones `LIKE` con comodín inicial. La ordenación por estación/fecha se añade cuando esas columnas están seleccionadas. | [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs) |
| Joins y agregación | La consulta principal de inspecciones añade joins opcionales y solo agrega `LISTAGG` de defectos si se selecciona esa columna. El coste real dependerá del plan de ejecución, cardinalidades, restricciones e índices de Oracle. | [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs) |
| Exportación | Retiene hasta 150.000 filas y lee todo el cursor. Si el total excede el máximo, el servicio rechaza la petición antes de crear el workbook; si no, construye el archivo en memoria, lo serializa en un `MemoryStream` y devuelve `ToArray()`. | [`InformesLocalizacionService.cs`](../../src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs), [`InformesEndpoints.cs`](../../src/CentralDatos.Api/Endpoints/Informes/InformesEndpoints.cs) |
| Concurrencia | El limitador de exportaciones tiene valores por defecto `PermitLimit = 20` y `QueueLimit = 50`; se aplica también a otros endpoints de exportación. Debe ajustarse según el consumo medido y el alcance compartido. | [`Program.cs`](../../src/CentralDatos.Api/Program.cs), [`appsettings.json`](../../src/CentralDatos.Api/appsettings.json) |
| Cliente | La exportación no pasa `AbortSignal`; espera `response.blob()`, que mantiene el archivo completo en el navegador. Los errores HTTP se distinguen, pero una interrupción de red puede llegar como el genérico `Failed to fetch`. | [`localizacionApi.ts`](../../src/central-datos-web/src/features/inspecciones/api/localizacionApi.ts), [`useLocalizacionReport.ts`](../../src/central-datos-web/src/features/inspecciones/hooks/useLocalizacionReport.ts) |

### Hipótesis a medir, no causas confirmadas

1. **Lectura y transferencia de todas las filas:** es una causa directa de trabajo innecesario para el grid y puede alargar la consulta aunque solo se devuelvan 5.000 filas.
2. **Ordenación:** el `ORDER BY` dinámico puede requerir ordenar muchas filas antes de devolver resultados; hay que contrastarlo con el plan real.
3. **Filtros avanzados:** búsquedas con `%` inicial, funciones como `PERIODICA`/`CLASIFICACION_MINER` y el `NOT EXISTS` pueden impedir o limitar el uso de índices según el plan y los datos.
4. **Joins opcionales y `LISTAGG`:** pueden aumentar cardinalidad, CPU, memoria temporal o coste de ordenación. Debe verificarse si los joins son realmente 1:1 y si la agregación se necesita en los campos seleccionados.
5. **Memoria de Excel:** el modelo de filas, ClosedXML, el `MemoryStream`, el `byte[]` y el `Blob` pueden coexistir durante la exportación; el pico real depende del número y tamaño de columnas/celdas.
6. **Timeout o desconexión:** el comando Oracle tiene timeout de 120 segundos. Sin logs correlacionados de API, Oracle y navegador no se puede atribuir `Failed to fetch` a un único componente.

No se dispone en este análisis de estadísticas de Oracle, índices de producción, `DBMS_XPLAN`/plan real ni logs correlacionados. La medición de 1.748 ms corresponde al SQL de conteo, no a una ejecución completa del SELECT dinámico ni a la generación de XLSX. Por tanto, no se recomienda añadir hints ni crear índices todavía.

## 3. Rediseño propuesto para revisión

### 3.1 Flujo de consulta y grid (conteo total + muestra de 5.000)

1. Centralizar la construcción de filtros y la semántica de filas para que el conteo, la muestra del grid y la exportación representen el mismo conjunto lógico. El conteo debe envolver o reproducir la consulta efectiva del localizador, incluidos joins que puedan multiplicar filas; contar solo `INSPECCION` no siempre equivale al número de filas del informe.
2. Al pulsar **Consultar**, ejecutar primero un preconteo Oracle parametrizado. El conteo no debe seleccionar todas las columnas ni materializar cada fila en .NET. Tiene que respetar filtros, estación/sociedad autorizadas y duplicidad real de la proyección.
3. Si el preconteo detecta un volumen normal, devolver el total y consultar en Oracle las primeras 5.000 filas mediante ordenación determinista y límite en servidor.
4. Si supera un umbral de aviso aún por acordar, mostrar la advertencia y solicitar confirmación antes de recuperar la muestra. Texto orientativo: **“La consulta coincide con N registros. Puede ser pesada. La tabla mostrará solo los primeros 5.000. ¿Continuar?”** Permitir cancelar sin cargar las filas. El conteo ya habrá consumido recursos; avisarlo antes de iniciar el conteo cuando el rango o los filtros indiquen una consulta potencialmente amplia.
5. Si confirma, recuperar como máximo 5.000 filas. El mensaje persistente de resultados debe indicar **“N registros encontrados; se muestran los primeros 5.000”**. No descargar el millón de filas al navegador.
6. La búsqueda local, ordenación y paginación del grid actuarán solo sobre esas 5.000 filas. Para que “primeros” tenga significado estable, Oracle debe producir un orden determinista antes del límite. Si se requiere orden global sobre todos los registros, el orden debe ejecutarse en Oracle antes del límite; el orden local del grid no puede prometerlo.
7. El conteo por estación del gráfico/KPIs debe venir de una agregación Oracle separada y coherente con los filtros, o etiquetarse como referido a la muestra. No calcular estadísticas de red a partir de las 5.000 filas y presentarlas como totales.
8. La vista no debe quedar en estado ambiguo si el conteo y el SELECT de muestra fallan en momentos distintos. Mostrar etapa, cancelar operaciones anteriores y vincular cada respuesta al mismo conjunto de filtros. Si los datos cambian entre consultas, el total es una instantánea aproximada del momento del preconteo; documentar/indicar esa semántica o mantener la misma instantánea Oracle cuando sea viable.

**Coste a aceptar y medir:** el conteo exacto es una operación adicional y puede tardar. La medición existente (~1,75 s) es solo un `COUNT(*)` sobre la tabla base; no demuestra que el conteo exacto con filtros y joins del informe tenga ese coste. Si es demasiado caro, opciones a evaluar son cache breve por filtros, resumen/materialización aprobada por DBA o mostrar “más de N” tras una consulta limitada; no presentar un conteo parcial como exacto.

### 3.2 Flujo de exportación XLSX completa y pesada

1. El botón de exportar usa el total del último resultado válido para advertir antes de iniciar: número de registros encontrado, tiempo potencialmente elevado y efecto sobre la carga de Oracle. Solicitar confirmación explícita. Si cambian filtros o selección de columnas, invalidar el conteo anterior.
2. Rechazar el diseño síncrono actual para exportaciones grandes. Crear un trabajo asíncrono con identificador; la API responde rápidamente y el frontend consulta estado/progreso, puede cancelar y descarga al finalizar. Limitar concurrencia y dimensionar la cola tras pruebas en entorno de carga autorizado.
3. El trabajador abre un cursor Oracle y escribe cada fila secuencialmente a un XLSX con escritura OpenXML forward-only/streaming (o tecnología equivalente validada). No acumular un millón de diccionarios, un workbook ClosedXML completo, `MemoryStream`, `byte[]` y `Blob` simultáneamente. El archivo temporal permite generar y descargar sin cargar todo el libro en RAM.
4. Reutilizar el mismo constructor de filtros/columnas/joins y conversiones de tipos que el informe actual. Mantener filas completas, orden estable, nombre de columnas, datos y filtros aplicados. Contar filas efectivamente escritas y devolver ese total como metadato de finalización.
5. Respetar los límites XLSX: máximo de **1.048.576 filas por hoja**, incluida la cabecera; hasta **16.384 columnas**. Poner los filtros y metadatos en una hoja separada para que no consuman filas de datos. Repartir en hojas numeradas al superar 1.048.575 filas de datos por hoja. Para el conteo medido de 1.032.667 filas, una hoja de datos cabe por el límite técnico si hay una sola fila de cabecera y columnas válidas; esto **no** garantiza que la memoria/tiempo o el tamaño comprimido sean viables.
6. No producir ni descargar un libro parcial como si estuviera completo. Ante cancelación, error Oracle, disco lleno, límite de duración o fallo XLSX, marcar el trabajo como fallido/cancelado, limpiar temporales y presentar un mensaje accionable.
7. Definir seguridad y ciclo de vida del artefacto: autorización en creación, estado y descarga; almacenamiento no público; nombre no predecible; expiración y limpieza automática; política de datos personales; cuota de disco; comportamiento multi-instancia/IIS y persistencia de trabajos tras reinicio.
8. No fijar todavía máximo absoluto de filas ni número de trabajos simultáneos. Aunque se permita exportar un millón, aplicar límites de columnas, duración, tamaño, disco y concurrencia basados en pruebas. La respuesta debe poder ser “demasiado grande para el XLSX síncrono/entorno” con alternativa de acotar filtros, nunca truncar silenciosamente.

### 3.3 UX y mensajes de estado

- Consulta: **“Preparando consulta y calculando coincidencias…”**; después informar total y, para volúmenes altos, pedir confirmación antes de recuperar las 5.000 filas.
- Resultado: **“N registros encontrados; se muestran los primeros 5.000.”** Cuando N ≤ 5.000, indicar cuántos se muestran sin sugerir truncamiento.
- Búsqueda/orden local: aclarar que operan sobre la muestra cargada; si se necesita búsqueda/orden global, debe convertirse en operación servidor-side.
- Exportación: confirmación previa para volúmenes altos; progreso por filas o porcentaje, tiempo transcurrido, cancelar y descarga cuando el archivo esté terminado.
- Errores diferenciados: límite XLSX/recursos, saturación, HTTP 429, cancelación, timeout Oracle, almacenamiento y error de red cuando exista evidencia. No presentar `Failed to fetch` como diagnóstico específico.
- Logs correlacionados por identificador de consulta/trabajo: filtros no sensibles o su hash, cantidad estimada/final, duración de conteo/consulta/serialización, filas escritas, tamaño del artefacto, cancelación, memoria pico y resultado.

### 3.4 Alternativas consideradas

| Alternativa | Ventaja | Riesgo/coste | Evaluación |
|---|---|---|---|
| Mantener solo 5.000 filas y decir “más de 5.000” | Barato, sin conteo exacto adicional | No satisface el requisito de informar el total | Fallback si el conteo exacto resulta inasumible |
| Conteo exacto + muestra de 5.000 | UX clara; separa total y grid | Ejecuta conteo completo y luego otro SELECT; consistencia si Oracle cambia | Enfoque propuesto para estudiar y medir |
| Ejecutar query completa y cortar después en .NET | Fácil de conservar con el código actual | Recorre/transfiere todas las filas; sigue siendo el cuello de botella | Rechazado como optimización del grid |
| XLSX síncrono con ClosedXML y `byte[]` | Menos cambios de infraestructura | Alto pico de RAM, timeout, respuesta larga; límite de filas por hoja | Rechazado para exportaciones de gran volumen |
| Trabajo XLSX asíncrono y escritura streaming a archivo temporal | No requiere retener todas las filas/libro en RAM; progreso/cancelación | Nuevo ciclo de vida de trabajos, almacenamiento, permisos, limpieza, pruebas y posible librería | Candidato recomendado para exportación completa |
| CSV comprimido por streaming como alternativa de emergencia | Menor coste y admite volúmenes superiores | No es XLSX ni conserva estilos/tipos/formato corporativo | Alternativa opcional si XLSX rebasa límites operativos |

### 3.5 Diagnóstico y medición necesarios

- Obtener el SQL exacto de una petición representativa, columnas activas, filtros y códigos de estación autorizados.
- Medir por separado: preconteo exacto, lectura limitada a 5.000, agregado por estación, SELECT completo con cursor consumido y serialización XLSX.
- Registrar plan de ejecución real, filas por operación/plan, lecturas lógicas/físicas, esperas, tamaño de fila, memoria pico del worker y tiempo total. Comparar filtros sin `LISTA_DEFECTOS` y con ella.
- La cuenta de producción debe tener mínimo privilegio de lectura; el perfil de consulta de prueba debe ejecutarse en una franja autorizada, inicialmente con timeout y opción de cancelar.
- La medición de conteo disponible no valida todavía el plan del SELECT completo ni el coste de escritura XLSX; no inferir que el millón se exporta de forma viable solo porque el `COUNT(*)` tardó 1,75 s.

### 3.6 Prueba provisional de avisos y cancelación

- Umbral provisional de aviso y confirmación: **50.000 registros**, definido como constante en el hook de Localización; revisar cuando existan medidas de latencia y recursos.
- Grid: se informa el total obtenido y el número de filas conservadas (hasta 5.000); la advertencia aparece después de recibir la respuesta completa.
- Excel: entre 50.001 y 150.000 se solicita confirmación explícita. Por encima de 150.000 se ofrece acotar filtros; el servicio también rechaza esos resultados para no producir archivos truncados.
- El servicio valida también el total resultante y rechaza con HTTP 400 toda exportación superior a 150.000 filas antes de crear el workbook; evita confiar exclusivamente en la validación del navegador.
- La interfaz deshabilita **Exportar a Excel** cuando el total encontrado supera 150.000. El resumen de filas aparece encima y debajo del grid, diferenciando página visible, filas cargadas y total encontrado.
- Durante la consulta, la modal ofrece cancelar y libera el estado de carga al abortar. No se ofrece cancelación manual de Excel mientras la generación sea síncrona y ClosedXML no permita interrumpir `SaveAs`.
- Los selectores de filtros en cascada abortan solicitudes obsoletas al cambiar de selección.
- El servicio comprueba el token durante la escritura de filas del XLSX y antes/después de serializarlo; no se ofrece botón de cancelación para esta operación porque ClosedXML no puede interrumpirse durante la serialización síncrona.
- Pendiente de validar con una API conectada a Oracle que el `CancellationToken` detiene el comando/cursor y libera recursos; no se ha hecho aún una prueba de integración ni se ha exportado un conjunto grande.
- Esta prueba no cambia el recorrido SQL: el backend sigue leyendo todo el cursor para contar, tanto en consulta como en exportación, y el endpoint Excel sigue siendo síncrono y basado en memoria. No considerar viable una exportación de gran volumen por el mero hecho de permitir confirmar hasta 150.000 filas.

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
| 3. Exportación asíncrona | Trabajo durable, lectura de cursor secuencial, XLSX streaming a archivo temporal, hojas segmentadas, progreso/cancelación y descarga protegida. | Exportación íntegra sin cargar el millón de filas/libro entero en RAM. |
| 4. UX y operación | Confirmaciones, progreso, estados de trabajo, permisos, expiración, limpieza y cuotas. | El usuario entiende que consulta/exportación son pesadas y puede cancelarlas. |
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

**No se ha implementado ningún cambio funcional.** Se ejecutó únicamente el conteo de solo lectura descrito arriba; no se descargaron filas de inspecciones ni se generó un XLSX. Este rediseño no aprueba todavía costes, umbrales, tecnología de streaming ni operación de trabajos; requiere estudiar las mediciones y decisiones anteriores antes de implementar.

## 7. Referencias de código

- [`OracleInformesRepository.Localizacion.cs`](../../src/CentralDatos.Infrastructure/Persistence/Repositories/OracleInformesRepository.Localizacion.cs)
- [`InformesLocalizacionService.cs`](../../src/CentralDatos.Application/Features/Informes/Services/InformesLocalizacionService.cs)
- [`InformesEndpoints.cs`](../../src/CentralDatos.Api/Endpoints/Informes/InformesEndpoints.cs)
- [`Program.cs`](../../src/CentralDatos.Api/Program.cs)
- [`appsettings.json`](../../src/CentralDatos.Api/appsettings.json)
- [`localizacionApi.ts`](../../src/central-datos-web/src/features/inspecciones/api/localizacionApi.ts)
- [`useLocalizacionReport.ts`](../../src/central-datos-web/src/features/inspecciones/hooks/useLocalizacionReport.ts)
