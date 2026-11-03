# Módulo de Inspecciones con Cupón Descuento — Especificación Técnica (`cupon-descuento`)

> **Versión**: 1.0  
> **Fecha**: 03/11/2026  
> **Estado**: Implementado y Verificado  
> **Ruta URL**: `http://localhost:5173/#/modulo/cupon-descuento`  
> **Formulario Legacy Original**: `frmCriterios.vb` (opción `Inspecciones_Con_Cupon_Descuento`)

---

## 1. Propósito y Alcance del Módulo

El informe de **Inspecciones con Cupón Descuento** es una herramienta analítica, de control de promociones y liquidación financiera en la red ITV de TÜV SÜD en España. Su objetivo principal es auditar todas aquellas inspecciones no anuladas en las que se aplicó un código de cupón de descuento (`i.CODCUPON IS NOT NULL`), desglosando la promoción asociada, el importe bonificado, el importe finalmente abonado en caja y las estaciones donde tuvieron lugar.

---

## 2. Arquitectura de Datos y Consulta SQL

### 2.1 Consulta SQL Indexada (`ObtenerInformeCuponDescuento.sql`)

* **Tabla Principal**: `CENTRALITV.INSPECCION i` (más de 1,5 millones de registros anuales).
* **Tabla de Cupones**: `CENTRALITV.CUPONES c` (catálogo maestro de promociones).
* **Tabla de Estaciones**: `CENTRALITV.ESTACIONES e` (30 estaciones activas de Central Datos).
* **Optimización de Joins**:
  * `LEFT JOIN CENTRALITV.CUPONES c ON i.CODCUPON = c.CODCUPON` (sin envoltorios `TRIM` en las columnas indexadas del JOIN para habilitar el uso pleno de índices).
  * `LEFT JOIN CENTRALITV.ESTACIONES e ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')`.
* **Índices Utilizados**:
  * `P17_INSPECCION (FECHAINSPECCION)`: Para escaneos por rango temporal.
  * `P31_INSPECCION (CODESTACION, FECHAINSPECCION)`: Para escaneos inmediatos al filtrar por una o varias estaciones específicas.
* **Optimización de Hint**: `/*+ INDEX(i P17_INSPECCION P31_INSPECCION) */`.
* **Rendimiento Verificado**:
  * Consulta por estación individual: **165 ms** (0,16 s).
  * Rango de 1 mes completo en toda la red (30 estaciones, 10.968 inspecciones con cupón): **3,89 s**.
  * Generación de libro Excel multi-pestaña: **906 ms** (7,3 KB).

---

## 3. Endpoints de la API (.NET 10 Web API)

1. **Consulta Analítica**:
   * `POST /api/v1/informes/cupon-descuento/consultar`
   * Recibe: `FiltrosCuponDescuentoRequestDto` (`fechaInicio`, `fechaFin`, `sociedad`, `codEstaciones`, `fase`).
   * Valida: Rango máximo de 366 días (1 año) mediante `ReportDateRangeValidator`.
   * Retorna: `InformeCuponDescuentoResponseDto` con:
     * `Filas`: Listado completo de inspecciones con cupón.
     * `Kpis`: 4 tarjetas ejecutivas corporativas (`Inspecciones con Cupón`, `Total Descuento Aplicado`, `Importe Abonado en Caja`, `Campaña Más Utilizada`).
     * `GraficoEstaciones`: Ranking de estaciones ordenado por volumen de cupones.
     * `GraficoPromociones`: Distribución y cuota por campaña promocional.

2. **Exportación Oficial a Excel**:
   * `POST /api/v1/informes/cupon-descuento/exportar-excel`
   * Aplica la política de límite de concurrencia `excel-export-policy` (RateLimiter).
   * Genera libro multi-pestaña por estación (`CUPONES_DTO_ITV_{CodEstacion}`) utilizando `ClosedXML`, replicando con exactitud la estructura de columnas y formatos de la aplicación de escritorio legacy.

---

## 4. Interfaz de Usuario (React 19 + Algorithm Design System)

* **Componente**: `CuponDescuentoReportPage.tsx`
* **Hook de Lógica**: `useCuponDescuentoReport.ts` (apoyado en los hooks unificados `useReportFilters` y `useReportTable`).
* **Elementos UI**:
  1. **Cabecera Estandarizada (`ReportPageHeader`)**: Miga de pan interactiva y botón de exportación oficial a Excel.
  2. **Barra de Filtros (`ReportFiltersBar`)**: Filtros de fecha, selector de sociedad (TODAS / TSA / CAL), menú desplegable con buscador de estaciones y selector de Fase (Todas / 1ª Fase / 2ª Fase).
  3. **Tarjetas KPI Permanentes (`ReportKpiCard`)**: Siempre visibles con animación de carga o valores formateados (`N0` y moneda `€`), sin pantallas vacías.
  4. **Selector Dual de Gráficos**: Botones corporativos para alternar entre:
     * `📊 Ranking por Estación`: Centros ITV ordenados por número de cupones aplicados.
     * `🍩 Promociones Aplicadas`: Gráfico circular (`ReportDonutChart`) con la cuota de cada campaña de descuento.
  5. **Tabla Detallada (`ReportTableContainer`)**: Búsqueda instantánea en memoria (matrícula, cupón, promoción, vehículo), ordenación global por cabecera, etiquetas `TsBadge` para sociedad y modal de ficha técnica de inspección.
  6. **Limpieza de Datos de Negocio en Modales**: Todos los modales bloqueantes y mensajes de carga utilizan terminología de usuario final sin exponer detalles internos de base de datos ni librerías de exportación.

