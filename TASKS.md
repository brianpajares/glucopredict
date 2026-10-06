# TASKS — M0 a M5

## M0 — Bootstrap y contratos
- Crear Next.js App Router + TS strict + Tailwind + shadcn/ui.
- Configurar lint/typecheck/test/build.
- Incorporar next-intl es/en/pt.
- Cargar `.env.example` sin secretos.
- CI inicial GitHub Actions.
**Aceptación:** build limpio; rutas base localizadas; ningún secreto en repo.

## M1 — Motor + Drive
- Portar engine a TS.
- Validar `inputs.schema.json`.
- Paridad 29/29 + errores 9/9.
- Implementar loader Drive, checksum, cache 24 h, last-known-good.
- Implementar `npm run drive:sync`.
**Aceptación:** AT-03, AT-04, AT-16, AT-17, AT-32.

## M2 — UX pública
- Landing + wizard + processing + preview.
- Responsive móvil, a11y, métricas/imperial.
- Copy ES/EN/PT y estados verificado/preliminar.
- SEO técnico.
**Aceptación:** AT-01, AT-02, AT-05, AT-06, AT-07, AT-21, AT-22, AT-23, AT-29, AT-31.

## M3 — Lead, informe y emails
- Supabase schema/RLS.
- Gate email/consentimientos.
- PDF server-side + token privado.
- Resend usuario/owner.
- Privacy request.
**Aceptación:** AT-08, AT-09, AT-10, AT-11, AT-15, AT-26.

## M4 — Admin, analytics, seguridad
- `/admin` con authz, leads, funnel, reenvío.
- PostHog y Sentry con redacción.
- Turnstile + rate limit.
- Audit events.
**Aceptación:** AT-12, AT-13, AT-14, AT-24, AT-25, AT-27.

## M5 — Stripe, CI/CD y release
- Stripe Checkout/webhook detrás de flag.
- Idempotencia y delivery.
- Lighthouse/load/security regression.
- Vercel production + Netlify portability.
- Ejecutar launch checklist.
**Aceptación:** AT-18, AT-19, AT-20, AT-28, AT-29, AT-30 y Definition of Done.
