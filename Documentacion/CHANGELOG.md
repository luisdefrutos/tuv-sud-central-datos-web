# Registro Histórico de Cambios (Changelog)

Todas las modificaciones notables de este proyecto se documentan en este archivo siguiendo el estándar [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y versionado semántico.

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

