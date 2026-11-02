# Módulo de Inspecciones con Defecto OBD (Bloque 15)

> **Documento Oficial de Modernización Técnica**  
> **Ubicación:** `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\Documentacion\modernizacion aplicacion\12_modulo_informe_inspecciones_defecto_obd.md`  
> **Reemplaza a:** `frmCriterios.vb` (`Inspecciones_Defectos_OBD`) y exportaciones COM Excel del cliente WinForms legado.

---

## 1. Resumen Ejecutivo y Alcance

El módulo **Informe de Inspecciones con Defecto OBD** digitaliza y moderniza la consulta y control técnico de las lecturas OBD (*On-Board Diagnostics*) realizadas en la red de estaciones ITV de **TÜV SÜD España (ATISAE y CAL)**:

- **Normativa técnica aplicada:** Inspección reglamentaria de emisiones contaminantes según el Manual de Procedimiento de Inspección de las Estaciones ITV (**Bloque 15**):
  - **Defecto 02:** Vehículos con motor de encendido provocado (**Gasolina**).
  - **Defecto 03:** Vehículos con motor de encendido por compresión (**Diésel**).
  - **Subdefecto 06:** Sistema de diagnóstico a bordo (OBD).
  - **Números de defecto:**
    - `02`: Indicador MIL no se enciende al poner el contacto (Defecto Grave).
    - `03`: Indicador MIL permanece encendido tras el arranque (Defecto Grave).
    - `04`: Conector OBD inaccesible, deteriorado o sin señal (Defecto Grave).
    - `05`: Conexión no permitida por manipulación o fallo de enlace (Defecto Grave).
    - `31`: Códigos de anomalía OBD confirmados en la centralita del vehículo (Defecto Grave).
    - `51`: Desconexión o anomalía en el protocolo de comunicación OBD (Defecto Leve).

---

## 2. Diagnóstico del Cuello de Botella y Optimización SQL de Alto Rendimiento

### 2.1. Problema en la Aplicación Legada
En el cliente Visual Basic .NET (`frmCriterios.vb`), la consulta realizaba un bucle paginado de llamadas COM `clsCur` que bloqueaba la interfaz gráfica, realizaba múltiples consultas por cada estación y abría instancias zombi de `EXCEL.EXE`.

### 2.2. Diagnóstico del Cuello de Botella Inicial
En la primera aproximación relacional, la consulta intentaba aislar los defectos OBD mediante una CTE (`obd_defectos`) sobre `CENTRALITV.INSPECCION_DEFECTOS`. Debido a que esta tabla contiene **más de 50 millones de registros históricos** y la columna `BLOQUE` no cuenta con un índice dedicado por sí sola, Oracle forzaba un **Full Table Scan** sobre la tabla completa antes de aplicar el rango de fechas de `INSPECCION`. Esto provocaba bloqueos y excedía el tiempo de espera (120 segundos).

### 2.3. Reingeniería del Plan de Ejecución (Index-Driven Nested Loops)
Se reestructuró la consulta invirtiendo la dirección de conducción:
1. Conducir directamente desde `CENTRALITV.INSPECCION i` utilizando el índice particionado de fechas (`P17_INSPECCION` / `P31_INSPECCION`) en conjunción con los filtros de negocio (`CODSECCION = 1`, `ANULADA = 0`).
2. Resolver la unión con `CENTRALITV.INSPECCION_DEFECTOS dfc` mediante **Nested Loops** (`USE_NL(dfc)`) utilizando su clave primaria compuesta `(CODESTACION, CODINSPECCION)`.
3. Filtrar de forma numérica directa sobre las estaciones seleccionadas (`i.CODESTACION IN (...)`), evitando wrappers como `LPAD(TRIM(TO_CHAR(...)))` que invalidaban la poda de particiones en Oracle.

```sql
SELECT /*+ LEADING(i dfc e) INDEX(i P17_INSPECCION P31_INSPECCION) USE_NL(dfc) USE_NL(e) */
       i.CODINSPECCION                                               AS CodInspeccion,
       LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')                    AS CodEstacion,
       NVL(e.DesEstacion, 'Estación ' || i.CODESTACION)              AS DesEstacion,
       NVL(e.Cod_Empresa, '01')                                      AS CodEmpresa,
       i.MATRICULA                                                   AS Matricula,
       i.FECHAINSPECCION                                             AS FechaInspeccion,
       NVL(i.MARCA, '-')                                             AS Marca,
       NVL(i.MODELO, '-')                                            AS Modelo,
       NVL(i.TIPOMOTOR, '-')                                         AS TipoMotor,
       NVL(i.TIPOVEHICULO, '-')                                      AS TipoVehiculo,
       i.CHOMOLOGACION                                               AS CHomologacion,
       CONCAT(NVL(i.CODCONSTRUCCION, ''), NVL(i.CODUTILIZACION, '')) AS Clasificacion,
       i.MMA                                                         AS Mma,
       i.KILOMETRAJE                                                 AS Kilometraje,
       NVL(i.CODSEPIVA, '001')                                       AS TipoInspeccion,
       NVL(i.RESULTADO, '3')                                         AS Resultado,
       NVL(i.INDICA12, '1')                                          AS Fase,
       NVL(i.DESNIVEL_EMISIONES, '-')                                AS DesNivelEmisiones,
       dfc.BLOQUE                                                    AS Bloque,
       dfc.DEFECTO                                                   AS Defecto,
       dfc.SUBDEFECTO                                                AS Subdefecto,
       dfc.NUMERO                                                    AS Numero
  FROM CENTRALITV.INSPECCION i
 INNER JOIN CENTRALITV.INSPECCION_DEFECTOS dfc
    ON dfc.CODESTACION   = i.CODESTACION
   AND dfc.CODINSPECCION = i.CODINSPECCION
   AND dfc.BLOQUE        = '15'
   AND dfc.DEFECTO      IN ('02', '03')
   AND dfc.SUBDEFECTO    = '06'
   AND dfc.NUMERO       IN ('02', '03', '04', '05', '31', '51')
  LEFT JOIN CENTRALITV.ESTACIONES e
    ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')
 WHERE i.CODSECCION = 1
   AND i.ANULADA = 0
   AND i.FECHAINSPECCION >= :FechaInicio
   AND i.FECHAINSPECCION <= :FechaFin
 ORDER BY i.FECHAINSPECCION DESC
```

### 2.4. Tiempos de Respuesta Verificados en Oracle
- **Rango 2 días (01/11 al 02/11):** 95 milisegundos.
- **Rango 1 semana (20/10 al 27/10):** 2,81 segundos (~1.533 registros obtenidos).
- **Rango 1 mes completo (01/10 al 31/10):** 13,98 segundos (~5.448 registros obtenidos).

---

## 3. Doble Validación, Paginación Reactiva y Arquitectura "Thick Server / Thin Client"

1. **Backend (.NET 10 Web API - `InformesDefectoObdService`):**
   - Validación estricta: `FechaFin >= FechaInicio` y `(FechaFin - FechaInicio).TotalDays <= 366`.
   - Cálculo centralizado de métricas:
     - Total Defectos OBD globales.
     - Desglose y cuota porcentual Diésel vs Gasolina.
     - Total y porcentaje de Defectos Graves (DG) vs Defectos Leves (DL).
     - Estación con mayor volumen de lecturas anómalas.
     - Puntos para Gráfico de Ranking por Estación y Gráficos Circulares de Tipología y Combustible.
   - **Exportación Excel con Fidelidad 1:1 (`frmCriterios.vb`) — Opción A**:
     - Generación nativa de libro `.xlsx` en servidor con ClosedXML / OpenXML (sin requerir Excel instalado en el servidor ni automatización COM zombi).
     - **Estructura Multi-Pestaña Idéntica a la App de Escritorio**: El libro Excel genera una pestaña individual por cada centro ITV con defectos, nombradas exactamente como en la aplicación desktop: `DEFECTOS_OBD_{CodEstacion}` (ej. `DEFECTOS_OBD_4004`, `DEFECTOS_OBD_2875`, `DEFECTOS_OBD_2893`, `DEFECTOS_OBD_4514`...).
     - Estructura de 24 columnas oficiales con cabeceras en negrita y sombreado corporativo:
       `COD_INSPECCION | MATRICULA | FECHA_INSPECCION | MARCA | MODELO | TIPO_MOTOR | TIPO_VEHICULO | CHOMOLOGACION | CLASIFICACION | MMA | KILOMETRAJE | TIPO_INSPECCION | RESULTADO | FASE | DESNIVEL_EMISIONES | BLOQUE | DEFECTO | SUBDEFECTO | NUMERO | ESTACION | COD_ESTACION | SOCIEDAD | DESCRIPCION_DEFECTO | GRAVEDAD`
     - Ajuste automático de ancho de columnas y compatibilidad absoluta con macros o herramientas preexistentes.

2. **Frontend (React 19 + TypeScript - `useDefectoObdReport` & `DefectoObdReportPage`):**
   - **Contador y Paginación Reactiva de Alto Rendimiento**:
     - Selector configurable de registros por página con opciones de `50`, `100`, `200` y `500` registros (por defecto 50).
     - Controles de navegación completa (« Primera, ‹ Anterior, indicador Página X de Y, Siguiente ›, Última ») con reinicio automático de página ante filtros o búsquedas.
     - Contador oficial de registros adaptado por informe mediante `unidadRegistros="registros"` en `ReportTableContainer` (`"Mostrando 50 de 1201 registros"`).
   - **Cabecera Corporativa y Botones de Acción**:
     - Eliminación del botón de impresión masiva en navegador que causaba bloqueos de pantalla por volumen de miles de defectos, canalizando la extracción a través del botón oficial de exportación a Excel.
     - Todos los botones de exportación a Excel permanecen deshabilitados cuando no hay datos o durante la consulta/descarga.
     - Inclusión del modal bloqueante con spinner corporativo `BlockingLoadingModal` durante la generación del fichero Excel para feedback visual unificado.
   - **Selector de Vista de Gráficos Homogéneo**:
     - Posicionado a la derecha (`justifyContent: 'flex-end'`) con diseño de botonera segmentada corporativa (`Ranking por Estación`, `Tipología Defecto OBD`, `Combustible`) homogénea con el resto de informes.
   - **Gráficos Donut sin Euros**:
     - Corregido el formateador por defecto (`valueFormatter`) mostrando exclusivamente unidades contables de defectos (`def.`) y eliminando el símbolo de euro (`€`) que pertenecía a informes financieros.
   - **Gráfico de Ranking con Scroll Vertical Completo**:
     - Altura máxima con scroll adaptativo (`maxHeight: '380px'`) para visualizar la totalidad de estaciones de la red sin corte en el texto de desglose de combustible.
   - **Unificación de Eventos de Búsqueda**:
     - Clic en filtros rápidos (`Fase: Todas / 1ª Fase / 2ª Fase`, `Sociedad: Todas / TSA / CAL`) y selector de estaciones (marcar, desmarcar o cambiar estación) ejecutan inmediatamente la actualización de KPIs, gráficos y tablas.
     - Los selectores de fechas (`Desde`, `Hasta`) no disparan consultas directas para evitar sobrecargas intermedias, esperando a que el usuario pulse Enter o haga clic en el botón `Consultar`.
   - **Estabilización de Ancho de Tabla y Prevención de Solapamiento**:
     - Configuración fija con `<colgroup>` y `minWidth: '1210px'` (`table-layout: fixed`).
     - Ampliación de ancho de `Gravedad` a `155px` con `overflow: hidden` para alojar con holgura el badge `Defecto Grave (DG)`.
     - Asignación de `80px` a `Fase` con alineación centrada y contenedor en píldora (`#f1f5f9`), eliminando por completo cualquier colisión o invasión visual entre `Gravedad` y `Fase`.
     - Las celdas de `Estación` y `Vehículo` incorporan `overflow: hidden`, `text-overflow: ellipsis` y tooltip descriptivo con `AppTooltip`.
   - **Validación Reactiva de Fechas y Limpieza Preventiva de Datos**:
     - Se activa el atributo `open` y `heading="Validación de Rango de Fechas"` en el componente `<TsAlert>` de la pantalla, visualizándose inmediatamente si se selecciona un rango superior a 1 año (366 días) o con fecha de fin anterior al inicio.
     - Incluye botón directo *"Ajustar a 1 año"* para recalcular el límite superior con un solo clic.
     - Al saltar la validación, se vacía de inmediato el grid (`setData(null)`) y las tarjetas de KPIs, evitando mantener datos obsoletos que no coincidan con las fechas indicadas en los selectores.
     - Mensaje contextual informativo en el interior de la tabla vacía: *"Indique un rango de fechas válido (máximo 1 año) para realizar la consulta."*
   - **Efecto Hover Homogéneo en Filas del Grid**:
     - Se integra transición suave (`transition: 'background-color 0.15s ease'`) y resaltado con el tono corporativo azul claro (`#edf5ff`) al pasar el cursor sobre cualquier fila del listado (`onMouseEnter` / `onMouseLeave`), preservando el alternate row striping (`#ffffff` / `#f8fafc`).
   - Validación reactiva previa y modal flotante de ficha técnica por cada inspección.

---

## 4. Estándar Visual y Tooltips Unificados (`AppTooltip`)

- **Cero atributos nativos `title="..."`:** Toda la información complementaria (descripciones reglamentarias de defectos, botones de acción, sectores del gráfico Donut y barras de ranking) utiliza el componente personalizado corporativo `AppTooltip` con fondo blanco, sombra suave y posicionamiento adaptable.
- **Tokens Semánticos:**
  - Azul Corporativo TÜV SÜD (`#002b49` y `#0046ad`) para estaciones TSA y vehículos Diésel.
  - Verde Esmeralda (`#00875a` / `#059669`) para estaciones CAL y resultados favorables.
  - Rojo Peligro (`#c81e1e`) para defectos graves y resultados desfavorables / negativos.
  - Ámbar (`#b45309`) para motores gasolina y avisos de rango.

---

## 5. Endpoints API Expuestos

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/informes/defecto-obd/consultar` | Consulta analítica con KPIs, gráficos y listado detallado de inspecciones con defecto OBD. |
| `POST` | `/api/v1/informes/defecto-obd/exportar-excel` | Descarga del fichero estructurado CSV/Excel oficial con BOM UTF-8 y separador `;`. |
