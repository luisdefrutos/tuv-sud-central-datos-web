# Módulo de Autenticación, Roles, Permisos y Auditoría — Modernización Web Central Datos

> **Documento:** Especificación Técnica y Funcional del Sistema de Autenticación, Matriz de Roles, Auditoría y Seguridad  
> **Ubicación:** `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\Documentacion\modernizacion aplicacion\modulo_autenticacion_y_login.md`  
> **Estado:** Aprobado para Implementación  
> **Aplicación Legacy de Referencia:** `ITV-CENTRAL_DATOS` (`frmLogin.vb`, `modMain.vb`, `modGeneral.vb`, `frmGestionUserInterno.vb`, `frmCambiarPassInterno.vb`, `frmPermisosEmpleado.vb`)  
> **Plataforma Objetivo:** .NET 10 (Clean Architecture Minimal APIs + JWT) + React 19 + TypeScript + Vite + `@tuvsud/design-system`  

---

## 1. Resumen Ejecutivo

Este documento define la arquitectura integral de seguridad, autenticación, control de accesos basado en roles (RBAC), gestión de permisos por estación ITV y auditoría de accesos para la aplicación web **Central Datos** de TÜV SÜD.

El sistema modernizado convive con el modelo de base de datos Oracle (`CENTRALITV`), unificando:
1. El acceso de cuentas corporativas **Active Directory (AD)** mediante Web Service SOAP / SSO.
2. El acceso de **usuarios propios e internos de planta** (códigos como `001`, `0001`, `409`, `80` o números de DNI) sin alteraciones artificiales de formato (`LPAD`).
3. La cuenta de sistema de emergencia **`SUPERVISOR`** con clave **`perfido`** (mantenida por compatibilidad técnica).
4. La capacidad de asignar perfil y privilegios de **Supervisor** a cualquier empleado sin obligarle a usar la cuenta genérica.
5. El registro de auditoría de sesiones, tiempos de permanencia y navegación de menús.

---

## 2. Diagrama de Flujo del Proceso de Autenticación

```mermaid
flowchart TD
    A([Inicio: Usuario introduce credenciales]) --> B{¿El usuario contiene ':' ?}
    
    %% Casuística 1: Suplantación
    B -- Sí --> C["CASO 1: Suplantación de Identidad<br/>(SupervisorSuplantador : UsuarioSuplantado)"]
    C --> C1["Validar SHA256(Supervisor) == pSC_Hash_Supervisor<br/>y SHA256(Pass.ToUpper) == pSC_Clave_Supervisor"]
    C1 --> C2{¿Clave Supervisor Válida?}
    C2 -- No --> ERR1["Error: Credenciales de supervisor incorrectas"]
    C2 -- Sí --> C3["Verificar existencia de UsuarioSuplantado<br/>en COMUN.PERSONA / CENTRALITV.EMPLEADO"]
    C3 --> C4{¿Usuario existe y único?}
    C4 -- No --> ERR2["Error: Usuario suplantado no existe o duplicado"]
    C4 -- Sí --> OK1["Acceso Concedido como UsuarioSuplantado<br/>(Registrar Auditoría: Suplantación)"]

    %% Casuística 2: Supervisor directo de sistema (SUPERVISOR / perfido)
    B -- No --> D{¿Es SUPERVISOR de Sistema?<br/>(SHA-256 en SYS_CONFIGURACION)}
    D -- Sí --> D1["CASO 2: Cuenta de Sistema SUPERVISOR<br/>SHA256(txtUser) == Hash_Supervisor<br/>SHA256(txtPassword.ToUpper) == Clave_Supervisor"]
    D1 --> D2{¿Clave Válida?}
    D2 -- No --> ERR3["Error: Acceso supervisor denegado"]
    D2 -- Sí --> OK2["Acceso Concedido como SUPERVISOR (Sistema)<br/>(Rol global TIPO_USUARIO_SUPERVISOR = 2)"]

    %% Casuística 3: Single Sign-On (Windows)
    D -- No --> E{¿Modo SSO / Windows activado?}
    E -- Sí --> E1["CASO 3: Single Sign-On (SSO)<br/>Validar dominio ww001.itgr.net"]
    E1 --> E2["Consultar CENTRALITV.EMPLEADO<br/>WHERE Usuario_Login_AD = :user AND De_Baja = 0"]
    E2 --> E3{¿Empleado activo existe?}
    E3 -- No --> ERR4["Error: Usuario AD no dado de alta en CENTRALITV"]
    E3 -- Sí --> OK3["Acceso Concedido vía SSO (Sin contraseña)"]

    %% Casuística 4 y 5: Usuario Interno/Planta vs Usuario AD
    E -- No --> F{¿Existe como Usuario Propio / Interno?<br/>(Coincidencia exacta sin LPAD)}
    
    F -- Sí --> G["CASO 4: Usuario Propio / Interno de Planta<br/>(001, DNI, inspectores sin cuenta AD)"]
    G --> G1["Verificar Pass_Interno (SHA-256) en CENTRALITV.EMPLEADO<br/>o Password en ITV.SYS_USUARIO"]
    G1 --> G2{¿Contraseña correcta?}
    G2 -- No --> ERR5["Error: Contraseña de usuario interno errónea"]
    G2 -- Sí --> OK4["Acceso Concedido como Usuario Interno/Planta"]

    F -- No --> H["CASO 5: Directorio Activo Microsoft (AD)"]
    H --> H1["Invocar WebService LoginLDAP_AD<br/>con Passport MD5(user + 'HELKFN23AJURJSK2D')"]
    H1 --> H2{¿Resultado retLDAP?}
    H2 -- USUARIO_NO_EXISTE --> ERR6["Aviso: El usuario introducido no es AD válido"]
    H2 -- CONTRASENNA_INCORRECTA --> ERR7["Aviso: La contraseña es incorrecta"]
    H2 -- USUARIO_DESHABILITADO --> ERR8["Aviso: El usuario AD está deshabilitado"]
    H2 -- OK --> H3["Verificar CENTRALITV.EMPLEADO<br/>WHERE Usuario_Login_AD = :user AND De_Baja = 0"]
    H3 --> H4{¿Alta en Central ITV?}
    H4 -- No --> ERR9["Aviso: El usuario no está dado de alta en Central ITV"]
    H4 -- Sí --> OK5["Acceso Concedido como Usuario AD"]

    %% Evaluación de Rol y Emisión de Token
    OK1 --> RES_ROL["Evaluar Nivel de Rol:<br/>1. ¿Es SUPERVISOR de Sistema?<br/>2. ¿EMPLEADO.Es_Supervisor == -1?<br/>3. ¿Tiene SUPERVISOR_PERMISOS?<br/>-> Asignar Rol y Estaciones"]
    OK2 --> RES_ROL
    OK3 --> RES_ROL
    OK4 --> RES_ROL
    OK5 --> RES_ROL

    RES_ROL --> AUD["Registrar en Auditoría (LOG_ACCESOS_MODULOS)<br/>- Id_Acceso / FechaProceso_Inicio<br/>- CodUsuario / Terminal IP"]
    AUD --> JWT["Generar Token JWT con Claims:<br/>- sub (IdEmpleado / IdPersona)<br/>- name, usuario<br/>- role (Supervisor / Responsable / Operador)<br/>- estacionesPermitidas (Array de CodEstacion)"]
    JWT --> FIN([Fin: Redirección al Dashboard con Navbar adaptativo])
```

---

## 3. La Cuenta de Sistema `SUPERVISOR` y Contraseña `perfido`

En el sistema legacy y en la base de datos Oracle (`CENTRALITV.SYS_CONFIGURACION`):
- `HASH_SUPERVISOR`: `14f7c397bce3ea23092a9d49e3ee1b6bbb6565d680ccabebf3e5ee14261b3734` (`SHA-256("SUPERVISOR")`).
- `CLAVE_SUPERVISOR`: `bfa768529e421b58a305922ae4fb963c93dd9a82a123a6648307f0dadd6894ba` (`SHA-256("PERFIDO")`).

### Características técnicas:
1. **Cuenta Break-Glass de Emergencia**: No está vinculada a ninguna persona física en `CENTRALITV.EMPLEADO` (establece `Id_Persona_Comun = 0`).
2. **Bypass Universal**: Asigna `pintTipo_Usuario = TIPO_USUARIO_SUPERVISOR` (valor `2`). En `modGeneral.vb` y `clsGeneral.vb`, las funciones `Verificar_Acceso_Ambito` omiten la consulta a `EMPLEADO_PERMISOS` y conceden acceso irrestricto a las 29 estaciones ITV y a todos los menús.
3. **Mantenimiento en la Solución Web**: Se mantiene totalmente operativa para garantizar soporte técnico de nivel 3 y compatibilidad con el procedimiento de contingencia corporativo.

---

## 4. Matriz de Roles: Qué Puede Hacer Cada Rol

| Rol | Identificación / Origen | Alcance de Estaciones | Capacidades Funcionales |
| :--- | :--- | :---: | :--- |
| **SUPERVISOR GLOBAL** | 1. Cuenta `SUPERVISOR` / `perfido`<br/>2. Empleado con `ES_SUPERVISOR = -1`<br/>3. Permiso `SUPERVISOR_PERMISOS` en todas las estaciones | **Todas (29 estaciones)** | - Bypass completo de seguridad.<br/>- Alta, modificación y baja de empleados y usuarios internos.<br/>- Asignación y revocación de permisos por estación.<br/>- Acceso a todas las inspecciones, facturación, expedientes, cruces DGT y mediciones.<br/>- Capacidad de suplantación de identidad para diagnóstico.<br/>- Consulta de logs y auditoría global. |
| **RESPONSABLE DE ZONA / PERMISOS** | Empleado con `SUPERVISOR_PERMISOS` asignado en `EMPLEADO_PERMISOS` para un conjunto de estaciones | **Estaciones autorizadas** (p. ej. zona Madrid, Castilla y León) | - Gestión de turnos y personal de sus centros.<br/>- Asignación de permisos ordinarios a inspectores de su ámbito.<br/>- Monitorización de últimas inspecciones de sus centros.<br/>- Informes operativos y control de calidad de línea. |
| **GESTIÓN Y ADMINISTRACIÓN** | Empleados con permisos `CENTRAL_GENERAL`, `ADM`, `CONT`, `GER` | **Estaciones autorizadas** en `EMPLEADO_CENTRO` | - Consulta de facturación y contabilidad.<br/>- Informes de gerencia y estadísticas de rendimiento.<br/>- Localización de inspecciones y gestión de rechazos.<br/>- Envío de cartas recordatorias y SMS. |
| **OPERADOR / INSPECTOR DE PLANTA** | Usuarios internos (`001`, `0001`, etc.) o inspectores con permisos `PLA`, `PLA_SUP`, `CAB` | **Estación local asignada** | - Consulta de mediciones de línea (frenómetro, opacímetro, banco de suspensiones).<br/>- Consulta de fotografías de inspección (`APPFOTOS_MOVIL`).<br/>- Visualización de últimos datos recibidos en central para su estación. |

---

## 5. Procedimiento para Crear y Asignar Roles de Supervisor

Para evitar que múltiples técnicos compartan la contraseña genérica `perfido`, el sistema permite crear usuarios nominativos con rol de Supervisor mediante dos vías:

### Vía A: Asignar Supervisor Global a un Empleado (`ES_SUPERVISOR = -1`)
En la tabla `CENTRALITV.EMPLEADO`:
```sql
UPDATE CENTRALITV.EMPLEADO
SET ES_SUPERVISOR = -1
WHERE Usuario_Login_AD = 'MARTI-AI'; -- O WHERE Usuario_Login_Interno = '001'
COMMIT;
```
* **Efecto Inmediato**: Al iniciar sesión con su propio usuario y contraseña (vía Active Directory o usuario interno), el backend detecta `ES_SUPERVISOR = -1` y emite el token JWT con el rol `Supervisor`, otorgándole acceso idéntico al usuario `SUPERVISOR` pero con **trazabilidad nominal**.

### Vía B: Asignación de Permisos de Supervisión por Estación
En la tabla `CENTRALITV.EMPLEADO_PERMISOS`:
```sql
-- Conceder supervisión sobre la estación 0202
INSERT INTO CENTRALITV.EMPLEADO_PERMISOS (Id_Empleado, CodEstacion, CodPermiso, Activo, Valor)
VALUES (1, '0202', 'SUPERVISOR_PERMISOS', -1, 'SI');
COMMIT;
```

### Vía C: Creación de Nuevos Tipos de Permisos en el Catálogo
La tabla `CENTRALITV.TIPOS_PERMISOS` define los permisos del sistema:
- `CODPERMISO`: Código identificador único (hasta 40 caracteres, ej. `AUDITORIA_AVANZADA`).
- `DESPERMISO`: Descripción legible en la interfaz (ej. `CONSULTA DE AUDITORÍA Y TRAZABILIDAD`).
- `VISIBLE_SUPERVISOR`: `-1` (visible solo para supervisores) o `0`.
- `VISIBLE_USUARIOS`: `-1` (visible para responsables de estación) o `0`.

---

## 6. Sistema de Auditoría y Trazabilidad

Para registrar qué usuarios acceden, qué menús consultan, qué acciones ejecutan y cuánto tiempo permanecen en la aplicación:

### Tabla Existente en Oracle: `CENTRALITV.LOG_ACCESOS_MODULOS`
La base de datos ya cuenta con una tabla de accesos en producción con la siguiente estructura:
- `ID_ACCESO` (NUMBER): Secuencia numérica del acceso.
- `MODULO` (VARCHAR2(25)): Identificador del módulo (`CENTRAL DATOS WEB`).
- `VERSION_MODULO` (VARCHAR2(25)): Versión de la aplicación web (ej. `2.05.0`).
- `FECHAPROCESO_INICIO` (DATE): Timestamp exacto de inicio de sesión.
- `FECHAPROCESO_FIN` (DATE): Timestamp de cierre de sesión o expiración del token.
- `TERMINAL` (VARCHAR2(25)): Dirección IP o identificador del equipo cliente.
- `CODUSUARIO` (VARCHAR2(50)): Nombre del usuario conectado (ej. `MARTI-AI` o `001`).

### Ampliación para Trazabilidad Fina Web: `CENTRALITV.LOG_AUDITORIA_WEB`
Para registrar acciones dentro de la aplicación (navegación por menús, exportaciones a Excel, cambios de permisos, tiempos de respuesta):

> [!TIP]
> **Script SQL listo para ejecutar en Oracle**:  
> Se encuentra disponible en [`database/scripts/crear_tabla_auditoria_web.sql`](file:///c:/Project/TUV-SUD-CENTRAL-DATOS-WEB/database/scripts/crear_tabla_auditoria_web.sql). Incluye creación de secuencia, tabla, trigger de autoincremento, índices de alto rendimiento y comentarios de diccionario de datos.

```sql
CREATE TABLE CENTRALITV.LOG_AUDITORIA_WEB (
    ID_LOG NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    FECHA_HORA TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ID_EMPLEADO NUMBER,
    COD_USUARIO VARCHAR2(50) NOT NULL,
    ROL VARCHAR2(30) NOT NULL,
    ACCION VARCHAR2(50) NOT NULL,        -- 'LOGIN', 'LOGOUT', 'NAVEGACION', 'EXPORT_EXCEL', 'MODIFICA_PERMISO'
    RUTA_MENU VARCHAR2(150),             -- '/estaciones/ultimos-datos', '/empleados/permisos'
    CODESTACION VARCHAR2(10),            -- Estación filtrada o afectada
    IP_ORIGEN VARCHAR2(45),
    USER_AGENT VARCHAR2(250),
    DURACION_MS NUMBER,                  -- Tiempo de respuesta o permanencia
    DETALLE VARCHAR2(500)
);

CREATE INDEX IX_AUDITORIA_FECHA ON CENTRALITV.LOG_AUDITORIA_WEB(FECHA_HORA);
CREATE INDEX IX_AUDITORIA_USUARIO ON CENTRALITV.LOG_AUDITORIA_WEB(COD_USUARIO);
```

---

## 7. Control de Versiones

| Versión | Fecha | Autor | Cambios Principales |
| :---: | :---: | :---: | :--- |
| **1.0** | 29/10/2026 | Equipo de Modernización | Diagrama Mermaid de 5 casuísticas y clarificación de códigos sin LPAD. |
| **1.1** | 29/10/2026 | Equipo de Modernización | Especificación detallada del usuario `SUPERVISOR` / `perfido`, matriz de roles, procedimiento para crear nuevos supervisores nominales y diseño del sistema de auditoría (`LOG_ACCESOS_MODULOS` / `LOG_AUDITORIA_WEB`). |
