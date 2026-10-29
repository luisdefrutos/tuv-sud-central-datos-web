# Guía de Pruebas de Login y Casuísticas de Autenticación

> **Ubicación:** `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\Documentacion\modernizacion aplicacion\guia_pruebas_login_y_casuisticas.md`  
> **Entorno:** Desarrollo Local / Máquina Virtual fuera de Directorio Activo  
> **Base de Datos:** Oracle Desarrollo (`ORCLDV`)  
> **Fecha:** 29/10/2026  

---

## 1. Contexto Especial: Máquinas Virtuales Fuera de Directorio Activo

Si estás trabajando en una **máquina virtual de desarrollo que no está unida al dominio corporativo de Windows (`ww001.itgr.net`)**, debes tener en cuenta lo siguiente:

| Mecanismo de Acceso | ¿Funciona en VM fuera de dominio? | Explicación Técnica |
| :--- | :---: | :--- |
| **Cuenta `SUPERVISOR` (clave `perfido`)** | **SÍ (100%)** | Valida directamente contra la tabla `CENTRALITV.SYS_CONFIGURACION` en Oracle. No realiza llamadas de red ni depende de Windows AD. |
| **Puestos de Planta (`0001`, `0525`, etc.)** | **SÍ (100%)** | Valida directamente contra la tabla `ITV.SYS_USUARIO` en Oracle. |
| **Suplantación (`SUPERVISOR:<Usuario>`)** | **SÍ (100%)** | Valida la contraseña del supervisor y carga el contexto del usuario suplantado desde `CENTRALITV.EMPLEADO`. Permite probar perfiles de empleados reales sin conocer su contraseña de red. |
| **Casilla Windows SSO (Simulación)** | **SÍ (100%)** | Al marcar la casilla "Usar usuario de sesión Windows", el backend comprueba la existencia del empleado en `CENTRALITV.EMPLEADO` y permite el acceso inmediato para facilitar pruebas locales sin requerir contraseña. |
| **Directorio Activo Corporativo (LDAP)** | **SÍ** *(con tu usuario propio)* | La máquina virtual tiene conectividad HTTPS contra `https://gestion-desa.atisae.com/loginwebservice/login.asmx`. Funcionará si introduces tus propias credenciales personales reales de TÜV SÜD. No funcionará con usuarios de terceros si desconoces su contraseña corporativa. |

---

## 2. Batería de Pruebas Rápidas para Local

### Prueba 1: Superusuario del Sistema (Bypass Global 29 Estaciones)
* **Usuario:** `SUPERVISOR`
* **Contraseña:** `perfido` *(indiferente mayúsculas o minúsculas)*
* **Casilla SSO:** Desmarcada
* **Resultado:**
  - Acceso inmediato con rol **`Supervisor`** (badge amarillo).
  - Nombre en cabecera: **SUPERVISOR DEL SISTEMA**.
  - Acceso irrestricto al monitor de las 29 estaciones.

---

### Prueba 2: Usuario Propio / Operario de Planta (Tabla `ITV.SYS_USUARIO`)
Permite verificar el acceso de inspectores y operadores de línea sin cuenta corporativa AD:

| Caso | Usuario a introducir | Contraseña | Rol Obtenido | Nombre en Pantalla |
| :-: | :---: | :---: | :---: | :--- |
| **A** | `0001` | `0001` | `Operador` | Usuario Local 0001 |
| **B** | `0525` | `0525` | `Operador` | Usuario Local 0525 |
| **C** | `0149` | `0149` | `Operador` | Usuario Local 0149 |
| **D** | `0280` | `0280` | `Operador` | Usuario Local 0280 |
| **E** | `9999` | `7777` | `Operador` | Usuario Local 9999 |

---

### Prueba 3: Probar Perfiles de Empleados Reales mediante Suplantación
Ideal para probar qué ve un responsable o un técnico sin pedirle su contraseña personal:

* **Para probar como Responsable con permisos en 29 estaciones:**
  - **Usuario:** `SUPERVISOR:MARTI-AI`
  - **Contraseña:** `perfido`
  - **Resultado:** Entra con el perfil de **ANA ISABEL MARTI MARZAL (Suplantado)** y rol **`Responsable`**.

* **Para probar como Técnico Central:**
  - **Usuario:** `SUPERVISOR:TEJAD-OS`
  - **Contraseña:** `perfido`
  - **Resultado:** Entra con el perfil de **OSCAR TEJADA ESPINOSA (Suplantado)**.

* **Para probar como Gestión Central:**
  - **Usuario:** `SUPERVISOR:JIMEN-EV`
  - **Contraseña:** `perfido`
  - **Resultado:** Entra con el perfil de **EVA MARIA JIMENO DE SANJUAN (Suplantado)**.

---

### Prueba 4: Probar Mediante Casilla SSO
* **Usuario:** Cualquier usuario AD de `CENTRALITV.EMPLEADO` (ej. `MARTI-AI`, `TEJAD-OS`, `RODRI-MI`, `PORTI-JU`).
* **Casilla SSO:** **MARCADA ☑** *(la contraseña se deshabilita automáticamente)*.
* **Resultado:** El backend verifica que el empleado esté de alta en Oracle (`De_Baja = 0`) y le concede acceso directo sin solicitar contraseña.

---

### Prueba 5: Pruebas Negativas y Validaciones de Seguridad
1. **Contraseña incorrecta:** Usuario `SUPERVISOR` y contraseña `erronea123`.  
   ➔ Muestra alerta roja corporativa: *"Credenciales no válidas"*.
2. **Usuario en blanco:** Pulsar "Iniciar Sesión" sin escribir nada.  
   ➔ Validación en frontend: *"Debe introducir un nombre de usuario o código."*.
3. **Usuario inexistente:** Usuario `USUARIO_FALSO` y contraseña `cualquiera`.  
   ➔ El sistema deniega el acceso y registra el intento fallido.

---

## 3. Instrucciones de Ejecución en Local

### Paso 1: Arrancar el Backend API (.NET 10)
En una terminal PowerShell:
```powershell
dotnet run --project "c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\src\CentralDatos.Api"
```
*API disponible en:* `http://localhost:5113`  
*Swagger interactivo en:* `http://localhost:5113/swagger`

### Paso 2: Arrancar el Frontend Web (React 19 + Vite)
En una segunda terminal:
```powershell
npm --prefix "c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\src\central-datos-web" run dev
```
*Aplicación Web disponible en:* `http://localhost:5173`

---

## 4. Comprobación de Auditoría en Oracle

Cada vez que inicias sesión, cierras sesión o navegas por la aplicación, puedes comprobar los registros en Oracle:

```sql
-- 1. Ver las sesiones registradas en la tabla oficial:
SELECT ID_ACCESO, MODULO, VERSION_MODULO, FECHAPROCESO_INICIO, FECHAPROCESO_FIN, TERMINAL, CODUSUARIO
FROM CENTRALITV.LOG_ACCESOS_MODULOS
ORDER BY ID_ACCESO DESC
FETCH FIRST 10 ROWS ONLY;

-- 2. Si has ejecutado el script crear_tabla_auditoria_web.sql:
SELECT ID_LOG, FECHA_HORA, COD_USUARIO, ROL, ACCION, RUTA_MENU, DURACION_MS, DETALLES
FROM CENTRALITV.LOG_AUDITORIA_WEB
ORDER BY ID_LOG DESC
FETCH FIRST 20 ROWS ONLY;
```

