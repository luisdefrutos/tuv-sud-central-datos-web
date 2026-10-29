# TÜV SÜD — Central Datos Web (Entorno PoC Aislado)

> **Aislamiento estricto**: Este workspace (`c:\Project\TUV-SUD-CENTRAL-DATOS-WEB`) es 100 % independiente del repositorio SVN legacy (`c:\Project\ITV-CENTRAL_DATOS`). No comparte binarios, referencias ni ficheros de solución con el proyecto VB.NET WinForms.

## Estructura del Proyecto

- `TuvSud.CentralDatos.sln` — Solución **.NET 10** en Clean Architecture:
  - `src/CentralDatos.Domain` — Entidades de dominio ITV, Value Objects y contratos.
  - `src/CentralDatos.Application` — Casos de uso (CQRS ligero), validaciones y DTOs.
  - `src/CentralDatos.Infrastructure` — Acceso a Oracle (`Oracle.ManagedDataAccess.Core` Thin Mode con bind variables reales), autenticación AD/JWT y generación documental (`ClosedXML` / `QuestPDF`).
  - `src/CentralDatos.Api` — API Gateway RESTful (`/api/v1/*`) diseñada para desplegarse en coexistencia en IIS junto a los `.asmx` legacy.
- `src/central-datos-web` — SPA React 19 + TypeScript + Vite preparada para el **TÜV SÜD Algorithm Design System** (`@tuvsud/design-system`).
- `.agents/skills/tuv-sud-algorithm-ds` — Skill oficial de Antigravity con los tokens, utilidades CSS y catálogo de 84 componentes de `create.tuvsud.com`.
- `tools/central-datos-mcp` — Servidor **MCP de Base de Datos (Solo Lectura)** con transporte dual (`soap` vía `CentralITV_Svc` y `oracle` vía driver Thin `node-oracledb` v6).

## Comandos Rápidos

```powershell
# Compilar backend .NET 10
dotnet build TuvSud.CentralDatos.sln

# Ejecutar API en desarrollo
dotnet run --project src/CentralDatos.Api
```

## Configuración del Feed Privado TÜV SÜD Algorithm Design System

1. Copie `src/central-datos-web/.npmrc.example` a `src/central-datos-web/.npmrc` (excluido en `.gitignore`).
2. Defina la variable de entorno `TUVSUD_AZURE_PAT` con un Personal Access Token de Azure DevOps (`tuvsud01`) con permiso **Packaging (Read)**.
3. Instale el sistema de diseño oficial:
   ```powershell
   cd src/central-datos-web
   npm install @tuvsud/design-system @material-symbols/svg-400
   ```

