# Módulo 01: Última Fecha de Inspección Centralizada (Estaciones ITV)

> **Módulo de consulta operativa de sincronización de estaciones ITV** (`Aplicación > Última fecha de inspección centralizada`).

---

## 1. Alcance de Datos y Tabla de Origen

En la aplicación original, este módulo consulta exclusivamente **estaciones ITV operativas de TÜV SÜD** (excluyendo unidades móviles UMA, centros SOS y estaciones externas como Tarancón Ext. o traspasadas como Maqueda y Villasante).

### Consulta SQL Centralizada en Oracle:
```sql
SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CodEstacion,
       e.DesEstacion                               AS DesEstacion,
       e.Cod_Empresa                               AS CodEmpresa,
       'ITV'                                       AS TipoEstacion,
       (SELECT MAX(i.FECHAINSPECCION) 
          FROM CENTRALITV.INSPECCION i 
         WHERE i.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')) AS UltimaInspeccion
  FROM CENTRALITV.ESTACIONES e
 WHERE e.Central_Datos = -1
   AND e.Cod_Empresa IN ('01', '03')
   AND LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') NOT IN ('4510', '0905')
 ORDER BY e.DesEstacion
```

### Definición de Campos Mostrados:
- **`Cod.` (`CodEstacion`)**: Código identificador oficial de la estación (4 dígitos con ceros a la izquierda, ej. `0202`, `2878`).
- **`Descripción` (`DesEstacion`)**: Nombre formal de la estación ITV (ej. `I.T.V. - ALBACETE`).
- **`Sociedad` (`CodEmpresa`)**: Identificador de la sociedad operadora (`01` = TÜV SÜD ATISAE, `03` = TÜV SÜD CAL).
- **`Última fecha` (`UltimaInspeccion`)**: Fecha y hora exacta de la última inspección recibida y almacenada en la tabla `CENTRALITV.INSPECCION` procedente de dicha estación.

---

## 2. Experiencia de Usuario (TÜV SÜD Algorithm Design System)

1. **Logotipo Oficial Vectorial (SVG)**: Octágono corporativo oficial de TÜV SÜD renderizado mediante geometría vectorial nativa (`TuvSudLogo.tsx`) en cabecera y favicon del navegador.
2. **Spinner Modal Bloqueante**: Al cargar o pulsar *"Actualizar Datos"*, un overlay translúcido con desenfoque de fondo (`backdrop-filter`) y componente `<TsSpinner>` bloquea la pantalla e impide interacción accidental mientras la consulta a Oracle está en curso.
3. **Navegación Superior Intuitiva**: Cabecera corporativa TÜV SÜD azul marino `#0b253b` con acceso directo a Swagger, estado de conexión a Oracle (`ORCLDV`) y navegación moderna por módulos funcionales.
4. **Resumen Operativo (KPIs limpios)**:
   - Total Estaciones ITV: **29 estaciones oficiales TÜV SÜD**
   - Estaciones TÜV SÜD ATISAE: **26**
   - Estaciones TÜV SÜD CAL: **3** (Belorado, Briviesca y Miranda de Ebro)
   - Última Fecha Registrada en el sistema global.
5. **Tabla de Datos Optimizada**: Formateo con números tabulares (`font-variant-numeric: tabular-nums`) para alineación perfecta de códigos y fechas, filtro de texto instantáneo y filtrado por sociedad.
6. **Constantes y Configuración Centralizada**: Ningún valor mágico ni URLs hardcodeadas en componentes ni constructores; todo gestionado desde `constants/` y el patrón `IOptions<CentralItvOptions>`.

---

## 3. Arquitectura de Acceso a Datos (Dapper + SQL Embebido Desacoplado)

Siguiendo las mejores prácticas de Clean Architecture para bases de datos relacionales existentes:

1. **Micro-ORM Dapper 2.1**: Mapeo instantáneo tipado a `EstacionUltimoDato` en C#, con rendimiento idéntico a ADO.NET nativo y mínimo consumo de memoria.
2. **Consultas SQL en Archivos Independientes**: Ubicadas en `CentralDatos.Infrastructure/Persistence/Sql/Estaciones/ObtenerUltimosDatosCentralizados.sql` y compiladas como `EmbeddedResource`.
3. **Servicio `ISqlLoader`**: Carga y cachea en memoria (*ConcurrentDictionary*) los scripts SQL compilados, garantizando máxima velocidad, sin rutas físicas relativas y con coloreado y validación de sintaxis en herramientas SQL.
4. **Options Pattern (`IOptions<CentralItvOptions>`)**: Configuración fuertemente tipada desde `appsettings.json`, eliminando cadenas por defecto en constructores.
5. **Fallback Transparente**: La misma consulta SQL externalizada alimenta tanto la conexión directa Dapper como la pasarela SOAP de desarrollo en caso de contingencia.

---

## 4. Componentes Implementados

### 4.1. Backend (.NET 10 Clean Architecture)
- **Dominio**: [`EstacionUltimoDato.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Domain/Entities/Estaciones/EstacionUltimoDato.cs) y [`EmpresasConstants.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Domain/Constants/EmpresasConstants.cs)
- **Aplicación**: [`EstacionesService.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Application/Features/Estaciones/Services/EstacionesService.cs) y [`EstacionUltimoDatoDto.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Application/Features/Estaciones/DTOs/EstacionUltimoDatoDto.cs)
- **Infraestructura**: [`OracleEstacionesRepository.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Infrastructure/Persistence/Repositories/OracleEstacionesRepository.cs), [`SqlLoader.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Infrastructure/Persistence/Sql/SqlLoader.cs) y [`CentralItvOptions.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Infrastructure/Configuration/CentralItvOptions.cs).
- **API Endpoint**: `GET /api/v1/estaciones/ultimos-datos` en [`EstacionesEndpoints.cs`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/CentralDatos.Api/Endpoints/Estaciones/EstacionesEndpoints.cs).

### 4.2. Frontend (React 19 + TÜV SÜD Algorithm Design System)
- **Componente**: [`UltimosDatosCentralizados.tsx`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/features/estaciones/components/UltimosDatosCentralizados.tsx)
- **Logotipo Corporativo**: [`TuvSudLogo.tsx`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/components/common/TuvSudLogo.tsx) y [`logo-tuv.svg`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/public/images/logo-tuv.svg)
- **Constantes Centralizadas**:
  - [`api.constants.ts`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/constants/api.constants.ts)
  - [`companies.constants.ts`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/constants/companies.constants.ts)
  - [`navigation.constants.ts`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/constants/navigation.constants.ts)
  - [`ui.constants.ts`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/src/central-datos-web/src/constants/ui.constants.ts)
