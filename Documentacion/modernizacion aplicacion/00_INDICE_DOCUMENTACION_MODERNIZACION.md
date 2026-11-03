# Índice Maestro de Documentación — Modernización Web de Central Datos (TÜV SÜD)

> Esta carpeta (`c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\Documentacion\modernizacion aplicacion\`) centraliza y mantiene sincronizados **todos los documentos de análisis, arquitectura, auditoría SQL, estándares de diseño y configuración de entorno** del proyecto de modernización de *Central Datos*.

---

## Documentos Principales

| # | Documento | Contenido Principal |
| :-: | :--- | :--- |
| **00** | [../CHANGELOG.md](../CHANGELOG.md) | **Registro Histórico de Versiones**: Resumen cronológico de entregas, hitos de negocio, versiones desplegadas y cambios técnicos acumulados. |
| **01** | [analisis_y_estrategia_central_datos.md](./analisis_y_estrategia_central_datos.md) | Radiografía funcional del producto (código vivo vs. muerto, 4 dominios de negocio, bugs actuales), stack recomendado (**.NET 10 + React 19 + ODP.NET Thin**), hoja de ruta *Strangler Fig* en 5 fases y arquitectura global. |
| **02** | [auditoria_y_optimizacion_sql_oracle.md](./auditoria_y_optimizacion_sql_oracle.md) | Auditoría exhaustiva de las consultas SQL sobre Oracle `CENTRALITV` y `COMUN.PERSONA`, eliminación de *Hard Parsing* (`clsCur.vb`), índices recomendados, paginación nativa y reescritura parametrizada. |
| **03** | [modernizacion_web_services_y_arquitectura_api.md](./modernizacion_web_services_y_arquitectura_api.md) | Impacto del paso a Web sobre `centralitv.asmx` y `Login.asmx`: cómo el despliegue Web centralizado resuelve de raíz el problema de visibilidad `OCI`/`:1521` desde las estaciones ITV, eliminando el puente SOAP sin riesgo para aplicaciones desktop en coexistencia. |
| **04** | [estandar_tuv_sud_algorithm_design_system.md](./estandar_tuv_sud_algorithm_design_system.md) | Estándar oficial de UI/UX extraído de `create.tuvsud.com` (**TÜV SÜD Algorithm Design System**, `@tuvsud/design-system`), configuración del feed privado Azure DevOps, fuente `TUV SUD Pro`, tokens `--ts-semantic-*` y mapeo de los 84 componentes `Ts*`. |
| **05** | [guia_entorno_poc_y_mcp_base_datos.md](./guia_entorno_poc_y_mcp_base_datos.md) | Estructura del nuevo proyecto piloto aislado (`c:\Project\TUV-SUD-CENTRAL-DATOS-WEB`), guía de activación, requisitos cero-instalación y herramientas del servidor **MCP de Base de Datos (`central-datos-db`)**. |
| **06** | [tuv_sud_central_datos_prototipo.html](./tuv_sud_central_datos_prototipo.html) | Prototipo visual interactivo HTML de las vistas principales de la nueva aplicación Web con estética corporativa TÜV SÜD (abrible directamente en Edge/Chrome). |
| **07** | [modulo_ultimos_datos_centralizados.md](./modulo_ultimos_datos_centralizados.md) | Especificación del primer caso de uso vertical implementado: Monitor de Últimos Datos Centralizados (sustituto moderno de `frmUltimaInspeccion.vb`). |
| **08** | [modulo_autenticacion_y_login.md](./modulo_autenticacion_y_login.md) | Especificación completa del sistema de autenticación y login: diagrama de flujo Mermaid de las 5 casuísticas, análisis de `frmLogin.vb` vs `frmLogin_Obsoleto.vb`, soporte de usuarios propios sin LPAD y arquitectura Clean .NET 10 + React 19. |
| **09** | [guia_pruebas_login_y_casuisticas.md](./guia_pruebas_login_y_casuisticas.md) | Guía práctica de pruebas de autenticación para entornos locales y máquinas virtuales fuera de dominio AD, con credenciales verificadas y consultas de auditoría. |
| **10** | [10_arquitectura_logging_auditoria_y_seguridad_pentest.md](./10_arquitectura_logging_auditoria_y_seguridad_pentest.md) | Arquitectura híbrida de logging (Oracle vs. Serilog en disco), diferenciación entre `LOG_ACCESOS_MODULOS` y `LOG_AUDITORIA_WEB`, rotación de ficheros `.log`, tratamiento exclusivo de errores Oracle y blindaje frente a Pentest (OWASP CWE-209 / CWE-203). |
| **11** | [11_persistencia_f5_logging_sql_y_tramos_duracion.md](./11_persistencia_f5_logging_sql_y_tramos_duracion.md) | **Persistencia F5, Logging SQL y Tramos de Agilidad**: Diagnóstico de redirección 307 vs. token JWT, sincronización de vista en URL y `sessionStorage`, trazabilidad de SQL resuelta con parámetros en Serilog y especificación del gráfico Donut de agilidad operativa. |
| **13** | [13_plan_siguientes_pasos_informes.md](./13_plan_siguientes_pasos_informes.md) | **Plan de Siguientes Pasos de Informes**: Estándar de Informe (17 puntos), base común y unificación de los 4 informes existentes, exportaciones sin saturar el servidor (limitador de concurrencia + streaming SpreadCheetah) y orden de los 8 nuevos informes de `frmCriterios`. |
| **14** | [borrador_skill_informes_central_datos.md](./borrador_skill_informes_central_datos.md) | **Estándar y Skill Oficial de Informes**: Patrón arquitectónico "Thick Server / Thin Client", doble validación de fechas (máximo 1 año / 366 días), inicialización de fechas fiel a la app de escritorio, hover corporativo `#edf5ff`, modal bloqueante y protección opcional de concurrencia. |
| **12** | [12_modulo_informe_inspecciones_defecto_obd.md](./12_modulo_informe_inspecciones_defecto_obd.md) | **Informe de Inspecciones con Defecto OBD**: Digitalización técnica del Bloque 15 (Emisiones OBD Diésel y Gasolina), consulta CTE indexada, doble validación (366 días), KPIs ejecutivos, gráficos SVG interactivos con `AppTooltip`, modal de ficha técnica y exportación oficial CSV/Excel. |
| **15** | [15_modulo_informe_inspecciones_sin_inspector.md](./15_modulo_informe_inspecciones_sin_inspector.md) | **Informe de Inspecciones sin Inspector**: Auditoría técnica de inspecciones sin inspector asignado, optimización SQL para rangos anuales (de 20,2 s a 2,3 s), 4 KPIs permanentes, selector dual de gráficos (Barras y Donut) y exportación Excel multi-pestaña por estación fiel a la app de escritorio. |
| **16** | [16_modulo_informe_inspecciones_cupon_descuento.md](./16_modulo_informe_inspecciones_cupon_descuento.md) | **Informe de Inspecciones con Cupón Descuento**: Control y liquidación de cupones promocionales aplicados, consulta Oracle optimizada (165 ms individual, 3,8 s red completa de 11k filas), desglose de descuento e importe abonado, KPIs financieros, gráficos de barras/donut y exportación Excel multi-pestaña fiel al legacy. |

---

## Referencias Técnicas del Skill `tuv-sud-algorithm-ds`

Copia sincronizada de las especificaciones del Skill oficial para Antigravity:

- [skill-tuv-sud-algorithm-ds/SKILL.md](./skill-tuv-sud-algorithm-ds/SKILL.md) — Reglas de implementación frontend para agentes y desarrolladores.
- [skill-tuv-sud-algorithm-ds/references/tokens-and-utilities.md](./skill-tuv-sud-algorithm-ds/references/tokens-and-utilities.md) — Referencia completa de tokens semánticos CSS y utilidades `ts-*`.
- [skill-tuv-sud-algorithm-ds/references/components-catalog.md](./skill-tuv-sud-algorithm-ds/references/components-catalog.md) — Catálogo detallado de los 84 componentes oficiales `@tuvsud/design-system/react`.
