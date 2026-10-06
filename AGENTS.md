# AGENTS.md — Codex

## Reglas de implementación
- Fuente de verdad: `docs/PRD.md` → `spec/` → `ux/`.
- TypeScript strict; no `any` salvo wrapper de SDK con justificación.
- Funciones del motor puras y testeables.
- Zod/JSON Schema en fronteras; no coerciones silenciosas.
- Componentes de UI no contienen reglas de negocio del score.
- Server-only para service role, Drive private key, Resend, Stripe y encryption key.
- No datos clínicos en analytics/logs; redactar Sentry.
- Cambios de esquema vía migración SQL versionada.
- Registrar cada decisión no textual en `DECISIONS.md`.
- Prohibido inventar requisitos, claims médicos, precios “validados” o thresholds locales.
- Comandos obligatorios antes de cerrar: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`.
- La paridad de `spec/test_vectors.json` es gate bloqueante.
- Mantener `MONETIZATION_MODE=validation` como default.
- No eliminar el preview gratuito para habilitar Stripe.
- Usar fixtures sintéticos; nunca PII real.
