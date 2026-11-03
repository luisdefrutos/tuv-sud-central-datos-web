---
name: gemini-token-saver
description: Enforces strict token-saving rules, minimal context reads, surgical diffs, and concise Spanish responses for all Gemini models in Antigravity IDE.
---

# CRITICAL LANGUAGE RULE (REGLA DE IDIOMA OBLIGATORIA)
- **RESPONDE SIEMPRE EN ESPAÑOL**: Aunque estas reglas y el código estén en inglés, TODA tu comunicación, explicaciones y preguntas con el usuario DEBEN ser exclusivamente en español. Prohibido responder en inglés.

# Gemini Token Efficiency Protocol

## 1. Context & File Reading (Input Optimization)
- **Zero Blind Reads**: NEVER read a full file over 150 lines.
- **Search First**: Use `grep` / symbol search to find exact lines before reading.
- **Ranged Reads**: Read only target methods or line ranges (`±30 lines`).
- **No Redundant Reads**: Do not re-read files already in the current turn context.
- **Ignore Heavy Files**: NEVER read `package-lock.json`, `*.Designer.cs`, `*.g.cs`, migration snapshots, or minified files (`*.min.js`, `*.map`) unless explicitly asked.
- **Filtered Command Outputs**: Pipe or limit shell outputs (`Select-Object -First 30`, `findstr`, etc.) to avoid dumping thousands of lines into context.

## 2. Code Output & Editing (Output Optimization)
- **Surgical Edits Only**: Always use diff / search-and-replace tools over full-file rewrites.
- **No Unchanged Code**: In chat, show ONLY modified blocks with 2-3 context lines. Never echo full unchanged classes.
- **Zero Boilerplate**: Omit standard `using`/`import` statements unless adding new dependencies.
- **No Obvious Comments**: Do not add comments explaining basic code changes.

## 3. Communication & Reasoning (Turn Optimization)
- **Direct Output**: Empieza directamente con la solución, el diff o la causa raíz.
- **Ban Filler**: Sin saludos, sin introducciones ("Claro, aquí tienes..."), ni resúmenes de lo que acabas de hacer.
- **Telegraphic Style**: Explicaciones de máximo 2-3 frases salvo que se pida detalle arquitectónico.
- **Batch Tool Calls**: Run independent searches, reads, or commands in a single parallel turn to avoid multi-turn context growth.

## 4. Safeguards
- Never sacrifice type safety, null checks, or error handling to save tokens.
- If a prompt is ambiguous and risks a wrong multi-file edit, ask 1 concise question in Spanish BEFORE coding.

## 5. Local LLM Delegation (Ollama MCP)
- **Model local disponible**: `qwen-antigravity:latest` (o `qwen2.5-coder:7b`) a través del MCP `ollama`.
- **Cuándo delegar a Ollama**:
  1. Si el usuario pide explícitamente "usa ollama", "con el modelo local", "delega a qwen" o "modo ahorro".
  2. Para generar código repetitivo pesado (DTOs extensos, mappings manuales, mocks de test, fixtures de datos, regex complejas).
- **Cómo delegar**: Ejecutar la herramienta MCP `ollama_chat` con `model: "qwen-antigravity:latest"`, obtener el resultado y aplicarlo al archivo con la herramienta de edición correspondiente.


