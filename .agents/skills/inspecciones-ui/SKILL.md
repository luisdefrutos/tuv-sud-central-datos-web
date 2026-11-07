---
name: inspecciones-ui
description: Mantiene un estilo y una disposición comunes entre las pantallas del módulo Inspecciones de Central Datos Web, aunque sus filtros y datos sean distintos.
---

# Unificación visual del módulo Inspecciones

Aplicar esta guía al crear o modificar pantallas de `src/central-datos-web/src/features/inspecciones/`. Usar **Localización de Inspecciones** como referencia visual para los elementos compartidos. No copiar los filtros ni los textos de negocio de una pantalla a otra cuando no correspondan.

## Elementos que deben mantener el mismo aspecto y posición

- **Acciones de consulta:** «Seleccionar campos» y «Exportar a Excel» alineados a la derecha, inmediatamente antes de la barra común de filtros.
- **Indicadores:** colocar las tarjetas KPI en una cuadrícula independiente y sin una tarjeta/contenedor exterior que duplique sus bordes. Conservar tooltips informativos, no convertir las tarjetas en acciones. Usar `ReportKpiCard` con su tamaño y espaciado comunes; solo variar títulos, valores e iconos necesarios para el informe.
- **Gráficos:** tarjeta separada de los KPI. Mantener el título y el contador de estaciones a la izquierda; a la derecha, mostrar el selector de visualización junto al control para mostrar/ocultar. Usar en todas las pantallas los textos «Ranking Barras», «Distribución Circular», «▼ Ver gráfico por estación» y «▲ Ocultar gráfico». Los colores, dimensiones, tipografía y espaciado deben ser iguales; únicamente cambia el título y el contenido del informe.
- **Grid:** reutilizar `LocalizacionGridSearch`, clases `cd-loc-grid-*`, `cd-data-table`, `SortIndicator` y `ReportPaginationBar`. Mantener título y resumen sobre el buscador a la izquierda, selector de tamaño de página arriba a la derecha, cabecera azul fija y columna «Ficha» congelada, hover, scroll, tipografía, rellenos y contadores idénticos.
- **Líneas de tabla:** no dibujar bordes verticales en las celdas del cuerpo. Ambas pantallas usan únicamente separadores horizontales entre filas con el token `--ts-semantic-color-border-base-default`; las cabeceras conservan el borde inferior corporativo.
- **Cabeceras:** mostrar el nombre técnico Excel (`columnaExcel`) en una sola línea con elipsis, y proporcionar el nombre descriptivo y la ordenación mediante `AppTooltip`. No variar el estilo porque cambie la fuente del catálogo.
- **Filas:** mantener valores a una línea con elipsis y tooltip para texto largo; conservar el tratamiento visual común de valores vacíos, identificadores y datos numéricos.
- **Contadores y paginación:** usar la misma redacción y jerarquía para filas mostradas, cargadas, encontradas, página actual y tamaño de página. Los números reflejan las cantidades reales del informe.
- **Pie de filtros aplicados:** después del grid y de la paginación inferior, mostrar «Filtros registrados en el libro Excel» cuando la respuesta incluya criterios aplicados. Reutilizar `InspectionAppliedFiltersFooter` en Localización y Defectos; Elementos y Mediciones lo heredan al compartir la página de Localización. Incluir los filtros y los nombres de estaciones legibles para dar trazabilidad a la consulta/exportación.
- **Ficha técnica:** todas las pantallas de Inspecciones deben usar `InspectionRecordDetailModal` y preservar el diseño histórico de Localización: encabezado azul degradado, tarjeta blanca de hasta 720 px, tarjetas de campos gris claro y pie gris con acción alineada a la derecha. Solo varían el título, icono y columnas del informe.
- **Localización de Elementos:** respetar los criterios del formulario de escritorio `frmCriteriosLocalizacionElementos`: fechas, estaciones, fase, NIF titular, construcción, utilización, categoría (incluida la opción «Distinto»), tipo de motor, marca, bloque y elemento. Mantener el botón «Consultar» como disparador de estos criterios; los cambios de fechas no consultan solos y los filtros rápidos comunes conservan su debounce de 250 ms. El grid, KPI, búsqueda, ficha y límites son los mismos componentes comunes. El Excel usa la misma consulta, filtros y columnas que el grid; las columnas disponibles corresponden a `Activo_Central` y las seleccionadas por defecto a `Activo_Gerencia` más `Por_Defecto`, como en la aplicación de escritorio. Para reproducir la consulta legacy, la fecha final se compara a medianoche (no se amplía al final del día).
- **Límites de volumen:** mantener un máximo de **5.000 filas cargadas en el grid** y un máximo de **300.000 filas exportadas a Excel**. El selector de página ofrece 25, 50, 100, 200 y 500; su tamaño no cambia el límite de filas cargadas. Para superar los topes, primero diseñar y medir paginación en servidor/virtualización; el Excel puede llegar a 300.000 porque se escribe en streaming y no se conserva el libro ni el conjunto de filas en memoria.
- **Volumen y Excel:** no añadir avisos permanentes que dupliquen el contador del grid. Mantener el resumen compacto y usar `InspectionExcelExportAction` para el botón, el icono contextual de límite excedido y el diálogo de confirmación según [inspecciones-volumen-datos](../inspecciones-volumen-datos/SKILL.md).

## Filtros y contenido específico

- Las pantallas pueden tener filtros, campos, KPI, gráficas, columnas y detalles diferentes.
- No eliminar ni inventar criterios de consulta para lograr una semejanza visual.
- Mantener los títulos propios del informe (por ejemplo, inspecciones localizadas o inspecciones con defectos), reutilizando el mismo estilo tipográfico y estructura del grid.
- No crear variantes CSS por página si una clase o componente común puede resolver el estilo. Si una nueva pieza visual afecta a varias pantallas, incorporarla al patrón compartido y actualizar esta guía.

## Verificación

- Comparar las pantallas a igual ancho de viewport y con los mismos estados (carga, datos, búsqueda, gráficos plegados/desplegados y móvil).
- Confirmar que no haya bordes exteriores redundantes en las KPI ni diferencias de fuentes, espaciado, nombres de cabecera o controles comunes.
- Ejecutar `npm run build` en `src/central-datos-web` después de cambios de interfaz.
- Cumplir también el skill `tuv-sud-algorithm-ds` y utilizar tokens semánticos del Design System cuando se añadan estilos.
