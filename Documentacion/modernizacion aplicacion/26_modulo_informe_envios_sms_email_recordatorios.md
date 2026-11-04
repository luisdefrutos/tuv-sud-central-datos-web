# Informe de Envíos Recordatorios SMS y Email (`envios-recordatorios`)

> **Módulo:** Informes y Estadísticas — Recordatorios a Clientes  
> **Estado:** Implementado y Verificado contra Oracle Producción (`10.108.206.3:1521` - `orclpr`)  
> **Origen Legacy:** `frmCriterios.vb` (`Envios_Sms_Mail` / `mnuSMS_Email_totales`) y `frmSMSEnviado.vb` (`mnuSMS_Email_enviados`)  
> **Tablas Oracle Reales:** `CENTRALITV.INSPECCION_SMS`, `CENTRALITV.INSPECCION_EMAIL`, `CENTRALITV.TIPO_TEXTO_RECORDATORIO`, `CENTRALITV.INSPECCION`, `CENTRALITV.ESTACIONES`  
> **Naturaleza Funcional:** **100% Solo Lectura / Auditoría**. No realiza ningún envío saliente de SMS ni peticiones SMTP.

---

## 1. Contexto y Diagnóstico del Bug del Legacy

En la aplicación de escritorio (`Central_Datos`) existían dos menús bajo **"Informes -> Recordatorios"**:

1. **"SMS's/Email's enviados" (`frmSMSEnviado.vb`)**: Formulario con grid para consultar expedientes individuales a los que se envió comunicación.
2. **"Nº total de envíos recordatorios" (`frmCriterios.vb: Envios_Sms_Mail`)**: Generador de informe estadístico agregado directamente a fichero Excel (sin visor en pantalla).

### El Defecto Crítico del Código Desktop (`frmCriterios.vb`)
En las líneas 2348-2358 de `frmCriterios.vb`:
```vb
If bMail Then
    oTabla = Cargar_Dataset_Exportacion_SmsEmailEnviados("INSPECCION_EMAIL", "IDTIPO_EMAIL", strCadenaCriterio)
    ExportarExcel(fBrowser.FileName, "ENVIOS_EMAIL", oTabla)
    ...
End If

If bMail Then ' <-- ¡BUG CRÍTICO! Debería ser If bSMS Then
    oTabla = Cargar_Dataset_Exportacion_SmsEmailEnviados("INSPECCION_SMS", "IDTIPO_SMS", strCadenaCriterio)
    ExportarExcel(fBrowser.FileName, "ENVIOS_SMS", oTabla)
    ...
End If
```
* **Impacto en Desktop**: Cuando el usuario seleccionaba el canal **Solo SMS**, el sistema marcaba `bSMS = True` y `bMail = False`. Al estar duplicada la condición `If bMail Then`, **el bloque de SMS nunca se ejecutaba**, produciendo un fichero Excel vacío o un fallo silencioso sin exportar ningún dato.
* **Solución en la Modernización Web**:
  * Se corrige de raíz la lógica condicional, garantizando la extracción independiente o combinada de SMS y Email.
  * Se dota al informe de una **interfaz gráfica completa e interactiva en React 19**, permitiendo alternar entre el **Resumen Consolidado** (totales agrupados por plantilla) y el **Listado Detallado** (matrícula, teléfono, email, inspección).
  * Exportación oficial en formato `.xlsx` con ClosedXML conteniendo las hojas `RESUMEN_GLOBAL`, `ENVIOS_SMS` y `ENVIOS_EMAIL`.

---

## 2. Esquema Físico Verificado en Oracle Producción

A través de la inspección directa del catálogo `ALL_TAB_COLUMNS` en Producción (`10.108.206.3:1521` - `orclpr`), se confirmaron las siguientes estructuras reales:

### 2.1. `CENTRALITV.INSPECCION_EMAIL` (1.357.813 registros en producción)
* `CODESTACION` (`VARCHAR2`)
* `CODINSPECCION` (`VARCHAR2`)
* `IDTIPO_EMAIL` (`NUMBER`)
* `FECHAENVIO` (`DATE`)
* `ACTUALIZACENTRAL` (`NUMBER`)
* `FECHA_OPERACION` (`DATE`)

### 2.2. `CENTRALITV.INSPECCION_SMS` (0 registros en producción - canal SMS histórico/inactivo)
* `CODESTACION` (`VARCHAR2`)
* `CODINSPECCION` (`VARCHAR2`)
* `IDTIPO_SMS` (`NUMBER`)
* `FECHAENVIO` (`DATE`)
* `ACTUALIZACENTRAL` (`NUMBER`)
* `FECHA_OPERACION` (`DATE`)

### 2.3. `CENTRALITV.ESTACIONES`
* `CODESTACION` (`VARCHAR2`)
* `DESESTACION` (`VARCHAR2`) — *Nota: la columna es `DESESTACION`, no `NOMBRE_CORTO`*
* `COD_EMPRESA` (`VARCHAR2`)

### 2.4. `CENTRALITV.INSPECCION`
* `CODESTACION` (`VARCHAR2`)
* `CODINSPECCION` (`VARCHAR2`)
* `MATRICULA` (`VARCHAR2`)
* `NOMBRE` (`VARCHAR2`), `APELLIDOS` (`VARCHAR2`)
* `TELEFONO`, `TELEFONO2` (`VARCHAR2`)
* `EMAIL` (`VARCHAR2`)
* `FECHACADUCIDAD` (`DATE`)

---

## 3. Consultas SQL Optimizadas y Parametrizadas

### 3.1. Resumen Agregado
```sql
SELECT 
    LPAD(TRIM(x.CODESTACION), 4, '0') AS CodigoEstacion,
    NVL(e.DESESTACION, 'ITV ' || x.CODESTACION) AS NombreEstacion,
    'EMAIL' AS Canal,
    x.IDTIPO_EMAIL AS IdPlantilla,
    NVL(t.DESCRIPCION, 'Email Tipo ' || TO_CHAR(x.IDTIPO_EMAIL)) AS DescripcionPlantilla,
    TRUNC(x.FECHAENVIO) AS FechaEnvio,
    COUNT(*) AS TotalEnviados
FROM CENTRALITV.INSPECCION_EMAIL x
LEFT JOIN CENTRALITV.ESTACIONES e ON e.CODESTACION = x.CODESTACION
LEFT JOIN CENTRALITV.TIPO_TEXTO_RECORDATORIO t ON t.IDTIPO = x.IDTIPO_EMAIL AND t.IDTIPORECORDATORIO = '3'
WHERE x.FECHAENVIO >= :p_FechaInicio AND x.FECHAENVIO <= :p_FechaFin
GROUP BY LPAD(TRIM(x.CODESTACION), 4, '0'), NVL(e.DESESTACION, 'ITV ' || x.CODESTACION), x.IDTIPO_EMAIL, t.DESCRIPCION, TRUNC(x.FECHAENVIO)
ORDER BY FechaEnvio DESC
```

### 3.2. Listado Detallado (con Join a `INSPECCION`)
```sql
SELECT 
    'EMAIL' AS Canal,
    LPAD(TRIM(x.CODESTACION), 4, '0') AS CodigoEstacion,
    NVL(e.DESESTACION, 'ITV ' || x.CODESTACION) AS NombreEstacion,
    x.FECHAENVIO AS FechaEnvio,
    TO_NUMBER(NVL(REGEXP_SUBSTR(x.CODINSPECCION, '^[0-9]+'), '0')) AS NumeroInspeccion,
    TO_NUMBER(TO_CHAR(x.FECHAENVIO, 'YYYY')) AS AnioInspeccion,
    NVL(i.MATRICULA, '-') AS Matricula,
    x.IDTIPO_EMAIL AS IdPlantilla,
    NVL(t.DESCRIPCION, 'Email Tipo ' || TO_CHAR(x.IDTIPO_EMAIL)) AS DescripcionPlantilla,
    NVL(i.EMAIL, '-') AS Destinatario,
    NVL(i.NOMBRE, '') AS Nombre,
    NVL(i.APELLIDOS, '') AS Apellidos,
    'ENVIADO' AS EstadoEnvio,
    i.FECHACADUCIDAD AS FechaCaducidad
FROM CENTRALITV.INSPECCION_EMAIL x
INNER JOIN CENTRALITV.INSPECCION i ON i.CODESTACION = x.CODESTACION AND i.CODINSPECCION = x.CODINSPECCION
LEFT JOIN CENTRALITV.ESTACIONES e ON e.CODESTACION = x.CODESTACION
LEFT JOIN CENTRALITV.TIPO_TEXTO_RECORDATORIO t ON t.IDTIPO = x.IDTIPO_EMAIL AND t.IDTIPORECORDATORIO = '3'
WHERE x.FECHAENVIO >= :p_FechaInicio AND x.FECHAENVIO <= :p_FechaFin
```
> [!IMPORTANT]
> Se configura siempre `cmd.BindByName = true;` en el `OracleCommand` para evitar el error `ORA-01008: not all variables bound` provocado por la vinculación posicional por defecto en queries con `UNION ALL`.

---

## 4. Visualización Gráfica: Todas las Estaciones con Scroll Continuo y Donut de Cuotas

En la interfaz de usuario de Central Datos Web (`EnviosRecordatoriosReportPage.tsx`):

1. **Eliminación del Truncamiento y Top 8**:
   * Se suprime cualquier límite artificial (Top 8 / Top 15) en el backend (`InformesEnviosRecordatoriosService.cs`) y frontend.
   * Se muestran **todas las estaciones** de la red que tengan envíos en el rango seleccionado.
2. **Componente de Barras con Scroll (`ReportBarChart`)**:
   * Contenedor con scroll vertical fluido (`.cd-touch-scroll`, `maxHeight: 420px/480px`) para recorrer la totalidad de estaciones sin truncar etiquetas ni cifras.
   * Distinción corporativa de sociedad con leyenda interactiva: Azul `#0046ad` para TÜV SÜD ATISAE (TSA) y Verde `#00875a` para TÜV SÜD CAL (CAL).
3. **Componente Circular Donut (`ReportDonutChart`)**:
   * Distribución porcentual por **Tipo de Plantilla de Recordatorio** con tooltips enriquecidos (`AppTooltip`) y cuotas calculadas en tiempo real.
   * Distribución comparativa por **Canal de Comunicación** (SMS vs Email).
4. **Selector de Modos Gráficos**:
   * **Dividida (Barras + Donut)**: Visualización en paralelo de la red completa y la cuota por plantilla.
   * **Todas las Estaciones (Barras con Scroll)**: Vista ampliada a todo el ancho para análisis pormenorizado de todas las ITV.
   * **Donut por Plantilla**: Análisis focalizado de las plantillas más demandadas.
   * **Donut por Canal**: Comparativa global SMS vs Email.
