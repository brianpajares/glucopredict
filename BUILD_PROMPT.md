# BUILD_PROMPT — GlucoPredict

Actúa como Staff Engineer de producto. Construye un MVP desplegable de GlucoPredict a partir de este repositorio, sin pedir aclaraciones y sin inventar requisitos.

## Objetivo
Entregar una app Next.js App Router + TypeScript strict lista para Vercel (portable a Netlify) que implemente `docs/PRD.md`, lea parámetros canónicos desde Google Drive, calcule el score con paridad 100%, capture leads en modo validation, genere PDF, envíe emails y exponga `/admin`.

## Orden obligatorio
1. Lee `docs/PRD.md`, `spec/`, `ux/` y `docs/ACCEPTANCE_TESTS.md`.
2. Implementa M0→M5 de `TASKS.md`.
3. Porta `model/engine_reference.py` a TypeScript sin cambiar semántica.
4. Haz pasar `spec/test_vectors.json` antes de conectar UI.
5. Implementa Drive loader/checksum/cache/fallback.
6. Implementa UX ES/EN/PT.
7. Implementa Supabase/RLS, lead/report, PDF, Resend y admin.
8. Implementa seguridad/analytics/observabilidad.
9. Mantén Stripe detrás de `MONETIZATION_MODE`.
10. Ejecuta toda la Definition of Done y registra decisiones en `DECISIONS.md`.

## Stack no negociable
Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Route Handlers, Supabase Postgres RLS, Google Drive service account, Resend, @react-pdf/renderer, next-intl, PostHog, Sentry, Turnstile, Vitest, Playwright, GitHub Actions. Vercel principal; Netlify alternativa.

## Reglas críticas
- No uses LLM en el cálculo.
- No dupliques reglas del score en React.
- No conviertas referencias históricas en probabilidad personal.
- No diagnostiques ni recomiendes medicación.
- No persistas inputs clínicos en localStorage.
- No envíes email/respuestas clínicas a PostHog.
- Secrets solo server-side.
- Toda modificación de parámetros requiere versión/checksum.
- Si una decisión no está especificada, elige la opción más simple que preserve privacidad, seguridad y testabilidad; documéntala en `DECISIONS.md`.
- No desactives tests para hacer verde el build.

## Comandos esperados
`npm ci`
`npm run lint`
`npm run typecheck`
`npm run test`
`npm run test:e2e`
`npm run build`
`npm run drive:sync`

## Entregables del LLM programador
Código fuente, migraciones, scripts, tests, GitHub Actions, README de ejecución local, `DECISIONS.md`, y deployment configurado sin secretos hardcodeados.

## Definition of Done
La sección 28 de `docs/PRD.md` y todos los tests de `docs/ACCEPTANCE_TESTS.md` son gates de cierre.
