# Documento Técnico 11 — Persistencia de Sesión F5, Trazabilidad SQL y Tramos de Agilidad Operativa

> **Proyecto**: Modernización de Central Datos Web (TÜV SÜD)  
> **Fecha**: 02/11/2026  
> **Versión**: 2.12.0  
> **Estado**: Implementado y Verificado  

---

## 1. Persistencia de Sesión y Pantalla Activa en Recarga (F5)

### Diagnóstico de la Causa Raíz
Al pulsar F5 sobre una pantalla activa (por ejemplo, *Duración Promedio de Inspecciones*), concurrían dos problemas técnicos:
1. **Pérdida de Token JWT por Redirección 307 HTTPS en Entorno Local**:
   - `Program.cs` ejecutaba incondicionalmente `app.UseHttpsRedirection()`.
   - Cuando el frontend Vite (`http://localhost:5173`) realizaba peticiones a `http://localhost:5113/api/v1/auth/me`, el servidor Kestrel emitía un `307 Temporary Redirect` hacia `https://localhost:7179`.
   - Por especificación de seguridad del navegador, las cabeceras `Authorization: Bearer <token>` **se eliminan** al cambiar de esquema/puerto en un redirect cross-origin.
   - El endpoint respondía `401 Unauthorized`, lo que causaba que `AuthContext.tsx` borrara los tokens y forzara la navegación a la pantalla de Login.
2. **Estado de Vista Volátil (`activeItemId = null`)**:
   - `App.tsx` mantenía el elemento seleccionado en un `useState(null)`. Al refrescar la página, el estado se reseteaba al cuadro de mando inicial.

### Solución Implementada
- **Backend (`src/CentralDatos.Api/Program.cs`)**:
  ```csharp
  // Prevenir redirección 307 en desarrollo local para conservar cabeceras de autorización con Vite
  if (!app.Environment.IsDevelopment())
  {
      app.UseHttpsRedirection();
  }
  ```
- **Frontend (`src/central-datos-web/src/App.tsx`)**:
  - Sincronización con el fragmento de la URL (`window.location.hash` con formato `#/modulo/{itemId}`).
  - Respaldo en `sessionStorage` (`cd_active_item`, `cd_active_group`).
  - Escucha reactiva del evento `window.addEventListener('hashchange', ...)` para admitir recarga F5 y botones Atrás/Adelante del navegador.
- **Constantes de Navegación (`src/central-datos-web/src/constants/navigation.constants.ts`)**:
  - Incorporación de `'duracion-promedio'` al array `IMPLEMENTED_SCREENS`.

---

## 2. Gráfico Donut de Tramos de Agilidad Operativa

### Justificación
La pestaña original *"Cuota Sociedades (Donut)"* presentaba una cuota estática (~82.5% TSA vs ~17.5% CAL) dependiente exclusivamente de cuántas estaciones de cada sociedad estuvieran marcadas en el filtro, sin aportar valor operativo al responsable de ITV.

Se sustituyó por el indicador de **Tramos de Agilidad Operativa**, que categoriza las estaciones inspeccionadas según su duración promedio real en minutos:

| Tramo | Rango de Duración | Significado Operativo | Color Token |
| :--- | :---: | :--- | :---: |
| **Ágiles** | $< 25\text{ min}$ | Operativa de alta rotación y flujo óptimo en línea | Verde `#059669` |
| **Estándar** | $25 - 35\text{ min}$ | Tiempo nominal estándar de inspección periódica 001 | Azul `#0046ad` |
| **Tiempo Elevado** | $35 - 45\text{ min}$ | Posibles cuellos de botella en línea o esperas de cobro | Ámbar `#d97706` |
| **Demora / Crítico** | $> 45\text{ min}$ | Incidencias operativas o retrasos severos que requieren auditoría | Rojo `#dc2626` |

---

## 3. Ordenación Ascendente del Gráfico por Tipo de Vehículo

- En `ReportBarChart.tsx`, se habilitó la propiedad `sortOrder="asc"`.
- En `DuracionPromedioReportPage.tsx`, la vista *"Por Tipo de Vehículo"* muestra en primera posición las categorías más rápidas (motocicletas, ciclomotores, turismos) y al final las de mayor complejidad (camiones, autobuses), facilitando la comparativa natural de tiempos de proceso.

---

## 4. Trazabilidad y Logging de Consultas SQL Parametrizadas

### Configuración
En `appsettings.json`:
```json
"CentralItv": {
  "LogExecutedSql": true
}
```

### Comportamiento del Repositorio Oracle
Cuando `LogExecutedSql` está activo, `OracleInformesRepository.cs` y `OracleEstacionesRepository.cs` formatean los parámetros `:FechaInicio`, `:FechaFin` y `:codigosEstacion` directamente en la sentencia SQL con la sintaxis nativa de Oracle:
```sql
TO_DATE('2026-10-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS')
```
La sentencia resuelta se registra mediante `_logger.LogInformation(...)` y se almacena en `logs/central-datos-YYYYMMDD.log`, permitiendo a los administradores copiar la consulta y ejecutarla directamente en SQL Developer / PL/SQL Developer para verificar planes de ejecución y tiempos de respuesta.



---

## 5. Componente Unificado de Tooltip / Title Especial (`AppTooltip`)

### Objetivo
Sustituir el atributo nativo `title="..."` de HTML (que es plano, sin formato y lento en responder) por un componente flotante corporativo unificado (`AppTooltip`) bajo el estándar **TÜV SÜD Algorithm Design System**.

### Características Implementadas
1. **Diseño Visual Corporativo**:
   - Fondo Azul Marino TÜV SÜD (`#0b253b`) con bordes suaves y sombra elevada (`box-shadow: 0 12px 28px rgba(0, 30, 61, 0.4)`).
   - Borde superior con acento semántico del tramo analizado (verde, azul, ámbar o rojo).
   - Tipografía corporativa oficial `TUV SUD Pro`.
2. **Capacidad de Desglose Estructurado de Información**:
   - Cabecera con título en negrita y Badge con el número de estaciones y porcentaje de cuota.
   - Subtítulo descriptivo.
   - Lista scrollable de estaciones ITV con código monospace (`[2811]`), nombre oficial de la estación y duración promedio individualizada en minutos.
   - Badge distintivo de sociedad (`TSA` vs `CAL`).
3. **Portal Flotante Dinámico (`createPortal`)**:
   - Renderizado en `document.body` mediante portal con posicionamiento `fixed`, evitando recortes por `overflow: hidden` en tablas o contenedores SVG.
   - Reposicionamiento inteligente para no salirse de los límites de la pantalla del navegador.
4. **Adopción Transversal**:
   - **Donut de Tramos de Agilidad (`ReportDonutChart`)**: al posar el cursor sobre cualquier tramo de la leyenda o el centro del gráfico, se despliega la lista completa de estaciones asignadas a dicho tramo.
   - **Gráfico de Barras (`ReportBarChart`)**: barras de ranking de agilidad y tipos de vehículo con métricas y sociedad en tooltip flotante.
   - Reutilizable universalmente en cualquier elemento o tabla de la aplicación importando `<AppTooltip />`.


### Actualización de Usabilidad y Estética del Tooltip y Barra de Filtros
1. **Rediseño del Tooltip a Fondo Blanco Corporativo**:
   - Sustitución del fondo oscuro por blanco puro (`#ffffff`) con elevación tridimensional (`box-shadow: 0 10px 25px -4px rgba(0, 70, 173, 0.16), 0 8px 16px -4px rgba(15, 23, 42, 0.12)`) y remate superior de 3px con el color semántico del tramo.
   - Textos de alto contraste (`#0b253b` azul noche para títulos y `#1e293b` para estaciones).
   - Filas de estaciones con fondo `#f8fafc`, código en pastilla gris y duración en negrita.
2. **Posicionamiento Inmediato en el Cursor**:
   - Seguimiento dinámico de las coordenadas reales del ratón (`e.clientX`, `e.clientY`) en lugar de depender del ancho del contenedor activador.
3. **Scroll Interactivo sobre el Tooltip**:
   - Habilitación de `pointerEvents: 'auto'` con margen de gracia de 220ms al salir del activador. El usuario puede mover el cursor directamente sobre el tooltip para consultar y deslizar la lista de estaciones cómodamente.
4. **Optimización de la Barra de Filtros (`ReportFiltersBar`)**:
   - Compactación de paddings e inputs de fecha a 120px para asegurar que el botón **`🔍 Consultar`** quepa en la misma línea horizontal sin saltar a una fila solitaria.


---

## 6. Auditoría y Optimización de Responsividad Multidispositivo

Para asegurar que la aplicación responda de manera óptima en cualquier dispositivo (PCs de escritorio, portátiles con escalado de 125%/150%, tablets y smartphones), se auditaron y reforzaron los siguientes componentes:

| Componente | Comportamiento Desktop (> 768px) | Comportamiento Tablet / Mobile (<= 768px) | Regla / Clase |
| :--- | :--- | :--- | :--- |
| **Botonera de Modos de Gráfico** | Barra inline con 4 botones a la derecha | Cuadrícula de 2x2 simétrica táctil (1 col en < 480px) | `.cd-chart-views-bar`, `.cd-chart-mode-group` |
| **Grid de Tarjetas KPI** | 4 tarjetas en fila horizontal | Ajuste dinámico de 1 a 2 columnas sin desbordar | `minmax(min(100%, 220px), 1fr)` |
| **Barras de Ranking** | 3 columnas amplias (etiqueta, barra, valor) | Columnas compactadas (`75px 1fr 50px`) | `.cd-barchart-row` |
| **Barra de Filtros** | Fila horizontal única compacta (880px) | Apilado vertical con botón Consultar al 100% | `.cd-stack-mobile`, `.cd-fullwidth-mobile` |
| **Tablas Analíticas** | Grid tabular con cabeceras ordenables | Contenedor con scroll táctil suave y aviso visual | `.cd-touch-scroll`, `.cd-scroll-hint` |
| **Tooltip Flotante (`AppTooltip`)** | Ancho nominal de hasta 380px anclado al cursor | Ajuste a `min(calc(100vw - 28px), 380px)` sin desborde | `createPortal` + `maxWidth` dinámico |


---

## 7. Configuración de Depuración Automática desde Visual Studio (F5)

### Causa del Problema al Iniciar Depuración
Al pulsar el botón verde de depuración en Visual Studio:
1. En `launchSettings.json`, la propiedad `"launchUrl": "http://localhost:5173"` contenía una URL absoluta con puerto cruzado. El motor de lanzamiento de Visual Studio solo admite rutas relativas al `applicationUrl` (como `""` o `"swagger"`). Al detectar un esquema HTTP absoluto en un perfil HTTPS o de puerto distinto, cancelaba silenciosamente la apertura del navegador, levantando únicamente la consola de texto de la API.
2. Si se navegaba manualmente a `http://localhost:5113`, la raíz `/` redirigía a `/swagger` en lugar de a la aplicación web React.

### Solución Definitiva
1. **`launchSettings.json`**: Se fijó `"launchUrl": ""` y el perfil `"http"` en el puerto `5113` como primera opción de ejecución.
2. **`Program.cs`**:
   ```csharp
   if (app.Environment.IsDevelopment())
   {
       app.MapGet("/", () => Results.Redirect("http://localhost:5173"));
   }
   else
   {
       app.MapGet("/", () => Results.Redirect("/swagger"));
   }
   ```
3. **Flujo de Ejecución**: Al pulsar **F5** en Visual Studio:
   - Visual Studio levanta Kestrel en `http://localhost:5113`.
   - SpaProxy lanza `npm run dev` en segundo plano en `http://localhost:5173`.
   - Visual Studio abre el navegador en `http://localhost:5113/`.
   - Kestrel redirige al instante a `http://localhost:5173`, abriendo la interfaz web de Central Datos sin intervención manual.


---

## 8. Mejoras de Usabilidad, Impresión Aislada y Navegación Reactiva F5

### 1. Persistencia de Ruta F5
- En `App.tsx`, el estado de navegación (`activeItemId` y `activeGroupId`) se inicializa perezosamente mediante `getInitialNavigation()`, extrayendo la clave activa de `window.location.hash` (`#/modulo/{itemId}`) o `sessionStorage`.
- Al pulsar F5 en `DuracionPromedioReportPage`, la vista no salta al catálogo de informes ni a la pantalla de inicio; se monta inmediatamente el módulo solicitado.

### 2. Impresión en Ventana Emergente Separada
- Se eliminó el uso de iframes ocultos para la llamada a `window.print()`.
- Se abre una ventana emergente independiente (`window.open('', '_blank', ...)`) con el contenido A4 del informe y sus estilos CSS milimétricos.
- La aplicación web principal permanece completamente accesible y sin pérdida de contexto ni desenfoque del modal.

### 3. Visualización Completa en Gráficos de Barras
- En `ReportBarChart.tsx`, se suprimió la limitación por defecto de 10 elementos.
- Toda la colección de estaciones o tipos se renderiza íntegramente dentro del área con barra de desplazamiento vertical (`maxHeight: 360px`).

### 4. Depuración Terminológica y Cromática
- Se eliminó el término coloquial *"Donut"* de todas las vistas, botones y selectores de la aplicación.
- Se implementó una matriz cromática diferenciada por tipo de vehículo en `useDuracionPromedioReport.ts` y `ReportDonutChart.tsx` para una lectura visual instantánea.


---

## 5. Blindaje de Sockets Oracle y Control de Excepciones en F5 / Depuración

### Diagnóstico de la Excepción en Visual Studio
Al pulsar F5 en el navegador mientras la API estaba ejecutando una consulta en Oracle (por ejemplo, al cargar el listado de estaciones o un informe pesado):
1. El navegador cancela inmediatamente la conexión HTTP entrante (`ERR_ABORTED`).
2. Kestrel transmite esta cancelación al `CancellationToken` asociado a la petición (`HttpContext.RequestAborted`).
3. Dapper / ODP.NET Thin interrumpe la lectura/escritura en el socket TCP (:1521), lo que genera una excepción de transporte:
   `System.IO.IOException: 'Unable to write data to the transport connection: Se ha forzado la interrupción de una conexión existente por el host remoto..'`
4. Al no haber un bloque `try-catch` específico para cancelaciones de red en el repositorio, la excepción subía sin control y el depurador de Visual Studio pausaba la ejecución con la ventana de *"Excepción no controlada por el usuario"*.

### Solución Implementada
En `OracleEstacionesRepository.cs` y `OracleInformesRepository.cs`:
- Se envolvió la ejecución en bloques `try-catch` con filtros de cancelación:
  ```csharp
  catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
  {
      _logger.LogInformation("Consulta cancelada por el cliente (F5 o navegación interrumpida).");
      return Array.Empty<T>();
  }
  catch (IOException ex) when (cancellationToken.IsCancellationRequested)
  {
      _logger.LogInformation("Conexión interrumpida por el cliente al recargar la página (F5): {Message}", ex.Message);
      return Array.Empty<T>();
  }
  catch (Exception ex) when (ex is IOException || ex.Message.Contains("interrupción"))
  {
      _logger.LogWarning(ex, "Socket Oracle interrumpido o inactivo en pool. Purgando pool y reintentando...");
      OracleConnection.ClearPool(connRetry);
      // Reintento limpio de la consulta
  }
  ```
- Con esto, tanto en Visual Studio durante la depuración como en producción bajo IIS o Kestrel, las recargas F5 o cierres de pestaña se gestionan de forma totalmente silenciosa y limpia, garantizando además la auto-reconexión si algún socket en el pool de conexiones se corta por inactividad.


---

## 6. Optimización de Consultas Anuales y Unificación Visual de Tooltips

### 6.1 Auditoría de Rendimiento en Consultas de 1 Año (~1.214.818 Inspecciones)
Durante pruebas de estrés con un rango anual completo (2025-11-01 a 2026-11-01), se identificaron dos cuellos de botella críticos:

1. **Cuello de Botella en Duración Promedio (34.13 s)**:
   - **Causa**: Invocación de la función PL/SQL `CENTRALITV.CLASIFICACION_MINER` en el `GROUP BY` de la tabla `INSPECCION`. Cada inspección ejecutaba la función PL/SQL, la cual a su vez lanzaba hasta dos consultas SQL sobre la tabla `TIPOVEHICULO_IDENT` (49 filas). Esto causaba **1.214.818 transiciones de contexto SQL/PL/SQL**.
   - **Optimización**: Se dividió la consulta en dos CTEs:
     - `preagg`: agrupa puramente por columnas relacionales nativas `(CODESTACION, CodConstruccion, CodUtilizacion)` produciendo únicamente ~300 registros agregados.
     - `agg`: evalúa `CLASIFICACION_MINER` exclusivamente sobre esos 300 registros.
   - **Impacto**: El tiempo de ejecución se redujo de **34.13 s a 3.98 s (-88.3%)**.

2. **Cuello de Botella en Facturación por Inspección (19.04 s)**:
   - **Causa**: El `LEFT JOIN` a `FORMAPAGO` se evaluaba fila a fila en el volumen total de 1.2M registros, generando un plan con `VIEW PUSHED PREDICATE` repetido en bucle `NESTED LOOPS` para cada estación.
   - **Optimización**: Preagregación por `(CODESTACION, CODFORMAPAGO)` antes de cruzar con `FORMAPAGO` (reduciendo el cruce de 1.2M a ~150 filas).
   - **Impacto**: El tiempo cayó de **19.04 s a 4.80 s (-74.8%)**.

### 6.2 Unificación de Tooltips en Gráficos Donut
Se eliminaron todos los tags nativos `<title>` de los arcos SVG en `ReportDonutChart.tsx`. Se amplió el componente corporativo `AppTooltip` para soportar modo flotante controlado mediante coordenadas de cursor (`isOpen` + `targetCoords`), de modo que al posar el ratón sobre cualquier sector circular se despliega la misma tarjeta con fondo blanco, acento cromático, badge y desglose interactivo de estaciones con scrollbar.

### 6.3 Ajuste de Textos
Se renombró `📊 Distribución Mix Red` a `📊 Cuota por Estación` en el informe de Número de Inspecciones para ofrecer una descripción intuitiva y profesional.
