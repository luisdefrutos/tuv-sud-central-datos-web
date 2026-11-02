# Módulo de Inspecciones sin Inspector — Especificación Técnica (`control-sin-inspector`)

> **Versión**: 1.0  
> **Fecha**: 02/11/2026  
> **Estado**: Implementado y Verificado  
> **Ruta URL**: `http://localhost:5173/#/modulo/control-sin-inspector`  
> **Formulario Legacy Original**: `frmCriterios.vb` (opción `Inspecciones_Sin_Inspector`)

---

## 1. Propósito y Alcance del Módulo

El informe de **Inspecciones sin Inspector** es una herramienta de auditoría técnica y control de calidad operativa dentro de la red ITV de TÜV SÜD en España. Su objetivo principal es detectar y listar todas aquellas inspecciones no anuladas registradas en el sistema central en las que **ningún inspector técnico responsable** quedó asignado (`CODINSPECTOR IS NULL AND CODINSPECTOR1 IS NULL AND CODINSPECTOR2 IS NULL AND CODINSPECTOR3 IS NULL`).

---

## 2. Arquitectura de Datos y Consulta SQL

### 2.1 Consulta SQL Indexada (`ObtenerInformeSinInspector.sql`)

* **Tabla Principal**: `CENTRALITV.INSPECCION i` (más de 1,5 millones de registros anuales).
* **Tabla de Estaciones**: `CENTRALITV.ESTACIONES e` (30 estaciones activas de Central Datos).
* **Índices Utilizados**:
  * `P17_INSPECCION (FECHAINSPECCION)`: Para escaneos por rango temporal.
  * `P31_INSPECCION (CODESTACION, FECHAINSPECCION)`: Para escaneos inmediatos al filtrar por una o varias estaciones específicas.
* **Optimización de Hint**: `/*+ INDEX(i P17_INSPECCION P31_INSPECCION) */` y `LEFT JOIN` a estaciones.
* **Rendimiento Verificado**:
  * Rango de 2 días: **< 100 ms**.
  * Rango de 1 año (362 días, red completa de 30 estaciones): **2,30 s** (73 incidencias detectadas).
  * Rango de 1 año (estación individual): **2,34 s**.

---

## 3. Endpoints de la API (.NET 10 Web API)

1. **Consulta Analítica**:
   * `POST /api/v1/informes/sin-inspector/consultar`
   * Recibe: `FiltrosSinInspectorRequestDto` (`fechaInicio`, `fechaFin`, `sociedad`, `codEstaciones`, `fase`).
   * Valida: Máximo 366 días (1 año) mediante `ReportDateRangeValidator`.
   * Retorna: `InformeSinInspectorResponseDto` con:
     * `Filas`: Listado paginable de inspecciones sin inspector.
     * `Kpis`: 4 tarjetas ejecutivas corporativas (`Total Sin Inspector`, `Fase 1`, `Fase 2`, `Estaciones Afectadas`).
     * `GraficoEstaciones`: Puntos adaptados para gráficos por estación.

2. **Exportación Oficial a Excel**:
   * `POST /api/v1/informes/sin-inspector/exportar-excel`
   * Aplica política de límite de concurrencia `excel-export-policy` (RateLimiter).
   * Genera libro multi-pestaña por estación (`SIN_INSPECTOR_{CodEstacion}`) utilizando `ClosedXML`, replicando fielmente el comportamiento de la aplicación de escritorio legacy.

---

## 4. Interfaz de Usuario (React 19 + Algorithm Design System)

* **Componente**: `SinInspectorReportPage.tsx`
* **Hook de Lógica**: `useSinInspectorReport.ts` (apoyado en los hooks unificados `useReportFilters` y `useReportTable`).
* **Elementos UI**:
  1. **Cabecera Estandarizada (`ReportPageHeader`)**: Miga de pan interactiva y botón de exportación a Excel.
  2. **Barra de Filtros (`ReportFiltersBar`)**: Filtros de fecha, selector de sociedad (TODAS / TSA / CAL), menú desplegable con buscador de estaciones y selector de Fase (Todas / 1ª Fase / 2ª Fase).
  3. **Tarjetas KPI Permanentes (`ReportKpiCard`)**: Siempre visibles con animación de carga o valores numéricos, garantizando que el cuadro de mando nunca quede vacío.
  4. **Selector Dual de Gráficos**: Botones corporativos para alternar entre:
     * `📊 Barras (Ranking)`: Ranking de centros ITV por volumen de anomalías con tooltip detallado.
     * `🍩 Cuota por Estación`: Gráfico circular (`ReportDonutChart`) con el porcentaje de cuota de cada estación.
  5. **Tabla Detallada (`ReportTableContainer`)**: Búsqueda en memoria, ordenación global previa a la paginación, hover corporativo `#edf5ff` y modal de ficha técnica de inspección.
  6. **Limpieza de Datos de Negocio en Modales**: Todos los modales bloqueantes y mensajes de carga utilizan terminología de usuario final, sin referencias a infraestructuras ni librerías internas.

