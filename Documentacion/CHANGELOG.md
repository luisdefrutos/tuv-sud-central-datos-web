# Registro Histórico de Cambios (Changelog)

Todas las modificaciones notables de este proyecto se documentan en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico.

---

## [2.11.0] - 30/10/2026 — *Módulo Oficial de Duración Promedio de Inspecciones Periódicas (001), Fidelidad 1:1 Crystal Reports y Gráficos Visuales*

### ⏱️ Módulo de Duración Promedio de Inspecciones (001)
* **Nuevos Endpoints Analíticos (.NET 10 Minimal APIs)**:
  * `POST /api/v1/informes/duracion-promedio/consultar`: Agregación de alto rendimiento en el servidor para el grid analítico, 4 tarjetas de KPI ejecutivas, ranking de agilidad de estaciones y distribución por tipología de vehículo según clasificación oficial MINER.
  * `POST /api/v1/informes/duracion-promedio/exportar-excel`: Exportación directa a formato CSV / Excel con delimitador español (`;`), codificación UTF-8 con BOM y cabeceras oficiales.
* **Consulta SQL Exacta 1:1 con la App de Escritorio (`ObtenerInformeDuracionPromedio.sql`)**:
  * Ejecución directa sobre Oracle mediante Dapper + ODP.NET Thin.
  * Agregación precalculada con hint de índices `P17_INSPECCION` y `P31_INSPECCION`.
  * Filtro estricto `ANULADA = 0`, `CodSepiva IN ('001')` (inspecciones periódicas), `HoraFinal IS NOT NULL`, `HoraCobro IS NOT NULL` y `HoraFinal >= HoraCobro`. Se elimina el corte artificial de 180 min para replicar fielmente el cálculo de `frmCriterios.vb:2856-2857` (`ROUND(Avg((HoraFinal - HoraCobro)*24*60), 1)`).
  * Integración con la función oficial `CENTRALITV.CLASIFICACION_MINER(CodConstruccion, CodUtilizacion)` y ordenación por `CENTRALITV.TIPOS_CLASIFICACION_MINER.ORDEN`.
* **Filtro de Fase Integrado y Responsivo en `ReportFiltersBar`**:
  * El filtro de fase (`Todas`, `1ª Fase`, `2ª Fase`) se traslada a la barra horizontal de filtros `ReportFiltersBar`, situado inmediatamente al lado del selector de fechas para un flujo natural e intuitivo.
  * Se mantiene la barra totalmente responsiva (`flexWrap: 'wrap'`).
  * En la cabecera de la página se eliminan duplicidades, dejando en la zona derecha exclusivamente los dos botones de acción: `🖨️ Imprimir (Crystal Report)` y `🔄 Actualizar Datos`.
* **Consistencia Corporativa en la Columna Sociedad**:
  * La columna "Sociedad" del grid analítico adopta el mismo estándar de texto y badge que `FacturacionReportPage` y `NumeroInspeccionesReportPage`, mostrando `TÜV SÜD ATISAE (TSA)` o `TÜV SÜD CAL (CAL)` con su correspondiente badge semántico.
* **Corrección de Ordenación en Ranking de Agilidad (`ReportBarChart`)**:
  * Se añade la propiedad `sortOrder?: 'desc' | 'asc' | 'none'` a `ReportBarChart` (por defecto `'desc'`).
  * En el ranking de agilidad se configura `sortOrder="asc"`, mostrando en primer lugar (#1) la estación con menor duración promedio (más ágil) y en último lugar la más lenta, solventando la inversión reportada en la interfaz gráfica.
* **Métricas Visuales Enriquecidas con Gráficos Donut (`ReportDonutChart`)**:
  * Se incorpora un selector de visualizaciones con 4 alternativas sin sobreingeniería:
    1. `📊 Ranking Agilidad (Menor a Mayor)`: Barras horizontales ordenadas de mayor a menor celeridad.
    2. `🚗 Por Tipo de Vehículo`: Barras con duración media por categoría MINER.
    3. `🍩 Cuota por Tipo (Donut)`: Gráfico circular con la distribución porcentual de inspecciones por tipología de vehículo.
    4. `🏢 Cuota Sociedades (Donut)`: Gráfico circular con la distribución de volumen entre TSA y CAL.
* **Réplica Oficial 1:1 de Crystal Reports (`rptDuracionPromedio`) en `CrystalReportDuracionPromedioModal.tsx`**:
  * Adaptado fielmente al informe clásico de escritorio en A4 vertical (Portrait):
    * Marco enmarcado con título oficial: `DURACIÓN PROMEDIO DE INSPECCIONES (EN MINUTOS) / INSPECCIONES PERIÓDICAS 001`.
    * Desglose por tipo de vehículo (`TIPO DE VEHÍCULO: MOTOCICLETAS`, etc.) con exactamente 2 columnas: `ESTACIÓN ITV` y `DURACIÓN (MIN.)` redondeada a entero, junto con el pie `Promedio: [valor]`.
    * Bloque final de `FILTRO APLICADO AL INFORME` con fecha inicial, fecha final, fase y listado de estaciones analizadas, idéntico a la página 10 del informe clásico de Crystal Reports.

---

## [2.10.0] - 30/10/2026 — *Restricción Integral de Estaciones por Permisos de Usuario (`CENTRAL_GENERAL`) y Optimización Reactiva del KPI Redondo*

### 🔐 Seguridad y Permisos de Estaciones por Usuario (Active Directory / Oracle)
* **Permisos Oficiales de Central Datos (`CENTRALITV.EMPLEADO_PERMISOS`)**:
  * Se alinea la obtención de estaciones permitidas con la lógica histórica de la aplicación de escritorio (`clsGeneral.vb: Cargar_Centros_Permitidos("CENTRAL_GENERAL")`).
  * Para operadores (como `defru-li`), se consultan las estaciones asignadas en `CENTRALITV.EMPLEADO_PERMISOS` con `CodPermiso = 'CENTRAL_GENERAL'`, `Activo = -1` y `VALOR = 'SI'`, devolviendo exactamente sus centros autorizados (`0902`, `2811`, `2812`, `4308`).
  * Los supervisores mantienen acceso íntegro a todas las estaciones de la red (`Central_Datos = -1`).
  * Bloqueo preventivo de acceso si un usuario no supervisor carece de estaciones autorizadas en el módulo de Central Datos.
* **Aplicación Integral en Toda la Aplicación Web**:
  * **Pantalla de Inicio / "Últimos datos centralizados" (`UltimosDatosCentralizados.tsx` & `useUltimosDatos.ts`)**:
    * Se aplica el filtro de estaciones permitidas a la tabla principal, mostrando exclusivamente las 4 estaciones asignadas al usuario en lugar de toda la red.
    * Las 4 tarjetas de resumen métrico (`Total Estaciones`, `TSA`, `CAL`, `Última Inspección Centralizada`) y los botones de filtro rápido de sociedad (`Todas`, `TSA`, `CAL`) recalculan sus cifras dinámicamente sobre las estaciones autorizadas del operador.
  * **Módulos de Informes (`FacturacionReportPage.tsx` y `NumeroInspeccionesReportPage.tsx`)**:
    * Los selectores desplegables `ReportFiltersBar` reciben `estacionesPermitidas` para limitar las estaciones elegibles y restringir los filtros de sociedad.

### 🍩 Gráfico Circular Dinámico (KPI Redondo / Donut Cuota)
* **Recálculo Reactivo Inmediato (`useNumeroInspeccionesReport.ts`)**:
  * Se corrige el cálculo de `graficoCuotaDinamico`: ahora se computa directamente a partir de las filas visibles (`filasFiltradasYOrdenadas`), desglosando `Fase 1 Favorables`, `Fase 1 Rechazadas`, `Fase 2 Favorables` y `Fase 2 Rechazadas`.
  * Se elimina la discrepancia que provocaba que el gráfico se quedara en blanco o sin datos al marcar y desmarcar estaciones en el filtro.
  * Respeto de la paleta semántica en el componente `ReportDonutChart`: Fav. F1 (Azul corporativo `#0046ad`), Rech. F1 (Rojo `#dc2626`), Fav. F2 (Celeste `#0284c7`), Rech. F2 (Naranja `#ea580c`).
  * Limpieza y reseteo defensivo del estado de hover al variar los datos representados.

---

## [2.09.0] - 30/10/2026 — *Módulo Oficial de Número de Inspecciones (Favorables y Rechazadas por Fase) y Réplica Crystal Reports 1:1*

### 📊 Módulo de Número de Inspecciones (Fase 1 y Fase 2)
* **Nuevos Endpoints Analíticos (.NET 10 Minimal APIs)**:
  * `POST /api/v1/informes/numero-inspecciones/consultar`: Agregación de alto rendimiento en el servidor para el grid analítico, 4 tarjetas de KPI ejecutivas y gráficos comparativos de barras y tarta.
  * `POST /api/v1/informes/numero-inspecciones/exportar-excel`: Exportación directa a formato CSV / Excel con delimitador español (`;`), codificación UTF-8 con BOM y cabeceras oficiales.
* **Consulta SQL Optimizada (`ObtenerInformeNumeroInspecciones.sql`)**:
  * Ejecución directa sobre Oracle mediante Dapper + ODP.NET Thin.
  * Agregación precalculada en un solo paso (`Single-Pass CTE`) con hint de índices sobre `P17_INSPECCION` y `P31_INSPECCION`.
  * Filtro estricto `ANULADA = 0` y segregación por fase y resultado exactamente igual a la aplicación de escritorio (`frmCriterios.vb`):
    * `Favorables1`: `RESULTADO IN ('1', '2') AND INDICA12 = '1'`
    * `Rechazadas1`: `RESULTADO IN ('3', '4') AND INDICA12 = '1'`
    * `Favorables2`: `RESULTADO IN ('1', '2') AND INDICA12 = '2'`
    * `Rechazadas2`: `RESULTADO IN ('3', '4') AND INDICA12 = '2'`
* **Dashboard y Grid Analítico Web (Thin Client)**:
  * 4 KPIs ejecutivos: Total Inspecciones, 1ª Inspección (Fase 1), 2ª Inspección (Fase 2) y % Rechazo Global.
  * Gráfico comparativo dual: alternancia instantánea entre Ranking de Estaciones por volumen y Distribución de Cuota de la red.
  * Tabla con ordenación multicriterio ascendente/descendente en todas las subcolumnas y fila resumen de totales de la red.
  * Reutilización máxima y estricta de componentes existentes de Algorithm DS: `ReportFiltersBar`, `ReportKpiCard`, `ReportBarChart`, `ReportDonutChart`, `ReportTableContainer`, `SortIndicator` y `BlockingLoadingModal`.
  * Validación en cliente y servidor con límite de rango a 365 días y alertas dinámicas en tiempo real.
  * **Interactividad y Limpieza Reactiva**: Al desmarcar todas las estaciones en el filtro, el grid se vacía al instante mostrando aviso instructivo, los 4 KPIs se limpian a cero, los gráficos muestran su estado vacío y los botones de exportación a Excel e impresión Crystal Report se desactivan automáticamente al no haber datos que mostrar.

### 🖨️ Réplica Oficial 1:1 de Crystal Reports (`rptInspFavorablesRechazadas`)
* **Impresión Aislada y Sin Ruido en A4 Apaisado (`CrystalReportNumeroInspeccionesModal.tsx`)**:
  * Réplica tipográfica y estructural exacta del formato clásico de Crystal Reports con cabecera enmarcada, parámetros de fechas/estaciones y desglose en 3 bloques de 4 columnas:
    * Fase 1 (1ª Inspección): Favorables, Rechazadas, Total, % Rechazo.
    * Fase 2 (2ª Inspección): Favorables, Rechazadas, Total, % Rechazo.
    * Total Inspecciones: Total Fav., Total Rech., Total Insp., % Rechazo.
  * Impresión mediante iframe oculto aislado: se eliminan botones, scrollbars y bordes del navegador, ajustando la red completa de estaciones en **1 sola página A4 horizontal**.

---

## [2.08.0] - 30/10/2026 — *Módulo Oficial de Facturación de Inspecciones y Réplica Crystal Reports 1:1*

### 📊 Módulo de Facturación e Inspecciones Centralizadas
* **Nuevo Endpoint Analítico (.NET 10 Minimal APIs)**:
  * `POST /api/v1/informes/facturacion/consultar`: Agregación de alto rendimiento en el servidor para el grid analítico, tarjetas de KPI ejecutivas y gráficos comparativos.
  * `POST /api/v1/informes/facturacion/exportar-csv`: Exportación inmediata a formato CSV / Excel con delimitadores en español (`;`) y BOM UTF-8 para apertura directa en Microsoft Excel.
* **Consulta SQL Optimizada (`ObtenerInformeFacturacion.sql`)**:
  * Ejecución directa sobre Oracle mediante Dapper + ODP.NET Thin.
  * Agregación en un solo paso (`Single-Pass CTE`) con hint de índices sobre `P17_INSPECCION` y `P31_INSPECCION`, reduciendo tiempos de consulta en base de datos de producción de 78 segundos a subsegundos.
* **Dashboard y Grid Analítico Web**:
  * 4 KPIs ejecutivos en cabecera: Facturación Neta Total, Total Inspecciones, Ticket Medio por Inspección y Estación con Mayor Facturación (con filtro de exclusión de facturación cero).
  * Gráfico comparativo dual: alternancia instantánea entre Ranking de Barras y Cuota de Mercado (%) con tokens de color corporativos TÜV SÜD (Azul `#0046ad` para TSA y Verde `#00875a` para CAL).
  * Selector multisección de estaciones con opciones de "Marcar todas" y "Desmarcar todas" sin interferencias de eventos.

### 🖨️ Réplica Oficial 1:1 de Crystal Reports (`rptResumenInspecciones`)
* **Desglose Completo por Formas de Pago (`CENTRALITV.FORMAPAGO`)**:
  * Integración con la tabla de formas de pago replicando exactamente la lógica del escritorio (`frmCriterios.vb`):
    * **Contados (`CODTIPOFORMAPAGO IN ('C', 'X')`)**: Nº Inspecciones, Base, IVA, Tasas y Total.
    * **Terceros (`CODTIPOFORMAPAGO IN ('3', 'O')`)**: Nº Inspecciones, Base, IVA, Tasas y Total.
    * **Tarjetas (`CODTIPOFORMAPAGO = 'T'`)**: Nº Inspecciones, Base, IVA, Tasas y Total.
    * **Totales Oficiales**: Nº Inspecciones, Base, IVA (Sumado), Tasas, Tasas de Tráfico, Tasas de Industria, Total y Gratuitas.
  * Concordancia matemática al céntimo contra las liquidaciones contables y los informes clásicos de escritorio.
* **Impresión Aislada y Sin Ruido en A4 Apaisado (`CrystalReportPreviewModal.tsx`)**:
  * Mecanismo de impresión desacoplado mediante *iframe* oculto: se suprimen al 100% los botones de la pantalla, la barra del visor, los fondos grises y los scrollbars.
  * Configuración estricta `@page { size: A4 landscape; margin: 5mm 6mm; }` en orientación horizontal.
  * La tabla de 23 columnas, junto con el enmarcado de título, criterios (`IVA SUMADO`, fechas, estaciones) y fila de totales finales, entra con exactitud en **1 sola hoja de papel (Página 1 de 1)** sin columnas cortadas ni saltos extraños de página.

### 🧹 Usabilidad y Limpieza de Interfaz
* **Menú "Aplicación"**: Eliminada la opción redundante *"Salir"*, manteniendo exclusivamente *"Últimos datos centralizados"*.
* **Insignias y Tooltips**: Información técnica de base de datos (host/SID) visible únicamente en entornos de desarrollo mediante atributos `title` limpios.

---

## [2.07.0] - 30/10/2026 — *Resiliencia de Auditoría, Cola Offline y Diagnóstico Técnico Local*

### 📡 Resiliencia y Auditoría Desconectada (Offline Buffer & Auto-Sync)
* **Arquitectura de Cola Local Offline (`auditQueue.ts`)**:
  * Implementación de un buffer circular seguro en `localStorage` (límite de 100 eventos) que captura automáticamente los registros de auditoría y navegación en caso de corte de red o indisponibilidad temporal del servidor.
  * Trazabilidad temporal de alta precisión: cada evento sincronizado en diferido se etiqueta con `[Offline HH:mm:ss]`, permitiendo auditar la hora real de la operativa en planta.
* **Sincronización Automática en Lote (*Auto-Flush*)**:
  * Escucha activa del evento nativo `window.addEventListener('online')` para reanudar y volcar en segundo plano los eventos retenidos sin intervención del usuario.
  * Nuevo endpoint en .NET 10 Minimal APIs: `POST /api/v1/auth/audit/batch` con inserción transaccional en Oracle (`CENTRALITV.LOG_AUDITORIA_WEB`) y registro en Serilog.
* **Diagnóstico Técnico Descargable para Soporte (CAU)**:
  * Generación y descarga directa en el navegador de informes de diagnóstico técnico (`tuv-sud-central-datos-diagnostico-YYYYMMDD-HHmmss.log`) con metadatos de red, usuario, URL, navegador, resolución y traza de eventos en cola.
  * Accesible desde el banner global de advertencia offline en `App.tsx` y desde la alerta de incidencia de comunicación en `LoginPage.tsx`.
* **Documentación Técnica**:
  * Actualización de `10_arquitectura_logging_auditoria_y_seguridad_pentest.md` incorporando la Sección 7 con diagrama de flujo Mermaid y especificación técnica exhaustiva.

---

## [2.06.0] - 30/10/2026 — *Estabilidad de Login, Notificaciones Pentest-Safe y Ordenación Robusta de Red*

### 🔐 Autenticación y Experiencia de Usuario (Login)
* **Erradicación del Parpadeo y Pantalla en Blanco en Error de Acceso**:
  * Desacoplamiento del estado global `isLoading` en `AuthContext.tsx`, impidiendo el desmontaje accidental de `LoginPage.tsx` durante el procesamiento de credenciales.
  * Migración del estado de progreso a un indicador local (`isLoggingIn`) exclusivo del botón de acción.
  * Incorporación de `action="javascript:void(0);"` en el formulario para neutralizar recargas nativas indeseadas del navegador.
* **Componente `TsAlert` Cerrable y Móvil**:
  * Integración estable de `<TsAlert>` corporativo situado sobre el botón de envío, con cierre manual (`closable` y `onTsAfterHide`).
  * Estilos elásticos con `wordBreak: 'break-word'` y `maxWidth: '100%'` adaptados a pantallas de smartphone.
* **Unificación y Cumplimiento Pentest (OWASP ASVS / CWE-204 & CWE-208)**:
  * Eliminación de filtros asimétricos de longitud en frontend (`length < 2`) para evitar cualquier tipo de inferencia o enumeración de cuentas.
  * Mensaje genérico y neutral ante cualquier fallo de validación o contraseña incorrecta: *"Las credenciales introducidas no son válidas o no dispone de autorización para acceder al sistema."*.

### 📊 Monitor de Estaciones y Ordenación
* **Agrupación Ponderada de Sociedades**:
  * Implementación de la función `getPesoSociedad` en `useUltimosDatos.ts` (`TSA / ATISAE = 1`, `CAL = 2`, `Otras = 99`), asegurando que las estaciones pertenecientes a la misma sociedad permanezcan estrictamente agrupadas bajo cualquier ordenación.
  * Criterio de desempate determinista secundario (*tie-breaker*) alfabético por denominación y código de estación.
* **Solución al Bloqueo/Congelación de Columnas**:
  * Unificación atómica del estado de ordenación en `orden: { columna, direccion }` dentro del hook `useUltimosDatos.ts`, eliminando los bailouts y side-effects de React 18 que congelaban la tabla tras sucesivos clics.
  * Ordenación nativa SQL actualizada en `ObtenerUltimosDatosCentralizados.sql` con `ORDER BY e.Cod_Empresa, e.DesEstacion`.
* **Optimización de Estilos en Tabla**:
  * Reemplazo de manipulación DOM imperativa en cabeceras `th` por clases nativas CSS (`.cd-table-th`, `.cd-table-th-active`) en `responsive.css`.

---

## [2.05.0] - 29/10/2026 — *Hito de Autenticación, Auditoría, Logging y Responsividad* (Commits: `504f50a`, `5860865`)

### 🔐 Seguridad y Autenticación
* **Autenticación Multicanal Completa (.NET 10 + JWT)**:
  * Soporte para Active Directory corporativo vía LDAP (`WW001.ITGR.NET`).
  * Autenticación de cuenta técnica de sistema `SUPERVISOR` con hash maestro de base de datos.
  * Suplantación de identidad controlada (`SUPERVISOR:USUARIO`) para soporte de segundo nivel.
  * Autenticación de empleados internos/planta sin dominio contra `COMUN.PERSONA`.
  * Soporte para Windows Single Sign-On (SSO Intranet).
* **Emisión de Tokens JWT**:
  * Firma simétrica SHA-256 de 8 horas de duración con claims de rol, estaciones autorizadas y supervisor.
* **Blindaje frente a Pentest (OWASP CWE-209 & CWE-203/204)**:
  * Mensajes de error unificados y neutrales (*"Credenciales no válidas o acceso no autorizado."*) para evitar enumeración de usuarios.
  * Supresión total de `ex.Message`, errores ORA y stack traces en las respuestas HTTP y en componentes `<TsAlert>`.
  * Eliminación de trazas de credenciales en la consola del navegador.

### 📊 Lógica de Negocio y Estaciones
* **Cálculo de Sincronización Centralizado en Backend**:
  * Traslado de toda la lógica de cálculo de desfases temporales a la entidad de dominio `EstacionUltimoDato`.
  * Generación de etiquetas legibles en español sin abreviaturas confusas (*"Al día (Hoy)"*, *"Alerta (hace X días)"*, *"Crítico (> 1 año)"*).
  * Niveles semánticos calculados (`success`, `warning`, `danger`) y descripciones de accesibilidad (*tooltips*).
* **Refactorización Limpia con Custom Hook (`useUltimosDatos`)**:
  * Desacoplamiento total entre la lógica de estado/filtrado y la vista visual JSX.
  * Reducción de `UltimosDatosCentralizados.tsx` a una plantilla puramente declarativa y legible.

### 📝 Sistema Híbrido de Logging y Auditoría
* **Auditoría Transaccional en Base de Datos (Oracle)**:
  * Integración con la tabla histórica `CENTRALITV.LOG_ACCESOS_MODULOS` (inicio y fin de sesión).
  * Creación y despliegue idempotente de la nueva tabla `CENTRALITV.LOG_AUDITORIA_WEB` con secuencia y trigger para trazabilidad de navegación, clics y tiempos de respuesta.
* **Diagnóstico Técnico de Infraestructura con Serilog**:
  * Configuración de ficheros rotativos diarios en disco: `logs/central-datos-YYYYMMDD.log`.
  * Retención automática de 30 días y límite de 50 MB por fichero con partición incremental.
  * Los errores de conexión de Oracle se aíslan exclusivamente en fichero para evitar dependencias circulares.
* **Middleware Global de Excepciones**:
  * Captura global de errores 500 no controlados con volcado a disco y entrega de respuesta segura al cliente.

### 📱 Diseño Responsivo
* **Adaptabilidad Universal**:
  * Reestructuración responsiva del layout principal, cabecera y barra de navegación (`Header`, `Navbar`, `App`).
  * Espaciados elásticos mediante funciones CSS `clamp()`.
  * Soporte de scroll táctil fluido (`cd-touch-scroll`) con indicadores visuales para tablas en dispositivos móviles y tabletas.
  * Reorganización en columna de los filtros y buscador en pantallas estrechas (< 768px).

---

## [1.1.0] - 29/10/2026 — *Optimizaciones de Rendimiento y Negocio* (Commit: `cca987e`)

### Añadido
* Migración de consultas SQL nativas sobre `CENTRALITV.PARAMETROS_ESTACIONES` a **Dapper con ODP.NET Thin**.
* Constantes de negocio de sociedades (`ATISAE` código `01`, `CAL` código `02`).
* Filtrado operativo de las 29 estaciones oficiales activas de TÜV SÜD.
* Componente vectorial corporativo del logotipo TÜV SÜD (`TuvSudLogo.tsx`).
* Soporte para conexión directa a Oracle `ORCLDV` por puerto TCP `1521` eliminando el doble salto SOAP.

---

## [1.0.0] - 29/10/2026 — *Inicialización del Proyecto Web* (Commit: `18a3f6f`)

### Añadido
* Andamiaje de Clean Architecture en .NET 10:
  * `CentralDatos.Domain`: Entidades base y reglas de negocio.
  * `CentralDatos.Application`: Casos de uso y DTOs.
  * `CentralDatos.Infrastructure`: Adaptadores de persistencia y configuración.
  * `CentralDatos.Api`: Minimal APIs y Swagger/OpenAPI.
* Proyecto Frontend en React 19 + TypeScript + Vite:
  * Integración del sistema de diseño corporativo **TÜV SÜD Algorithm Design System** (`@tuvsud/design-system`).
  * Configuración de tokens semánticos CSS y tipografía oficial `TUV SUD Pro`.
* Primer prototipo visual del monitor de estaciones ITV.

