# Reglas del Workspace — TÜV SÜD Central Datos Web (`TUV-SUD-CENTRAL-DATOS-WEB`)

## 1. Sincronización Obligatoria de Documentación
- **TODOS** los documentos técnicos, artefactos `.md`, guías de arquitectura, manuales de configuración o prototipos `.html` que se creen o actualicen durante el proyecto **deben copiarse y actualizarse siempre en el mismo turno** dentro de:
  `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\Documentacion\modernizacion aplicacion\`
- Mantener actualizado el índice `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB\Documentacion\modernizacion aplicacion\00_INDICE_DOCUMENTACION_MODERNIZACION.md` cuando se añada un nuevo documento.

## 2. Aislamiento Estricto respecto al Proyecto Legacy
- El proyecto legacy `c:\Project\ITV-CENTRAL_DATOS` no debe contener ningún código nuevo ni documentación de la modernización. Todo reside exclusivamente en `c:\Project\TUV-SUD-CENTRAL-DATOS-WEB`.

## 3. Estándar Visual Obligatorio (`tuv-sud-algorithm-ds`)
- Toda interfaz de usuario debe seguir el **TÜV SÜD Algorithm Design System** (`@tuvsud/design-system`, tokens `--ts-semantic-*`, fuente `'TUV SUD Pro'`), activando siempre el skill `.agents/skills/tuv-sud-algorithm-ds/SKILL.md`.

## 4. Prohibición de Auto-Commit
- Prohibido ejecutar `git commit` o `svn commit` salvo instrucción explícita e inequívoca del usuario.
