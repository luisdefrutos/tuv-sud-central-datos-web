# Guía del Entorno PoC Aislado y Servidor MCP de Base de Datos (`central-datos-db`)

> [!IMPORTANT]
> **Regla de Aislamiento**: Todo el código del nuevo proyecto Web y del servidor MCP reside exclusivamente en `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB`, completamente separado del repositorio SVN legacy `c:\Project\ITV-CENTRAL_DATOS`.

---

## 1. Estructura del Nuevo Workspace (`c:\Project\TUV-SUD-CENTRAL-DATOS-WEB`)

El entorno de prueba se ha inicializado con **Git** y compilado sin errores ni advertencias sobre **.NET 10 SDK (`10.0.402`)** y **Node.js (`v24.18.0`)**:

| Ruta | Tipo | Descripción |
| :--- | :--- | :--- |
| [TuvSud.CentralDatos.sln](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/TuvSud.CentralDatos.sln) | Solución VS | Solución unificada .NET 10 + Frontend JavaScript/TypeScript. |
| `src/CentralDatos.Domain` | Classlib C# | Entidades puras ITV organizadas por carpetas (`Entities/Estaciones/`). |
| `src/CentralDatos.Application` | Classlib C# | Casos de uso desacoplados por *Features* (`Features/Estaciones/DTOs, Interfaces, Services`). |
| `src/CentralDatos.Infrastructure` | Classlib C# | Persistencia y adaptadores externos (`Persistence/Repositories/OracleEstacionesRepository.cs`). |
| `src/CentralDatos.Api` | Web API C# | Minimal APIs desacopladas por módulos (`Endpoints/Estaciones/`, `Endpoints/Health/`). |
| `src/central-datos-web` | Proyecto `.esproj` | SPA **React 19 + TypeScript + Vite 6** integrado en la solución de Visual Studio. |
| [package.json](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/package.json) | NPM | Dependencias oficiales `@tuvsud/design-system` v1.36.0 y `@material-symbols/svg-400`. |
| [.npmrc.example](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/.npmrc.example) | Config | Plantilla para autenticar contra el feed privado Azure Artifacts de TÜV SÜD. |
| [index.mjs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/tools/central-datos-mcp/index.mjs) | MCP Server | Servidor **MCP de Base de Datos de Solo Lectura** (`central-datos-db`). |
| [AGENTS.md](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/AGENTS.md) | Guía | Reglas permanentes del workspace (sincronización documental y prohibición de auto-commit). |

---

## 2. Configuración de Inicio en Visual Studio (Backend + Frontend)

Al abrir [TuvSud.CentralDatos.sln](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/TuvSud.CentralDatos.sln) en Visual Studio 2022:

### Opción A — Varios Proyectos de Inicio (Recomendada en Visual Studio)
1. Haz **clic derecho** sobre la raíz de la solución (`Solución 'TuvSud.CentralDatos'`) en el Explorador de soluciones.
2. Selecciona **Configurar proyectos de inicio...** (*Set Startup Projects...*).
3. Marca el radio botón **Varios proyectos de inicio** (*Multiple startup projects*).
4. Configura las acciones:
   - **`CentralDatos.Api`** ➔ Acción: **Iniciar** (*Start*) \| Destino: **`CentralDatos.Api (Swagger)`**
   - **`central-datos-web`** ➔ Acción: **Iniciar sin depurar** (*Start without debugging*) \| Destino: **`central-datos-web`**
   *(Nota: Seleccionar "Iniciar sin depurar" para el frontend evita que Visual Studio intente enganchar su depurador de C++ a Chrome/Edge, permitiendo que Vite gestione el Hot Reload y la depuración nativa con F12).*
5. Pulsa **Aceptar**.
6. Al pulsar **F5**:
   - Se abrirá **Swagger UI** en `http://localhost:5113/swagger` para probar la API interactivamente.
   - Se abrirá la **Aplicación Web** en `http://localhost:5173` con el Algorithm Design System.

---

## 3. Pruebas Interactivas de la API (Swagger & Scalar)

Se han integrado y configurado dos motores interactivos de OpenAPI en [Program.cs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Api/Program.cs):

| Interfaz | URL | Descripción |
| :--- | :--- | :--- |
| **Swagger UI** | `http://localhost:5113/swagger` | Interfaz clásica de Swagger con botones *Try it out* para ejecutar llamadas en vivo. |
| **Scalar API Reference** | `http://localhost:5113/scalar/v1` | Interfaz interactiva de última generación para .NET 10 con cliente HTTP integrado. |
| **OpenAPI Schema** | `http://localhost:5113/openapi/v1.json` | Especificación JSON OpenAPI v3. |

### Opción B — Inicio automático mediante SpaProxy (.NET)
Si prefieres dejar únicamente `CentralDatos.Api` como proyecto de inicio único, el paquete `Microsoft.AspNetCore.SpaProxy` configurado en `CentralDatos.Api.csproj` invocará automáticamente `npm run dev` en segundo plano en `..\central-datos-web` y esperará a que Vite esté disponible en `http://localhost:5173`.

---

## 2. Servidor MCP de Base de Datos (`central-datos-db`)

### 2.1. Requisitos de Instalación en tu Equipo

No necesitas instalar ningún software ni driver adicional en tu máquina:
- **`Node.js v24.18.0`** y **`npm 11.16.0`**: Ya instalados y verificados.
- **Dependencias del MCP (`@modelcontextprotocol/sdk`, `oracledb` v6.7+, `fast-xml-parser`, `zod`)**: Ya instaladas en `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\tools\central-datos-mcp\node_modules`.
- **Sin Oracle Instant Client**: `node-oracledb` v6 opera en **Modo Thin 100 % JavaScript** (solo sería necesario definir `ORACLE_CLIENT_LIB_DIR` si una instancia antigua exigiera cifrado nativo propietario de Oracle Net).

### 2.2. Modos de Transporte Soportados (`DB_MODE`)

El archivo global [mcp_config.json](file:///C:/Users/Usuario/.gemini/config/mcp_config.json) ya ha quedado registrado con soporte para ambos escenarios de red de TÜV SÜD / GESITV:

#### Opción A — Modo `soap` (Configurado por defecto, sin necesidad de puerto `:1521`)
Ideal cuando tu puesto de desarrollo llega al servidor IIS (`gestion-desa.atisae.com` o `gestion.atisae.com`) por HTTPS `:443`, pero el firewall bloquea el acceso directo al puerto `:1521` de Oracle:

```json
{
  "mcpServers": {
    "central-datos-db": {
      "command": "node",
      "args": [
        "C:/Project/TUV-SUD-CENTRAL-DATOS-WEB/tools/central-datos-mcp/index.mjs"
      ],
      "env": {
        "DB_MODE": "soap",
        "CENTRALITV_WS_URL": "https://gestion-desa.atisae.com/centralitvwebservice/centralitv.asmx"
      }
    }
  }
}
```

#### Opción B — Modo `oracle` (Conexión TCP directa `:1521` vía `oracledb` Thin)
Ideal si dispones de VPN con visibilidad directa a la instancia Oracle de Desarrollo y un usuario de lectura:

```json
{
  "mcpServers": {
    "central-datos-db": {
      "command": "node",
      "args": [
        "C:/Project/TUV-SUD-CENTRAL-DATOS-WEB/tools/central-datos-mcp/index.mjs"
      ],
      "env": {
        "DB_MODE": "oracle",
        "ORACLE_CONNECT_STRING": "host-oracle-desa:1521/SERVICIO_CENTRALITV",
        "ORACLE_USER": "USUARIO_LECTURA",
        "ORACLE_PASSWORD": "TU_PASSWORD"
      }
    }
  }
}
```

### 2.3. Pasos para Activar / Recargar el MCP en Antigravity

1. Asegúrate de tener activa la **VPN corporativa** (para alcanzar `gestion-desa.atisae.com` o el host Oracle).
2. En la interfaz de Antigravity, abre el menú **Additional Options (`...`) > MCP Servers**.
3. Pulsa **Refresh / Reload** sobre **`central-datos-db`**.
4. Pídeme en el chat: *"Haz un `db_ping` con el MCP de Central Datos"* para verificar la conexión en vivo.

### 2.4. Catálogo de Herramientas MCP y Garantías de Seguridad

El servidor implementa **protección estricta de Solo Lectura**: antes de enviar cualquier consulta por red, elimina comentarios/literales, exige inicio por `SELECT` o `WITH`, bloquea múltiples sentencias (`;`), prohíbe `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `DDL`, bloques PL/SQL (`BEGIN/DECLARE`), `FOR UPDATE`, `DBMS_*` / `UTL_*`, abre transacción `SET TRANSACTION READ ONLY` (en modo `oracle`), preserva ceros a la izquierda (ej. estación `"0502"`) y limita el retorno a un máximo de **200 filas**.

| Herramienta MCP | Función Principal |
| :--- | :--- |
| `db_ping` | Verifica conectividad, versión del Web Service (en modo `soap`), usuario Oracle, `DB_NAME` y hora del servidor. |
| `list_tables` | Lista tablas y vistas de un esquema (`CENTRALITV`, `COMUN`, etc.) con `NUM_ROWS` y `LAST_ANALYZED`. |
| `describe_table` | Devuelve columnas, tipos de datos, precisión, nulabilidad y comentarios (`ALL_TAB_COLUMNS` + `ALL_COL_COMMENTS`). |
| `list_indexes` | Inspecciona todos los índices y orden de columnas (`ALL_INDEXES` + `ALL_IND_COLUMNS`) para optimización SQL. |
| `get_plsql_source` | Lee código fuente de paquetes, procedimientos, funciones o triggers desde `ALL_SOURCE` por rangos de líneas. |
| `query_readonly` | Ejecuta consultas `SELECT` / `WITH` de diagnóstico con límite configurable (`1..200` filas, por defecto `50`). |
