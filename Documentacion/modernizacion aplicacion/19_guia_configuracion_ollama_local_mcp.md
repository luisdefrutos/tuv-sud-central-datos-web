# Guía de Configuración y Uso: Ollama Local + Antigravity MCP

Este documento detalla la arquitectura, configuración y operativa para conectar **Ollama en local** con **Antigravity IDE**, permitiendo tanto el trabajo híbrido (ahorro de tokens de Gemini) como el modo de contingencia total (cuando se agota la cuota).

---

## 1. Arquitectura y Componentes Configurados

1. **Modelo Local en Ollama**:
   - Modelo base: `qwen2.5-coder:7b` (4.7 GB).
   - Modelo personalizado: `qwen-antigravity:latest` configurado con ventana de contexto ampliada a **16.384 tokens** (`PARAMETER num_ctx 16384`) y `temperature 0.2` para máxima precisión en código.
   - Endpoint: `http://127.0.0.1:11434`.

2. **Puente MCP (`ollama-mcp`)**:
   - Paquete: `ollama-mcp` (instalado globalmente con Node.js / npm).
   - Registrado en `.agents/mcp_config.json` y `~/.gemini/config/mcp_config.json`.
   - Protocolo: Stdio MCP Server exponiendo herramientas directas (`ollama_chat`, `ollama_generate`, `ollama_list`, `ollama_show`).

---

## 2. Archivo de Configuración MCP (`mcp_config.json`)

Tanto en la raíz del workspace (`.agents/mcp_config.json`) como a nivel global (`C:\Users\Usuario\.gemini\config\mcp_config.json`):

```json
{
  "mcpServers": {
    "ollama": {
      "command": "npx",
      "args": ["-y", "ollama-mcp"],
      "env": {
        "OLLAMA_HOST": "http://127.0.0.1:11434"
      }
    }
  }
}
```

---

## 3. Cómo Usar Ambos Modelos: Cuándo y Cómo Preguntar

### Modo A: Delegación Inteligente / Ahorro (Gemini + Ollama)
Gemini actúa como **arquitecto y orquestador** (usando muy pocos tokens para leer contexto y planificar), mientras que el modelo local de Ollama genera el código voluminoso o repetitivo.

**Frases clave para activar Ollama en tus preguntas:**
- *"Usa el modelo local / ollama para generar los DTOs de este módulo."*
- *"Delega a Qwen en local las pruebas unitarias para este servicio."*
- *"Genera este mapping con ollama para ahorrar tokens."*
- *"Usa el modelo local para redactar las funciones de mapeo de este informe."*

**Tareas ideales para Ollama local (ahorro máximo):**
- Creación de DTOs y clases de datos extensas.
- Mappings repetitivos de datos entre entidades y DTOs.
- Pruebas unitarias (*unit tests*) y mocks de datos.
- Expresiones regulares complejas o funciones de formateo utilitarias.

**Tareas que debes dejar a Gemini:**
- Planificación arquitectónica multi-archivo.
- Diagnóstico de cuellos de botella complejos en Oracle SQL.
- Refactorizaciones transversales que tocan Frontend y Backend simultáneamente.
- Interacciones con el sistema de diseño `@tuvsud/design-system`.

---

## 4. Modo B: Contingencia si la Cuota de Gemini se Agota a Cero

Si te quedas sin cuota en el IDE de Google Cloud Code / Gemini:

1. **Terminal Integrada con OpenCode / Aider**:
   Puedes abrir una pestaña de PowerShell en el propio IDE y ejecutar OpenCode o Aider apuntando a tu modelo local:
   ```powershell
   opencode -m ollama/qwen-antigravity
   ```
2. **Consultas Directas por CLI de Ollama**:
   ```powershell
   ollama run qwen-antigravity "Explica cómo optimizar este índice en Oracle"
   ```

