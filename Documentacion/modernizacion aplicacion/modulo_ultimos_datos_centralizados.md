# Módulo 01: Última Fecha de Inspección Centralizada (Estaciones ITV)

> **Módulo de consulta operativa de sincronización de estaciones ITV** (`Aplicación > Última fecha de inspección centralizada`).

---

## 1. Alcance de Datos y Tabla de Origen

En la aplicación original, este módulo consulta exclusivamente **estaciones ITV operativas** (excluyendo unidades móviles UMA y centros SOS).

### Consulta SQL Centralizada en Oracle:
```sql
SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CODESTACION,
       e.DesEstacion,
       e.Cod_Empresa,
       'ITV' AS TIPO_ESTACION,
       (SELECT MAX(i.FECHAINSPECCION) 
          FROM CENTRALITV.INSPECCION i 
         WHERE i.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')) AS ULTIMA_INSPECCION
  FROM CENTRALITV.ESTACIONES e
 WHERE e.Central_Datos = -1
 ORDER BY e.DesEstacion
```

### Definición de Campos Mostrados:
- **`Cod.` (`CODESTACION`)**: Código identificador oficial de la estación (4 dígitos con ceros a la izquierda, ej. `0202`, `2878`).
- **`Descripción` (`DESESTACION`)**: Nombre formal de la estación ITV (ej. `I.T.V. - ALBACETE`).
- **`Sociedad` (`COD_EMPRESA`)**: Identificador de la sociedad operadora (`01` = TÜV SÜD ATISAE, `03` = TÜV SÜD CAL).
- **`Última fecha` (`ULTIMA_INSPECCION`)**: Fecha y hora exacta de la última inspección recibida y almacenada en la tabla `CENTRALITV.INSPECCION` procedente de dicha estación.

---

## 2. Experiencia de Usuario (TÜV SÜD Algorithm Design System)

1. **Spinner Modal Bloqueante**: Al cargar o pulsar *"Actualizar Datos"*, un overlay translúcido con desenfoque de fondo (`backdrop-filter`) y componente `<TsSpinner>` bloquea la pantalla e impide interacción accidental mientras la consulta a Oracle está en curso.
2. **Navegación Superior Intuitiva**: Cabecera corporativa TÜV SÜD azul marino `#0b253b` con acceso directo a Swagger, estado de conexión a Oracle (`ORCLDV`) y navegación moderna por módulos funcionales.
3. **Resumen Operativo (KPIs limpios)**:
   - Total Estaciones ITV (32 estaciones fijas)
   - Estaciones TÜV SÜD ATISAE (TSA)
   - Estaciones TÜV SÜD CAL
   - Última Fecha Registrada en el sistema global.
4. **Tabla de Datos Optimizada**: Formateo con números tabulares (`font-variant-numeric: tabular-nums`) para alineación perfecta de códigos y fechas, filtro de texto instantáneo y filtrado por sociedad.

---

## 2. Componentes Implementados

### 2.1. Backend (.NET 10 Clean Architecture)
- **Dominio**: [EstacionUltimoDato.cs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Domain/Entities/EstacionUltimoDato.cs)
- **Aplicación**: [EstacionesService.cs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Application/Services/EstacionesService.cs) y [EstacionUltimoDatoDto.cs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Application/DTOs/EstacionUltimoDatoDto.cs)
- **Infraestructura**: [OracleEstacionesRepository.cs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Infrastructure/Repositories/OracleEstacionesRepository.cs) con fallback transparente de desarrollo a `CentralITV_Svc` SOAP si no hay túnel directo al puerto `:1521`.
- **API Endpoint**: `GET /api/v1/estaciones/ultimos-datos` en [Program.cs](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Api/Program.cs).

### 2.2. Frontend (React 19 + TÜV SÜD Algorithm Design System)
- **Componente**: [UltimosDatosCentralizados.tsx](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/components/UltimosDatosCentralizados.tsx)
- **Componentes Oficiales Utilizados**:
  - `TsCard`: Paneles de métricas KPI y contenedor de tabla.
  - `TsBadge`: Estados semánticos (`variant="success"` para al día, `variant="warning"` para desfase, `variant="danger"` para desconectadas).
  - `TsButton`: Acciones primarias y botón de refresco en vivo.
  - `TsInput`: Buscador instantáneo con botón de limpieza.
  - `TsAlert`: Gestión visual de incidencias de red.
  - Tipografía oficial **`TUV SUD Pro`** con números tabulares para códigos de estación ITV.

---

## 3. Cómo Probarlo en Local

1. **Arrancar el Backend .NET 10**:
   ```powershell
   dotnet run --project c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\src\CentralDatos.Api --launch-profile http
   ```
2. **Arrancar el Frontend React**:
   ```powershell
   cd c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\src\central-datos-web
   npm run dev
   ```
3. Abrir en el navegador: **`http://localhost:5173`**

