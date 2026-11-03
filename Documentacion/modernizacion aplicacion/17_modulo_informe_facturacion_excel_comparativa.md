# Módulo de Informe: Excel Facturación de Inspecciones Comparativa (TSA / CAL)

## 1. Identificación y Alcance
- **Módulo**: `facturacion-excel` (Informe C3).
- **Origen Legacy**: `frmCriteriosExcel.vb` / `clsExcelFacturacion.vb` y plantilla `Plantilla Informe de facturación.xlsx`.
- **Ruta Web**: `/#/modulo/facturacion-excel` (Menú *Informes > Informe facturación de inspecciones > Excel facturación de inspecciones*).
- **Finalidad**: Análisis comparativo de ingresos netos (b.i sin IVA ni Tasas - Descuentos) e inspecciones realizadas (sólo en Fase 1) entre dos periodos temporales (Rango 1 / Año de Referencia vs Rango 2 / Periodo Actual), agrupados por sociedad (`TSA` / `CAL`), por comunidad autónoma y por estación ITV, con exportación oficial al libro de plantilla Excel (`.xlsx`) recalculando fórmulas y subtotales dinámicamente con ClosedXML.

---

## 2. Diagnóstico y Corrección del "Bug de Arrastre" del Legacy

### Causa Raíz en el Código Legacy (`clsExcelFacturacion.vb` Líneas 18 y 61-72)
```vb
' BUG EN LEGACY: La variable se declaraba fuera del bucle de estaciones:
Dim ingresosInspecciones(0, 3) As Object

For i As Integer = fila To ultimaFila
    Dim valorCelda As String = CType(Me.Worksheet.Cells(i, 3).Value, String)
    If diccionarioDatos.ContainsKey(valorCelda) Then
        ' Rellenaba ingresosInspecciones...
    End If
    ' Si la fila (p.ej. UMA ALBACETE, UMA ALCÁZAR, UMA VALVERDE, UMA NÁJERA o UMA MIRANDA)
    ' no existía en el diccionario, la variable NUNCA se reseteaba a 0,
    ' por lo que Me.Worksheet.Range(...).Value arrastraba y duplicaba los datos de la fila anterior.
    Me.Worksheet.Range(Worksheet.Cells(i, 4), Worksheet.Cells(i, 7)).Value = ingresosInspecciones
Next
```

### Impacto en Datos Legacy vs Proyecto Nuevo
- **En Legacy**: Las filas de unidades móviles (UMAs) que no disponían de registro independiente duplicaban los importes e inspecciones de la estación fija precedente, inflando artificialmente el total global en más de **589.445,24 €** y **14.254 inspecciones** ficticias en el periodo analizado (ej. Enero 2024: 3.833.274,18 € y 101.269 insp.).
- **En Modernización Central Datos Web**:
  - Aislamiento completo de fila: si un centro o UMA no registra actividad en un rango o periodo, sus valores se inicializan y persisten explícitamente a `0,00 €` y `0` inspecciones.
  - El Total Global real de la base de datos Oracle coincide al céntimo y unidad:
    - Periodo 1 (Enero 2024): **3.243.828,94 €** (87.015 inspecciones).
    - Periodo 2 (Enero 2025): **3.369.578,92 €** (87.206 inspecciones).
    - Variación Neta: **+125.749,98 € (+3,88 %)**.

---

## 3. Arquitectura de la Solución

### Backend (.NET 10 Web API)
- **SQL Optimizado**: `src/CentralDatos.Infrastructure/Persistence/Sql/Informes/ObtenerFacturacionComparativaExcel.sql`
  - Ejecuta un `UNION ALL` con discriminador `RangoId` (1 y 2).
  - Normaliza la nomenclatura de centros (`BORGES BLANQUES` -> `LES BORGES`, `MIRANDA DE EBRO` -> `MIRANDA`, etc.) para mapeo directo con las celdas de la plantilla.
  - Parámetros enlazados por nombre (`:FechaInicioRango1`, `:FechaFinRango1`, `:FechaInicioRango2`, `:FechaFinRango2`).
- **Dominio**: `FacturacionComparativaDato.cs` en `CentralDatos.Domain.Entities.Informes`.
- **Aplicación**:
  - DTOs en `FacturacionComparativaDtos.cs`.
  - Servicio `InformesFacturacionComparativaService.cs` implementando `IInformesFacturacionComparativaService`.
  - Soporte de ClosedXML sin COM Interop para rellenar la plantilla oficial `Plantilla_Informe_Facturacion.xlsx` preservando estilos, fórmulas y subtotales corporativos.
- **Endpoints**:
  - `POST /api/v1/informes/facturacion-comparativa/consultar`
  - `POST /api/v1/informes/facturacion-comparativa/exportar-excel`

### Frontend (React 19 + TypeScript + TÜV SÜD Algorithm DS)
- **API Client**: `facturacionComparativaApi.ts`.
- **Custom Hook**: `useFacturacionComparativaReport.ts` (manejo de rangos duales, ordenación, filtrado y paginación reactiva).
- **Página**: `FacturacionComparativaReportPage.tsx`:
  - `ReportPageHeader` con título corporativo y botón primario de exportación.
  - Selector dual de fechas (Rango 1 y Rango 2) con selector de Sociedad (`TODAS`, `TSA`, `CAL`).
  - Tarjetas KPIs ejecutivas con variaciones porcentuales.
  - Resumen por sociedad con chips de color semántico según variación (+ verde, - rojo).
  - `ReportBarChart` con switcher dinámico de métrica: *Ingresos (€)*, *Inspecciones* y *Crecimiento %* (ordenado de mayor crecimiento positivo a negativo al final).
  - Tabla de detalle con `ReportTableContainer`, ordenación por cabeceras, paginación estándar con `ReportPaginationBar` y **fila de sumatorio consolidado (`<tfoot>`)** que replica los totales del Excel de forma dinámica para las filas visibles.

---

## 4. Cuadratura al Céntimo y Unidad: Web vs Plantilla Excel (Periodo 01/10 - 03/11)

La auditoría cruzada entre el libro Excel generado y las métricas calculadas en el Backend/Frontend de Central Datos Web arroja una **coincidencia del 100,0%**:

| Métrica / Agrupación | Periodo 1 (2025) | Periodo 2 (2026) | Variación Absoluta | Variación % |
| :--- | :---: | :---: | :---: | :---: |
| **Subtotal TSA (Facturación)** | **2.773.180,06 €** | **2.636.124,86 €** | -137.055,20 € | **-4,94 %** |
| **Subtotal TSA (Inspecciones)** | **75.355** | **71.040** | -4.315 | **-5,73 %** |
| **Subtotal CAL (Facturación)** | **618.224,98 €** | **686.987,13 €** | +68.762,15 € | **+11,12 %** |
| **Subtotal CAL (Inspecciones)** | **13.843** | **14.836** | +993 | **+7,17 %** |
| **TOTAL GLOBAL RED (Facturación)** | **3.391.405,04 €** | **3.323.111,99 €** | -68.293,05 € | **-2,01 %** |
| **TOTAL GLOBAL RED (Inspecciones)** | **89.198** | **85.876** | -3.322 | **-3,72 %** |

- **KPI Ingreso Medio / Insp**:
  - Periodo 1: `3.391.405,04 € / 89.198` = **38,02 €/insp**.
  - Periodo 2: `3.323.111,99 € / 85.876` = **38,70 €/insp** (`+0,68 €` de incremento medio por vehículo).

---

## 5. Sumatorios en Grid (`<tfoot>` Triple) y Autonomía Visual

Para maximizar la productividad operativa del usuario y replicar con fidelidad la estructura del libro Excel sin necesidad de abrirlo:
1. **Triple Fila en el Pie de Tabla (`<tfoot>`)**:
   - **Fila 1 — Subtotal TSA**: Suma las 26 estaciones de TÜV SÜD ATISAE con badge azul corporativo (`#0046ad`).
   - **Fila 2 — Subtotal CAL**: Suma las 4 estaciones de Burgos / ITV Castilla y León (`0902 Miranda`, `0903 Villasante`, `0906 Belorado`, `0908 Briviesca`) con badge verde (`#00875a`).
   - **Fila 3 — Total Red Global**: Suma consolidada de las 30 estaciones con fondo azul suave (`#edf5ff`) y tipografía reforzada en negrita.
2. **Cálculo Reactivo Dinámico**: Suma en tiempo real las columnas de las estaciones filtradas en pantalla:
   - Ingresos y volúmenes de Periodo 1 y Periodo 2.
   - Diferencias netas en euros (`+/- €`) e inspecciones (`+/- uds`).
   - Chips de variación porcentual en verde semántico (`#047857`) o rojo (`#be123c`).
3. **Mapeo Corregido de Estaciones CAL en SQL**:
   - Se ajustó el clasificador en `ObtenerFacturacionComparativaExcel.sql` con `IN ('0902', '0903', '0906', '0908') OR LIKE '09%'` para que Miranda, Belorado y Briviesca computen en la sociedad CAL y no queden absorbidas por TSA.


