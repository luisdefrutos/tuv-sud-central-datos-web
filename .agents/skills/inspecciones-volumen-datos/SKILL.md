---
name: inspecciones-volumen-datos
description: Unifica cómo las pantallas de Inspecciones informan sobre resultados limitados en el grid y la disponibilidad de exportación Excel.
---

# Presentación de volumen y límites de Inspecciones

Aplicar esta guía a todas las pantallas de `src/central-datos-web/src/features/inspecciones/`. Mantener el comportamiento común mediante `InspectionExcelExportAction`; no crear avisos ni reglas de exportación particulares por informe. El localizador comparte el comportamiento entre inspecciones, defectos, elementos y mediciones; la pantalla de defectos lo reutiliza igualmente.

## Límites funcionales

- **Grid:** cargar como máximo **5.000 registros** por consulta. El selector de página (`25`, `50`, `100`, `200`, `500`) solo cambia cuántas filas cargadas se muestran por página; no aumenta el máximo cargado.
- **Búsqueda del grid:** opera sobre el conjunto cargado, no sobre todos los resultados de Oracle. Informarlo cuando el conjunto cargado sea menor que el total encontrado.
- **Excel:** exportar el conjunto completo de resultados de la consulta, no solo las filas cargadas en el grid, hasta un máximo de **300.000 registros**. Generar el XLSX con escritura OpenXML en streaming y un archivo temporal; no materializar todas las filas ni el libro en memoria. Aplicar el límite tanto en frontend como en backend y no generar libros parciales silenciosamente.
- **Confirmación:** cuando el usuario pulse exportar con un total superior a **50.000** y no superior a **300.000**, pedir confirmación en un diálogo modal. Hasta 50.000, exportar sin confirmación. Más de 300.000, no permitir exportar. Los 50.000 son un umbral de confirmación, no un límite del grid ni del archivo.

## Presentación obligatoria

- No mostrar un banner permanente de volumen: repite los datos del grid y ocupa espacio. El contador compartido debe distinguir filas de la página, cargadas y encontradas. El tooltip del buscador debe aclarar que la búsqueda solo revisa las filas cargadas.
- Mantener cualquier explicación de volumen en el contador compacto del grid; no añadir una segunda tarjeta o alerta para explicar el mismo tope.
- Usar `InspectionExcelExportAction` para el botón Excel y sus mensajes. El tooltip del botón explica que el archivo contiene todos los resultados, si hace falta confirmación y el máximo permitido.
- Mostrar un icono informativo junto al botón **solo cuando se supera el máximo de 300.000** y el botón está deshabilitado. Su tooltip debe indicar el total, el máximo y que se deben ajustar filtros.
- Si se requiere confirmar, mostrar un diálogo modal únicamente después del clic en «Exportar a Excel». Indicar el número exacto de filas y que el proceso puede tardar; ofrecer **Cancelar** y **Continuar exportación**. La X, Escape o cierre del fondo equivalen a cancelar; no se inicia ninguna petición. No usar una alerta persistente para confirmar.
- Deshabilitar «Exportar a Excel» durante carga/exportación, sin datos o cuando el total supere 300.000.
- Los errores de exportación deben mostrarse como alertas de error con el mismo estilo en todas las pantallas. No confundir un error real con la explicación de un límite.
- No concatenar frases con saltos de línea JSX que creen espacios o cortes poco claros; preferir bloques con rótulos y valores separados. En pantallas estrechas los bloques deben fluir a la siguiente línea sin perder la relación entre etiqueta y valor.

## Implementación y verificación

- Reutilizar `InspectionExcelExportAction` y los límites compartidos que expone `useLocalizacionReport`; mantener sincronizado el máximo de grid con el servicio .NET.
- No inferir el total del número de filas recibidas: usar `totalRegistros` para encontrados y `mostrandoRegistrosGrid` para cargados.
- Verificar visual y funcionalmente estos casos: 5.000 registros, 5.001, 50.000, 50.001, 300.000 y 300.001. Confirmar el contador compacto, estado del icono y botón Excel, y apertura/cancelación/confirmación del diálogo en ambas pantallas.
- Ejecutar `npm run build` en `src/central-datos-web` y revisar `git diff --check`.
- Seguir también `inspecciones-ui` para la presentación visual común y `tuv-sud-algorithm-ds` para componentes y tokens de diseño.
