# Guía Técnica: Creación y Configuración del Servidor MCP para Oracle DB (Desarrollo y Producción)

> **Destinatarios**: Desarrolladores del equipo TÜV SÜD / GESITV.  
> **Objetivo**: Explicar paso a paso la arquitectura, seguridad, instalación y configuración del servidor MCP (*Model Context Protocol*) que conecta la IA de asistencia (Antigravity / Claude / Cursor) de forma segura y en solo lectura contra las bases de datos Oracle de **Desarrollo** (`ORCLDV`) y **Producción** (`orclpr`).

---

## 1. ¿Qué es un MCP y por qué lo usamos?

El **Model Context Protocol (MCP)** es un estándar abierto desarrollado para que los asistentes de IA puedan interactuar con sistemas externos (bases de datos, APIs, repositorios) mediante herramientas (*tools*) estructuradas.

### El problema anterior
Cuando programamos contra la base de datos de Central Datos:
1. No disponemos de Entity Framework clásico ni andamiaje automático DbFirst.
2. Cada tabla nueva, campo añadido o modificación de vistas obligaba al desarrollador a abrir PL/SQL Developer / SQL Developer, buscar la tabla, copiar el DDL o la definición de columnas y pegársela a la IA para que escribiera el DTO, la Entity, el Repository o la query en C#.
3. Riesgo de errores tipográficos en nombres de columnas (`COD_ESTACION`, `NUM_EXPEDIENTE`, fechas, etc.) y desconocimiento de tipos de datos exactos.

### La solución con el Servidor MCP (`central-datos-db`)
La IA dispone de un "conector local" que le permite consultar en tiempo real el diccionario de datos de Oracle (`ALL_TAB_COLUMNS`, `ALL_INDEXES`, `ALL_SOURCE`) y ejecutar queries `SELECT` de comprobación. Si pides: *"Crea el DTO y el repositorio para la tabla RECORDATORIO_ENVIO_RESP"*, la IA misma lee las columnas, sus tipos y nulabilidad directamente de la base de datos y escribe el código exacto.

---

## 2. Arquitectura de la Solución (`tools/central-datos-mcp`)

El servidor MCP está construido en **Node.js** (módulo ES puro `index.mjs`) y reside en:
📁 `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\tools\central-datos-mcp`

```
┌────────────────────────────────────────────────────────────────┐
│               Asistente IA (Antigravity / IDE)                │
└───────────────────────────────┬────────────────────────────────┘
                                │ Protocolo MCP (Stdio JSON-RPC)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│             tools/central-datos-mcp/index.mjs                  │
│  - Guardrails de Seguridad (Solo Lectura estricto)             │
│  - Límite de 200 filas (protección de ventana de contexto)     │
└───────────────┬────────────────────────────────┬───────────────┘
                │ (Modo oracle)                  │ (Modo soap - contingencia)
                ▼                                ▼
   ┌──────────────────────────┐    ┌───────────────────────────┐
   │ oracledb v6+ (Modo Thin) │    │ HTTPS SOAP (Puerto 443)   │
   │ TCP directo :1521        │    │ centralitv.asmx           │
   │ Sin Oracle Instant Client│    │ Firma MD5 Clave/Passport  │
   └────────────┬─────────────┘    └─────────────┬─────────────┘
                │                                │
                ▼                                ▼
┌────────────────────────────────────────────────────────────────┐
│             Bases de Datos Oracle (TÜV SÜD)                   │
│   • Desarrollo: 10.108.206.7:1521 (ORCLDV)                     │
│   • Producción: 10.108.206.3:1521 (orclpr)                     │
└────────────────────────────────────────────────────────────────┘
```

### Ventajas clave de esta arquitectura:
1. **Modo Thin 100 % JavaScript (`node-oracledb` v6+)**:  
   **No requiere instalar Oracle Instant Client**, ni configurar DLLs nativas de C++, ni variables `PATH` o `ORACLE_HOME`. Solo requiere tener Node.js (v20 o superior).
2. **Doble mecanismo de transporte (`DB_MODE`)**:
   - **`oracle`**: Conexión nativa directa por puerto TCP `:1521` (la más rápida para desarrollo diario con VPN).
   - **`soap`**: Conexión a través del WebService clásico `centralitv.asmx` por HTTPS `:443` (usando la firma MD5 `Clave`/`Passport`), útil si en alguna red o máquina el puerto 1521 estuviera bloqueado por firewall.

---

## 3. Seguridad y Garantías: Solo Lectura Blindado

Para poder conectar una IA a bases de datos de empresa (y especialmente a **Producción**), el servidor implementa **4 capas de blindaje**:

1. **Filtro Léxico y Sintáctico (Regex antes de red)**:
   - Solo se permiten sentencias que comiencen inequívocamente por `SELECT` o `WITH`.
   - Se rechaza en seco cualquier intento de:  
     `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `EXEC`, `BEGIN`, `DECLARE`, `FOR UPDATE`.
   - Se prohíbe el acceso a paquetes de sistema peligrosos como `DBMS_*` o `UTL_*`.
   - Se rechazan múltiples sentencias separadas por punto y coma (`;`).
2. **Aislamiento Transaccional en Base de Datos**:
   - Nada más abrir la conexión en modo directo, se ejecuta:  
     `SET TRANSACTION READ ONLY;`  
     Cualquier modificación involuntaria generará un error de Oracle ORA-01456 a nivel de motor.
3. **Límite de Filas (Hard Limit = 200 filas)**:
   - Evita desbordar la memoria y los tokens del asistente si una query devuelve cientos de miles de registros.
4. **Preservación de Tipos e Identificadores ITV**:
   - Los códigos con ceros a la izquierda (como estaciones `"0502"` o tipos `"01"`) no se convierten a número entero, evitando pérdidas de formato.

---

## 4. Datos de Conexión de los Entornos

En la infraestructura de TÜV SÜD Central Datos disponemos de dos entornos:

| Parámetro | Entorno de Desarrollo (DESA) | Entorno de Producción (PROD) |
| :--- | :--- | :--- |
| **Host IP** | `10.108.206.7` | `10.108.206.3` |
| **Puerto** | `1521` | `1521` |
| **Service Name** | `ORCLDV.snprivate.vcnatisae.oraclevcn.com` | `orclpr.snprivate.vcnatisae.oraclevcn.com` |
| **Usuario Oracle** | `CENTRALITV` | `CENTRALITV` |
| **Oracle Connect String** | `10.108.206.7:1521/ORCLDV.snprivate.vcnatisae.oraclevcn.com` | `10.108.206.3:1521/orclpr.snprivate.vcnatisae.oraclevcn.com` |
| **WebService SOAP URL** | `https://gestion-desa.atisae.com/centralitvwebservice/centralitv.asmx` | `https://gestion.atisae.com/centralitvwebservice/centralitv.asmx` |

---

## 5. Paso a Paso: Cómo Crear y Configurar el MCP

Si un compañero de equipo quiere replicarlo o configurarlo en su propia máquina, estos son los pasos exactos:

### Paso 1: Requisitos previos en el PC
- Tener instalado **Node.js** (v20 o superior). Comprobar en terminal con `node -v`.
- Estar conectado a la **VPN corporativa** de TÜV SÜD (para tener acceso a las IPs `10.108.206.*`).

### Paso 2: Crear el directorio y descargar dependencias
En la carpeta `tools/central-datos-mcp`:
```bash
cd c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\tools\central-datos-mcp
npm install
```
El archivo `package.json` contiene únicamente 4 dependencias:
```json
{
  "name": "central-datos-mcp",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.10.2",
    "oracledb": "^6.7.2",
    "fast-xml-parser": "^5.0.9",
    "zod": "^3.24.2"
  }
}
```

### Paso 3: Registrar el servidor MCP en el IDE / Antigravity

#### VS Code (configuración de este workspace)

El repositorio incluye [`../../.vscode/mcp.json`](../../.vscode/mcp.json), que registra dos servidores Oracle Thin independientes:

| Servidor VS Code | Entorno | Servicio |
|---|---|---|
| `central-datos-desa` | Desarrollo | `10.108.206.7:1521/ORCLDV.snprivate.vcnatisae.oraclevcn.com` |
| `central-datos-prod` | Producción | `10.108.206.3:1521/orclpr.snprivate.vcnatisae.oraclevcn.com` |

En VS Code, abre **MCP: List Servers** e inicia el servidor del entorno autorizado. La primera vez, VS Code solicitará su contraseña Oracle en un campo oculto. Las dos contraseñas se solicitan por separado y no están guardadas en el repositorio ni en el archivo de configuración. No copies credenciales en archivos versionados ni en prompts o chats. Si una contraseña real se ha compartido fuera del canal autorizado, solicita su rotación al responsable de base de datos.

Requisitos: Node.js 20 o superior, dependencias instaladas con `npm ci` desde `tools/central-datos-mcp` y acceso de red/VPN al host del entorno. La configuración usa el usuario `CENTRALITV`. Antes de habilitar Producción, confirma con DBA que la cuenta tiene privilegios de solo lectura; `SET TRANSACTION READ ONLY` y los guardrails del servidor MCP son capas adicionales, no sustituyen una cuenta Oracle de mínimo privilegio. Para medir la duración de consulta sin incluir el establecimiento de conexión, usa `queryElapsedMs` de `query_readonly`; incluye ejecución y lectura de las filas solicitadas.

El asistente de IA lee los servidores MCP registrados en el fichero JSON de configuración:
- **Ruta global de Antigravity**: `C:\Users\<TuUsuario>\.gemini\config\mcp_config.json`
- **Ruta local de proyecto**: `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\.agents\mcp_config.json`

Para clientes MCP distintos de VS Code, registra dos procesos independientes y suministra cada contraseña desde el almacén de secretos o el entorno local no versionado del IDE. Ejemplo estructural (sin credenciales):

```json
{
  "mcpServers": {
    "central-datos-desa": {
      "command": "node",
      "args": [
        "C:/Project/TUV-SUD-CENTRAL-DATOS-WEB/tools/central-datos-mcp/index.mjs"
      ],
      "env": {
        "DB_MODE": "oracle",
        "ORACLE_CONNECT_STRING": "10.108.206.7:1521/ORCLDV.snprivate.vcnatisae.oraclevcn.com",
        "ORACLE_USER": "CENTRALITV",
        "ORACLE_PASSWORD": "<inyectar desde el almacén de secretos>"
      }
    },
    "central-datos-prod": {
      "command": "node",
      "args": [
        "C:/Project/TUV-SUD-CENTRAL-DATOS-WEB/tools/central-datos-mcp/index.mjs"
      ],
      "env": {
        "DB_MODE": "oracle",
        "ORACLE_CONNECT_STRING": "10.108.206.3:1521/orclpr.snprivate.vcnatisae.oraclevcn.com",
        "ORACLE_USER": "CENTRALITV",
        "ORACLE_PASSWORD": "<inyectar desde el almacén de secretos>"
      }
    }
  }
}
```

> [!NOTE]
> Si el compañero prefiere usar el modo alternativo **SOAP** (por ejemplo, para no exponer credenciales directas de Oracle o cuando trabaje fuera de la IP directa :1521), la configuración es:
> ```json
> "env": {
>   "DB_MODE": "soap",
>   "CENTRALITV_WS_URL": "https://gestion-desa.atisae.com/centralitvwebservice/centralitv.asmx",
>   "CENTRALITV_WS_SECRET": "inyectado desde el almacén de secretos del IDE"
> }
> ```

### Paso 4: Reiniciar / Recargar Servidores MCP en Antigravity
1. En la barra superior o menú de opciones de Antigravity, pulsar en los tres puntos `...` o en el panel de **MCP Servers**.
2. Hacer clic en **Reload / Refresh**.
3. Los servidores configurados (`central-datos-desa` y `central-datos-prod`) aparecerán como disponibles. Inicia solo el entorno autorizado y acepta el prompt de contraseña correspondiente.

---

## 6. Catálogo de Herramientas (*Tools*) Disponibles para la IA

Una vez conectado, la IA puede invocar cualquiera de estas 6 funciones de forma natural:

| Herramienta | Argumentos | Descripción y Ejemplo |
| :--- | :--- | :--- |
| **`db_ping`** | *Ninguno* | Comprueba latencia, hora del servidor Oracle, usuario conectado y nombre de la base de datos (`DB_NAME`). |
| **`list_tables`** | `owner` (opcional, ej. `"CENTRALITV"`), `filter` (opcional, ej. `"INSPEC%"`) | Lista tablas y vistas junto con el número aproximado de filas (`NUM_ROWS`) y fecha del último análisis. |
| **`describe_table`** | `tableName` (ej. `"ESTACIONES"`), `owner` (opcional) | Extrae la estructura completa: columnas, tipo de dato (`VARCHAR2`, `NUMBER`, etc.), si admite nulos, claves primarias y comentarios de campo. |
| **`list_indexes`** | `tableName` (ej. `"INSPECCIONES"`), `owner` (opcional) | Lista todos los índices existentes y las columnas indexadas. Fundamental para optimizar queries lentas. |
| **`get_plsql_source`** | `name` (ej. `"PCK_GESTION"`), `type` (opcional, ej. `"PACKAGE BODY"`), `startLine`, `endLine` | Lee el código fuente PL/SQL directamente desde `ALL_SOURCE` paginado por líneas. |
| **`query_readonly`** | `sql` (ej. `"SELECT * FROM ESTACIONES WHERE ACTIVO = 'S'"`), `maxRows` (1..200) | Ejecuta una consulta de solo lectura acotada con protección anti-DML. |

---

## 7. Ejemplos Prácticos de Uso en el Chat

Tu compañero puede pedirle directamente al asistente frases como estas:

1. **Comprobar si hay conexión:**
   > *"Haz un `db_ping` contra la base de datos de Desarrollo para ver si responde."*

2. **Crear una clase C# a partir de una tabla real:**
   > *"Consulta la estructura de la tabla `RECORDATORIO_ENVIO_RESP` en Oracle y crea el DTO de C# con todas sus propiedades bien tipadas."*

3. **Auditar el rendimiento de una consulta:**
   > *"Revisa los índices de la tabla `INSPECCION_OBD` y dime qué campos conviene poner en el WHERE de la consulta para que use índice."*

4. **Comparar datos entre entornos:**
   > *"Lanza una consulta en Desarrollo y otra en Producción a la tabla `VERSIONES_APP` para ver qué versión está desplegada en cada una."*

---

## 8. Resumen Ejecutivo para Explicarle a un Compañero

1. **¿Qué es?**: Un puente local en Node.js que conecta el asistente de IA con Oracle.
2. **¿Requiere instalar Oracle Client?**: **No**. Usa el driver oficial `oracledb` en modo Thin (JavaScript puro).
3. **¿Qué protecciones aplica?**: Solo acepta consultas `SELECT`/`WITH`, limita las filas devueltas y activa `SET TRANSACTION READ ONLY` en conexión Oracle directa. Esto reduce el riesgo, pero no sustituye una cuenta Oracle de solo lectura ni constituye una garantía de seguridad absoluta.
4. **¿Soporta ambos entornos?**: Sí, se definen dos servidores en `mcp_config.json`: uno para `ORCLDV` (Desarrollo, IP `10.108.206.7`) y otro para `orclpr` (Producción, IP `10.108.206.3`).
5. **¿Qué beneficio da?**: Evita tener que copiar manualmente esquemas de tablas, índices o DDLs; la IA consulta la base de datos en milisegundos y genera código C# y TypeScript 100 % exacto a las tablas reales.
