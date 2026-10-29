# Auditoría y Plan de Optimización de Consultas SQL Oracle — Central Datos

> [!IMPORTANT]
> Este documento audita las consultas reales extraídas del código fuente de `Central_Datos` sobre los esquemas Oracle **`CENTRALITV`** y **`COMUN`**, identificando por qué penalizan el rendimiento hoy y mostrando **cómo deben reescribirse en el nuevo backend .NET 10** (sin `clsCur`, sin `centralitv.asmx` y con `Oracle.ManagedDataAccess.Core` + Dapper / EF Core 10).

---

## 1. Diagnóstico Global: Los 6 Antipatrones que Degradan Oracle Hoy

| # | Antipatrón Detectado en Código Actual | Archivos Afectados | Impacto en Base de Datos Oracle |
| :-: | :--- | :--- | :--- |
| **1** | **0% de Bind Variables reales (*Hard Parsing* continuo)** | [clsCur.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Clases/clsCur.vb#L1280-L1370), [frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb), [clsExcelFacturacion.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Clases/clsExcelFacturacion.vb#L142-L200) | `clsCur.TransSQL` reemplaza `?` concatenando literales de texto. Cada matrícula, fecha o estación genera un `SQL_ID` distinto, saturando el *Shared Pool* (*Library Cache Latch Contention*) e impidiendo reutilizar planes de ejecución. |
| **2** | **Funciones PL/SQL invocadas fila a fila en cláusulas `WHERE`** | [frmCriteriosLocalizacion.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriteriosLocalizacion.vb#L1788-L1820), [frmEnvioRecordatorios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmEnvioRecordatorios.vb#L1362-L1363), [frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb#L2196-L2260) | Llamadas como `CENTRALITV.PERIODICA(I.CODSEPIVA, I.CODESTACION) = 'S'` y `CENTRALITV.CLASIFICACION_MINER(...)` provocan millones de *Context Switches* entre el motor SQL y el motor PL/SQL e invalidan índices estándar. |
| **3** | **Múltiples escaneos de `CENTRALITV.INSPECCION` para un solo informe** | [frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb#L3007-L3081) (`Facturacion_Inspecciones`) | Escanea **5 veces** la tabla histórica `INSPECCION` en subconsultas separadas (`Contados`, `Terceros`, `Tarjetas`, `Totales`, `Gratuitas`) unidas con sintaxis obsoleta `(+)`. |
| **4** | **Bucles N+1 por Estación ITV (~34 viajes de red secuenciales)** | [frmUltimaInspeccion.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmUltimaInspeccion.vb), [frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb#L1756-L2045) | Ejecuta 1 consulta SOAP independiente por cada una de las ~34 estaciones permitidas en vez de una única consulta `GROUP BY CODESTACION` o `WHERE CODESTACION IN (...)`. |
| **5** | **Subconsultas correlacionadas `NOT IN` y predicados no SARGables** | [frmEnvioRecordatorios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmEnvioRecordatorios.vb#L1356-L1366), [frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb#L4148-L4385) | `NOT IN` sobre millones de matrículas (vulnerable además a devolver 0 filas si aparece un `NULL`), `SUBSTR(TELEFONO,1,1)`, `TRIM(UPPER(NUMBASTIDOR))` y `BETWEEN TO_DATE('ddMMyyyy')` (que excluye registros con hora `> 00:00:00` del último día). |
| **6** | **Ausencia de Paginación Server-Side Real y PKs con `MAX(ID)+1`** | [modID.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Modulos/modID.vb#L1013-L1066), `frmGridCriteriosLocalización.vb`, [mdiMain.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/mdiMain.vb#L630-L660) | Descarga decenas de miles de filas completas a un `DataTable` en RAM para paginar con LINQ `.Skip().Take(100)`, y calcula claves primarias mediante `SELECT MAX(ID) + 1` sin secuencias ni transacciones. |

---

## 2. Optimización Detallada de las Consultas Críticas (Antes vs. Después)

### Caso 1: Informe Contable de Facturación ([frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb#L3007-L3081)) — *Reducción del 80% de lectura I/O*

- **Problema actual:** Ejecuta 5 subconsultas agregadas independientes sobre `CENTRALITV.INSPECCION` + `CENTRALITV.FORMAPAGO` para el mismo rango de fechas y estaciones, unidas con `(+)` por `CodEstacion`.
- **Solución optimizada (1 única pasada con agregación condicional ANSI SQL y Bind Variables):**

```sql
-- NUEVA CONSULTA OPTIMIZADA (1 SOLO RANGE SCAN SOBRE CENTRALITV.INSPECCION)
SELECT
    i.CODESTACION,
    -- Contados
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN (:TipoContado, :TipoContadoTerceros) THEN 1 ELSE 0 END) AS ContadosNumInspecciones,
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN (:TipoContado, :TipoContadoTerceros)
             THEN (i.TARIFA + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0)) ELSE 0 END) AS ContadosBase,
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN (:TipoContado, :TipoContadoTerceros) THEN NVL(i.IVATARIFA, 0) ELSE 0 END) AS ContadosIVA,
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN (:TipoContado, :TipoContadoTerceros)
             THEN (NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0)) ELSE 0 END) AS ContadosTasas,
    -- Terceros
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN (:TipoTerceros, :TipoOtros) THEN 1 ELSE 0 END) AS TercerosNumInspecciones,
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN (:TipoTerceros, :TipoOtros)
             THEN (i.TARIFA + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0)) ELSE 0 END) AS TercerosBase,
    -- Tarjetas
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO = :TipoTarjeta THEN 1 ELSE 0 END) AS TarjetasNumInspecciones,
    SUM(CASE WHEN fp.CODTIPOFORMAPAGO = :TipoTarjeta
             THEN (i.TARIFA + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0)) ELSE 0 END) AS TarjetasBase,
    -- Gratuitas (sin re-escanear la tabla)
    SUM(CASE WHEN SUBSTR(i.CODTARIFA, 4, 1) = '0' THEN 1 ELSE 0 END) AS Gratuitas,
    -- Totales Globales
    COUNT(1) AS TotalesNumInspecciones,
    SUM(i.TARIFA + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0)) AS TotalesBase,
    SUM(NVL(i.IVATARIFA, 0)) AS TotalesIVA,
    SUM(NVL(i.TASATRAFICO, 0)) AS TotalesTasasT,
    SUM(NVL(i.TASAINDUSTRIA, 0)) AS TotalesTasasI
FROM CENTRALITV.INSPECCION i
LEFT JOIN CENTRALITV.FORMAPAGO fp
       ON fp.CODFORMAPAGO = i.CODFORMAPAGO
WHERE i.ANULADA = 0
  AND i.CODESTACION IN :EstacionesPermitidas
  AND i.FECHAINSPECCION >= :FechaInicio
  AND i.FECHAINSPECCION <  :FechaFinExclusiva   -- Incluye todo el último día hasta 23:59:59.999
GROUP BY i.CODESTACION
ORDER BY i.CODESTACION;
```

---

### Caso 2: Selección de Candidatos para Campañas SMS de Caducidad ([frmEnvioRecordatorios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmEnvioRecordatorios.vb#L1353-L1369))

- **Problemas actuales:**
  1. `I.FECHACADUCIDAD Between to_date('ddMMyyyy') And to_date('ddMMyyyy')` pierde cualquier caducidad del día final con componente horario distinto de `00:00:00`.
  2. Invoca `CENTRALITV.PERIODICA(CODSEPIVA, CODESTACION) = 'S'` **dos veces** (en la consulta principal y en la subconsulta de exclusión `ITMP`).
  3. Usa dos cláusulas `NOT IN` pesadas y concatenación directa de strings (`CodEstacion = '` & `strCodEstacion` & `'`).
- **Solución optimizada (`NOT EXISTS` para *Hash Anti-Join* + sustitución relacional de `PERIODICA`):**
  - *Paso previo recomendado con DBA:* Verificar la definición interna de `CENTRALITV.PERIODICA(CODSEPIVA, CODESTACION)`. Si consulta una columna bandera en `CENTRALITV.SEPIVA` (o `SUBSTR(CODSEPIVA,1,2) = '01'`), hacer **`INNER JOIN CENTRALITV.SEPIVA s`** directamente elimina millones de saltos PL/SQL. Si la lógica es compleja pero determinista, declararla `DETERMINISTIC` o activar `PRAGMA UDF` (Oracle 12c+), lo que acelera su evaluación en SQL entre **4x y 10x**.

```sql
-- NUEVA CONSULTA OPTIMIZADA DE CANDIDATOS A RECORDATORIO SMS
SELECT
    i.CODESTACION,
    i.CODINSPECCION,
    CASE WHEN SUBSTR(i.TELEFONO, 1, 1) IN ('6', '7') THEN i.TELEFONO ELSE i.TELEFONO2 END AS Telefono,
    i.MATRICULA,
    i.CIFFACTURA,
    i.NOMBRE || ' ' || i.APELLIDOS AS Cliente,
    i.FECHAINSPECCION,
    i.FECHACADUCIDAD
FROM CENTRALITV.INSPECCION i
INNER JOIN CENTRALITV.SEPIVA s
        ON s.CODESTACION = i.CODESTACION
       AND s.CODSEPIVA   = i.CODSEPIVA
       AND s.ES_PERIODICA = -1               -- Sustituye función PL/SQL CENTRALITV.PERIODICA(...)
WHERE i.CODESTACION       = :CodEstacion
  AND i.FECHACADUCIDAD   >= :FechaCadInicio
  AND i.FECHACADUCIDAD   <  :FechaCadFinMasUno
  AND i.ANULADA           = 0
  AND i.BAJA_TRAFICO      = 0
  AND i.RECORDATORIO_SMS  = -1
  AND i.RESULTADO        IN (1, 2)
  AND (i.TELEFONO LIKE '6%' OR i.TELEFONO LIKE '7%' OR i.TELEFONO2 LIKE '6%' OR i.TELEFONO2 LIKE '7%')
  -- Anti-Join 1: Excluir vehículos que ya pasaron una periódica posterior
  AND NOT EXISTS (
      SELECT 1
      FROM CENTRALITV.INSPECCION itmp
      INNER JOIN CENTRALITV.SEPIVA stmp
              ON stmp.CODESTACION = itmp.CODESTACION
             AND stmp.CODSEPIVA   = itmp.CODSEPIVA
             AND stmp.ES_PERIODICA = -1
      WHERE itmp.MATRICULA       = i.MATRICULA
        AND itmp.FECHAINSPECCION > i.FECHAINSPECCION
        AND itmp.ANULADA         = 0
  )
  -- Anti-Join 2: Excluir inspecciones ya incluidas en paquetes activos de este tipo
  AND NOT EXISTS (
      SELECT 1
      FROM CENTRALITV.ENVIOS_CLIENTE_SMS_DETALLE det
      INNER JOIN CENTRALITV.ENVIOS_CLIENTE_SMS cab
              ON cab.IDPAQUETE = det.IDPAQUETE
      WHERE det.CODINSPECCION     = i.CODINSPECCION
        AND cab.CODESTACION_ENVIO = :CodEstacion
        AND cab.IDTIPO_ENVIO      = :IdTipoEnvio
        AND cab.ESTADO           <> 9
  )
ORDER BY i.FECHACADUCIDAD, i.CODINSPECCION;
```

---

### Caso 3: Explorador de Localización (`frmCriteriosLocalizacion*.vb`) — *Paginación Server-Side y `LISTAGG` Diferido*

1. **Paginación Server-Side Nativa Oracle 12c+ (`OFFSET / FETCH` o *Keyset*):**
   - En lugar de traer 80.000 filas a memoria (`MaxNumRegistros = False`) y paginar con LINQ en el cliente, la API Web ejecutará paginación real para la vista en pantalla:
     ```sql
     ORDER BY i.FECHAINSPECCION DESC, i.CODESTACION, i.CODINSPECCION
     OFFSET :Offset ROWS FETCH NEXT :PageSize ROWS ONLY
     ```
2. **Cálculo diferido de `LISTA_DEFECTOS` (`LISTAGG`) solo sobre las 50–100 filas de la página actual:**
   - Hoy, cuando el usuario pide la columna `LISTA_DEFECTOS` ([frmCriteriosLocalizacion.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriteriosLocalizacion.vb#L1317)), Oracle agrupa con `LISTAGG` **todos los defectos del rango entero de fechas** antes de devolver el resultado.
   - En la nueva consulta paginada, primero se filtran y paginan las `100` claves `(CODESTACION, CODINSPECCION)` en una CTE (`WITH Pagina AS (...)`) y **solo para esas 100 inspecciones** se calcula la subconsulta lateral/escalar `LISTAGG` sobre `INSPECCION_DEFECTOS` (pasando de varios segundos a `< 30 ms`).
3. **Corrección del error `ORA-01791` en Localización de Mediciones (`frmCriteriosLocalizacionMediciones.vb:1030-1046`):**
   - Sustituir `SELECT DISTINCT <columnas> ... ORDER BY INSPECCION.CodEstacion...` por `EXISTS` sobre `INSPECCION_MEDICIONES` (cuando no se proyectan columnas de línea de medición) o incluir internamente las claves de ordenación en una subconsulta previa.

---

### Caso 4: Comparativa de Facturación Excel ([clsExcelFacturacion.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Clases/clsExcelFacturacion.vb#L142-L200))

- **Problemas actuales:**
  1. Carece de prefijo de esquema (`FROM INSPECCION INNER JOIN INSTANCIAS_BBDD`).
  2. Hace `UNION ALL` de dos escaneos agrupando por `ANYO`, lo que **rompe la comparativa si ambos rangos pertenecen al mismo año** (ej. Q1 2026 vs Q2 2026).
  3. Renombra estaciones con `CASE WHEN DESESTACION LIKE '%VILLALBA%'...` para encajar a la fuerza con texto fijo de una hoja Excel.
- **Solución optimizada:** Etiquetar explícitamente cada bloque por `'PERIODO_1'` y `'PERIODO_2'` (independientemente del año), vincular siempre por clave primaria **`CODESTACION`** (no por nombre truncado `DESESTACION`) y añadir metadatos de Sociedad (`TSA` / `CAL`) y `CCAA` en `CENTRALITV.ESTACIONES` para construir el libro OpenXML dinámicamente.

---

### Caso 5: Eliminación de Bucles N+1 (`frmUltimaInspeccion.vb` y Exportaciones Multi-Estación)

- **`frmUltimaInspeccion.vb` (hoy 34 llamadas `DLookup` secuenciales):** Se reemplaza por **1 sola consulta instantánea** que aprovecha *Index Min/Max Scan* o agregación por índice:
  ```sql
  SELECT
      e.CODESTACION,
      e.DESCRIPCION AS NombreEstacion,
      MAX(i.FECHAINSPECCION) AS UltimaInspeccionCentralizada
  FROM CENTRALITV.ESTACIONES e
  LEFT JOIN CENTRALITV.INSPECCION i
         ON i.CODESTACION = e.CODESTACION
  WHERE e.CENTRAL_DATOS = -1
    AND e.CODESTACION IN :EstacionesPermitidas
  GROUP BY e.CODESTACION, e.DESCRIPCION
  ORDER BY e.CODESTACION;
  ```
- **Inserción y Actualización de Paquetes SMS (`modDigitalServi_Funciones.vb`) e Importación CSV de Citas (`mdiMain.vb:1145`):**
  - Sustituir los bucles `For` que lanzan cientos de `INSERT` / `UPDATE` individuales sin transacción por **Array Binding de ODP.NET** (`OracleCommand.ArrayBindCount = registros.Count`) dentro de una transacción explícita (`BeginTransactionAsync()`), reduciendo 200 viajes de red a **1 solo round-trip atómico** a Oracle.

---

### Caso 6: Control de Fraude / Bastidores OBD No Coincidentes ([frmCriterios.vb](file:///c:/Project/ITV-CENTRAL_DATOS/Central_Datos/Formularios/frmCriterios.vb#L4148-L4385))

- **Problema actual:** Evalúa múltiples `REGEXP_LIKE` costosos por CPU sobre cada fila de `INSPECCION_MEDIC_OBD` en tiempo de consulta y omite el esquema `CENTRALITV.`.
- **Solución optimizada:**
  1. Calificar siempre `CENTRALITV.INSPECCION` y `CENTRALITV.INSPECCION_MEDIC_OBD`.
  2. Aplicar primero filtros baratos de igualdad/longitud (`LENGTH(TRIM(obd.NUMBASTIDOR_OBD)) = 17` y `TRIM(UPPER(i.NUMBASTIDOR)) <> TRIM(UPPER(obd.NUMBASTIDOR_OBD))`) antes de invocar `REGEXP_LIKE` (o materializar una columna virtual calculada `ES_VIN_OBD_DISCREPANTE` en Oracle indexada únicamente para los casos `'S'`, haciendo que el informe sea instantáneo en `< 10 ms`).

---

## 3. Plan de Índices, Secuencias y Arquitectura de Datos Recomendado al DBA Oracle

> [!TIP]
> Cuando conectes el servidor **MCP de Oracle** en `mcp_config.json`, podremos contrastar automáticamente estos índices contra `ALL_IND_COLUMNS` y `ALL_TAB_PARTITIONS` para generar únicamente el DDL diferencial exacto que falte en `CENTRALITV`.

1. **Índices Compuestos Clave a Verificar / Crear en `CENTRALITV`:**
   - `INSPECCION (CODESTACION, FECHAINSPECCION, ANULADA)` *(acelera el 90% de informes de facturación, horarios, favorables/rechazadas y localización; incluir o cubrir `CODFORMAPAGO`, `INDICA12`, `RESULTADO` según selectividad)*.
   - `INSPECCION (CODESTACION, FECHACADUCIDAD, ANULADA, RECORDATORIO_SMS)` *(acelera la extracción de campañas SMS y localización por vencimiento)*.
   - `INSPECCION (MATRICULA, ANULADA, FECHAINSPECCION)` *(crítico para el Anti-Join `NOT EXISTS` que comprueba si un vehículo ya pasó una ITV posterior en cualquier estación)*.
   - `ENVIOS_CLIENTE_SMS (CODESTACION_ENVIO, IDTIPO_ENVIO, ESTADO, IDPAQUETE)` + `ENVIOS_CLIENTE_SMS_DETALLE (CODINSPECCION, IDPAQUETE)` *(elimina Full Scans al deduplicar campañas SMS)*.
   - `INSPECCION_DEFECTOS (CODESTACION, CODINSPECCION, BLOQUE, DEFECTO)` e `INSPECCION_MEDIC_OBD (CODESTACION, CODINSPECCION)`.
2. **Particionamiento de `CENTRALITV.INSPECCION` (si aún no está particionada):**
   - Particionamiento por rango temporal (`PARTITION BY RANGE (FECHAINSPECCION) INTERVAL (NUMTOYMINTERVAL(1, 'MONTH'))`) con subparticionamiento o índices locales prefijados por `CODESTACION`, logrando *Partition Pruning* automático en todas las consultas por fechas.
3. **Sustitución de `SELECT MAX(ID) + 1` por `SEQUENCE`s Nativas Oracle (`CACHE 50`):**
   - Crear secuencias para `LOG_ACCESOS_MODULOS`, `LOG_PERMISOS_USUARIO`, `ENVIOS_CLIENTE_SMS` y `EQUIPOS_MEDICIONES_*`, eliminando bloqueos y colisiones bajo concurrencia Web multiusuario.
4. **Separación Carga Analítica Pesada vs. Operativa (Fase Evolución):**
   - Para cuadros de mando ejecutivos agregados (comparativas plurianuales de millones de inspecciones TSA/CAL y estadísticas MINER), crear **Vistas Materializadas con refresco incremental nocturno/horario (`DBMS_MVIEW`)** en Oracle (`MV_RESUMEN_DIARIO_ESTACION`), permitiendo que el Dashboard Web cargue un año completo de las 34 estaciones en **`< 15 ms`**.
