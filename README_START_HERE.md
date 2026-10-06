# README_START_HERE — BUILD GlucoPredict v4

Estado: **READY_TO_BUILD**.

Este paquete está preparado para un LLM programador. No reinventar producto, motor, copy ni contratos: implementar los artefactos normativos.

## Orden de lectura
1. `BUILD_PROMPT.md`
2. `docs/PRD.md`
3. `TASKS.md`
4. `AGENTS.md` o `CLAUDE.md`
5. `spec/test_vectors.json` + `model/engine_reference.py`
6. `spec/openapi.yaml` + `spec/db_schema.sql`
7. `ux/ux_spec.md` + `ux/prototype.html`
8. `docs/ACCEPTANCE_TESTS.md`
9. `docs/DRIVE_SETUP.md`
10. `docs/LAUNCH_CHECKLIST.md`

## Reglas
- `MONETIZATION_MODE=validation` inicialmente.
- Score/banda/CTA de seguridad antes del gate.
- Motor TypeScript determinista con paridad exacta.
- No probabilidad personal ni diagnóstico.
- No enviar respuestas clínicas/email a analytics.
- Toda persistencia sensible ocurre server-side.
- Registrar decisiones de implementación en `DECISIONS.md`.
- No hacer preguntas si la respuesta ya está en el paquete; si hay conflicto, priorizar: `docs/PRD.md` → `spec/` → `ux/` → fuentes previas y documentar la resolución.

## Validación ya ejecutada
- Etapa 3: PASS_WITH_FIXES aceptado.
- Reference engine: 29/29 válidos.
- Invalid contract: 9/9.
- JSON: válidos.
- Drive manifest: todos los archivos y hashes coinciden.

`source_stage3/` preserva el paquete recibido y el ZIP original para trazabilidad; no es fuente normativa de build cuando exista una versión normalizada en raíz.
