# CONTEXTO TÉCNICO COMPACTADO PARA AGENTE LOCAL (OLLAMA / MCP)

> **Documento:** 21_contexto_compactado_ollama_mcp.md  
> **Destinado a:** Modelo local LLM (`qwen-antigravity:latest` / `qwen2.5-coder:7b`) vía MCP / System Prompt  
> **Workspace:** `c:\Project\tuv-sud-central-datos-web`  
> **Fecha de corte:** 03/11/2026 · **Versión del Proyecto:** 2.19.0  

---

## 1. Reglas Maestras del Proyecto

1. **Aislamiento Legacy**: Prohibido tocar o escribir código en `c:\Project\ITV-CENTRAL_DATOS`. Todo desarrollo reside exclusivamente en `c:\Project\tuv-sud-central-datos-web`.
2. **Sincronización de Documentación**: Cualquier documento técnico nuevo o modificado debe sincronizarse en `Documentacion/modernizacion aplicacion/` y listarse en `00_INDICE_DOCUMENTACION_MODERNIZACION.md`.
3. **Control de Versiones**: Prohibido ejecutar `git commit` sin orden explícita e inequívoca del usuario en el prompt.
4. **Design System Oficial**: Toda interfaz React usa **TÜV SÜD Algorithm Design System** (`@tuvsud/design-system/react`, prefijo `Ts*`, tokens `--ts-semantic-*`, tipografía `'TUV SUD Pro'`). Prohibido usar librerías externas como Material UI o Bootstrap.
5. **Tooltips y Títulos**: Toda acción o campo enriquecido utiliza el componente corporativo `AppTooltip` (`src/components/common/AppTooltip.tsx`). Prohibido usar el atributo HTML nativo `title="..."`.

---

## 2. Stack Tecnológico y Arquitectura

```
tuv-sud-central-datos-web/
├── src/
│   ├── CentralDatos.Api/             -> ASP.NET Core 10 Minimal APIs (Endpoints agrupados)
│   ├── CentralDatos.Application/     -> Interfaces, DTOs, Servicios de Aplicación
│   ├── CentralDatos.Domain/          -> Entidades, Enums, Reglas de Dominio
│   ├── CentralDatos.Infrastructure/  -> Dapper, Oracle.ManagedDataAccess.Core, ClosedXML, SQL parametrizado
│   └── central-datos-web/            -> React 19 + TypeScript + Vite + Algorithm DS
└── Documentacion/                    -> Histórico y manuales técnicos de modernización
```

- **Backend**: .NET 10, C# 13, Dapper sobre Oracle 19c dedicado, ClosedXML (Excel `.xlsx`), Serilog con enmascaramiento de seguridad.
- **Frontend**: React 19, TypeScript 5, Vite, Router por Hash (`window.location.hash`) con sincronización en `sessionStorage` para navegación F5 sin perder estado.
- **Oracle DB**: Esquema `CENTRALITV`. Tablas clave: `INSPECCION`, `INSPECCION_MEDIC_OBD`, `ESTACIONES`, `SERVICIOSPORTIPOINSPECCION`, `tipovehiculo_ident`, `INSPECCION_DEFECTOS`.

---

## 3. Estado de la Modernización y Módulos Implementados

| Módulo | Ruta Frontend | Endpoint Backend | Estado |
|---|---|---|---|
| Monitor de Últimos Datos | `#/modulo/ultimos-datos` | `/api/v1/inspecciones/ultimas` | ✅ Producción |
| Autenticación y Login | `/login` | `/api/v1/auth/login` | ✅ Producción |
| Inspecciones Defecto OBD | `#/modulo/inspecciones-defecto-obd` | `/api/v1/informes/inspecciones-defecto-obd` | ✅ Producción |
| Inspecciones Sin Inspector | `#/modulo/inspecciones-sin-inspector` | `/api/v1/informes/inspecciones-sin-inspector` | ✅ Producción |
| Cupones Descuento | `#/modulo/inspecciones-cupon-descuento` | `/api/v1/informes/inspecciones-cupon-descuento` | ✅ Producción |
| Facturación Comparativa Excel | `#/modulo/facturacion-comparativa-excel` | `/api/v1/informes/facturacion-comparativa-excel` | ✅ Producción |
| Estadística MINER Global | `#/modulo/miner-datos-globales` | `/api/v1/informes/miner-datos-globales` | ✅ Producción |
| **Bastidores OBD No Coincidentes** | `#/modulo/control-obd-no-coincidentes` | `/api/v1/informes/bastidores-obd-no-coincidentes` | ✅ **v2.19.0 (Último)** |

---

## 4. Núcleo Técnico: Módulo Bastidores OBD No Coincidentes (v2.19.0)

### 4.1. Propósito de Negocio (Antifraude y Calidad ITV)
Detecta inspecciones periódicas donde el número de bastidor registrado legalmente en la ficha técnica (`I.NUMBASTIDOR`) **no coincide** con el número de bastidor leído electrónicamente por el escáner de diagnosis desde la ECU del vehículo (`OBD.NUMBASTIDOR_OBD`).

### 4.2. Consulta SQL Optimizada (Oracle 19c)
Ubicación: `src/CentralDatos.Infrastructure/Persistence/Sql/Informes/ObtenerInformeBastidoresObdNoCoincidentes.sql`

```sql
SELECT i.CODINSPECCION                                               AS CodInspeccion,
       LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')                    AS CodEstacion,
       NVL(e.DesEstacion, 'Estación ' || i.CODESTACION)              AS DesEstacion,
       NVL(e.Cod_Empresa, '01')                                      AS CodEmpresa,
       i.FECHAINSPECCION                                             AS FechaInspeccion,
       i.NUMBASTIDOR                                                 AS BastidorInspeccion,
       obd.NUMBASTIDOR_OBD                                           AS BastidorObd,
       i.MATRICULA                                                   AS Matricula,
       i.CATEGORIA                                                   AS Categoria,
       i.CLASIFICACION                                               AS Clasificacion,
       i.NOMBRE                                                      AS Nombre,
       i.APELLIDOS                                                   AS Apellidos,
       i.CIFFACTURA                                                  AS CifFactura,
       i.CODINSPECTOR                                                AS CodInspector,
       i.CODINSPECTOR1                                               AS CodInspector1,
       i.CODINSPECTOR2                                               AS CodInspector2,
       i.CODINSPECTOR3                                               AS CodInspector3,
       i.CODRESPONSABLEVALIDACION                                    AS InspectorResponsableValidacion,
       obd.EQUIPO_OBD                                                AS EquipoObd,
       obd.CODEMPLEADO_BASTIDOR                                      AS CodEmpleadoBastidor
  FROM CENTRALITV.INSPECCION i
 INNER JOIN CENTRALITV.INSPECCION_MEDIC_OBD obd
    ON i.CODINSPECCION = obd.CODINSPECCION
   AND i.CODESTACION   = obd.CODESTACION
  LEFT JOIN CENTRALITV.ESTACIONES e
    ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')
 WHERE i.ANULADA = 0
   AND i.FECHAINSPECCION >= :FechaInicio
   AND i.FECHAINSPECCION <= :FechaFin/*WHERE_EXTRA*/
   -- Reglas oficiales antifraude y exclusión de basura electrónica:
   AND i.NUMBASTIDOR IS NOT NULL AND TRIM(i.NUMBASTIDOR) IS NOT NULL
   AND obd.NUMBASTIDOR_OBD IS NOT NULL AND TRIM(obd.NUMBASTIDOR_OBD) IS NOT NULL
   AND TRIM(UPPER(i.NUMBASTIDOR)) <> TRIM(UPPER(obd.NUMBASTIDOR_OBD))
   AND LENGTH(TRIM(obd.NUMBASTIDOR_OBD)) = 17
   AND NOT REGEXP_LIKE(obd.NUMBASTIDOR_OBD, '[-¿?\\/<>]')
   AND NOT REGEXP_LIKE(TRIM(obd.NUMBASTIDOR_OBD), '^(.)\1{16}$')
   AND UPPER(obd.NUMBASTIDOR_OBD) NOT LIKE '%EEPR%READ%ERR%'
 ORDER BY i.FECHAINSPECCION DESC
```

**Optimización Clave**: Pushdown de estación (`/*WHERE_EXTRA*/`). Si el usuario selecciona estación(es), se inyecta la condición en ambas tablas:
`AND i.CODESTACION IN (...) AND obd.CODESTACION IN (...)`. Esto activa el índice `PK_INSPECCION_MEDIC_OBD (CODESTACION, CODINSPECCION)` por *Index Range Scan*, reduciendo el tiempo de 4.472 ms a **573 ms** (8x más rápido).

### 4.3. Reglas de Interacción Frontend (UX)
1. **Tooltips**: Todos los KPI y celdas usan `<AppTooltip>`.
2. **Navegación al Grid**: Al pulsar en un KPI interactivo (ej. Equipo OBD `31510`, Estación) o en una celda de bastidor/matrícula:
   - Se ejecuta `filtrarPorValor(termino)`.
   - Se actualiza el estado `searchTerm`.
   - La pantalla hace scroll suave a `#report-search-container`.
   - El buscador muestra un halo de acento visual azul (`box-shadow: 0 0 0 4px rgba(0, 43, 73, 0.25)`).
   - Se aplica foco y selección al input `#report-search-input`.
3. **Tooltip del Buscador (`ReportTableContainer.tsx`)**:
   - Con texto: *"Datos del grid filtrados por el valor introducido en la caja. Para mostrar todos los datos limpie dicho valor."*
   - Vacío: *"Escriba cualquier término (bastidor, matrícula, estación, equipo OBD...) o pulse en un KPI o bastidor para filtrar al instante."*
4. **Ficha Técnica Comparativa**: Modal interactivo con comparación visual carácter a carácter destacando en rojo las discrepancias exactas.
5. **Responsividad**: Layout adaptable con `clamp()`, `grid auto-fit minmax(220px, 1fr)`, scroll táctil en tabla con columna sticky de acciones, y modal limitado a `min(720px, 94vw)` y `max-height: 90vh`.

---

## 5. Configuración de Ollama Local vía MCP

- **Modelo**: `qwen-antigravity:latest` (creado a partir de `qwen2.5-coder:7b` con `PARAMETER num_ctx 8192` y `temperature 0.2`).
- **Archivo de Configuración MCP**: `.agents/mcp_config.json`
```json
{
  "mcpServers": {
    "ollama-local": {
      "command": "npx",
      "args": ["-y", "@zenithfoundry/slm-gate@1", "mcp"],
      "env": {
        "OLLAMA_HOST": "http://127.0.0.1:11434",
        "DEFAULT_MODEL": "qwen-antigravity:latest"
      }
    }
  }
}
```
- **Tareas recomendadas para delegar a Ollama**:
  - Generación de DTOs y mapeos C# / TypeScript.
  - Generación de scripts SQL DDL/DML y consultas analíticas secundarias.
  - Creación de pruebas unitarias xUnit / Vitest.
  - Refactorizaciones de componentes visuales repetitivos.

---

## 6. Siguientes Informes Planificados (`frmCriterios.vb`)

1. **Inspecciones con Vehículo Sustitutivo / Duplicados**
2. **Informe de Eficacias de Frenado Anómalas**
3. **Inspecciones con Emisiones Gasolina / Diésel Límites**
4. **Informe de Tiempos de Inspección por Inspector / Línea**

