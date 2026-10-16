# DECISIONS.md

Registro que completará el LLM programador durante la implementación.

Cada entrada debe incluir: fecha, decisión, alternativas descartadas, impacto en privacidad/seguridad/modelo y archivos afectados. No modificar requisitos clínicos, thresholds, claims ni monetización sin una nueva decisión de producto respaldada por evidencia.

## 2026-10-05 — Publicación del preview de validación

- **Decisión:** Publicar el prototipo autocontenido como preview estático en Vercel mientras se implementa la aplicación de producción especificada en M0–M5. Mantener `MONETIZATION_MODE=validation`, ocultar indexación con `X-Robots-Tag`, y decir de forma visible que el email y las respuestas no se envían ni guardan.
- **Alternativas descartadas:** Presentar el prototipo como producto listo para pacientes; activar cobros o recopilar datos clínicos sin backend, privacidad/legal, derechos de instrumento y gates de QA cerrados.
- **Impacto en privacidad/seguridad/modelo:** No se activa almacenamiento, analítica ni pago; se conserva el motor y los claims del prototipo, incluyendo el aviso de que las referencias no son probabilidad personal. El estado `noindex` reduce descubrimiento orgánico durante validación.
- **Archivos afectados:** `index.html`, `README.md`, `vercel.json`, `.gitignore`.

## 2026-10-16 — Reconstrucción a Next.js, correo y pagos con PayPal

Decisiones tomadas al implementar la aplicación de producción sobre el prototipo estático.

- **D-01 · Next.js + TypeScript strict reemplaza el prototipo estático.** Se retira `index.html` (el prototipo de referencia sigue en `ux/prototype.html`). El motor se porta a `src/lib/engine` con paridad 29/29 + 9/9 contra `spec/test_vectors.json` (gate bloqueante, `tests/engine.parity.test.ts`). El redondeo replica `round()` half-even de Python.
- **D-02 · PayPal en lugar de Stripe** (petición del dueño; supersede FR-18/19/20 del PRD en cuanto al proveedor). Stripe no se implementa. PayPal no soporta PEN/COP: se cobra en **USD** con la hipótesis preliminar de `spec/monetizacion.json` (US: USD 9, configurable en `REPORT_PRICE_USD`, solo servidor). No se afirma que el precio esté validado.
- **D-03 · `MONETIZATION_MODE` = `validation` (por defecto) | `paypal`.** En `validation` (o si falta cualquier requisito de pago) el informe completo se envía gratis por email, conforme al PRD §17 y a la lección PivotWorth "la app nunca se rompe". En `paypal` con configuración completa: vista previa borrosa + desbloqueo. `/api/health` → `payments.missing` indica qué falta. LIVE exige `PAYPAL_ENV=live` **y** `PAYMENTS_LIVE_APPROVED=true`.
- **D-04 · Informe de 16 páginas** (petición del dueño: "más de 8 páginas"), frente a las 7 de `ux/report_layout.md`. Las secciones salen de `spec/outputs_spec.json` (component_breakdown, modifiable_scenarios, country_context, reference_comparison, action_plan_12w, doctor_summary, methodology) ampliadas con detalle por componente, hoja de seguimiento, FAQ/glosario y fuentes. No se añadieron outputs fuera del spec. **Requiere revisión clínica antes de cobrar** (rangos de referencia ADA para HbA1c/FPG/OGTT, metas de actividad/fruta-verdura de la OMS y plan de hábitos); el contenido evita dosis, medicación, diagnóstico y causalidad (`causal_claim=false`).
- **D-05 · `pdf-lib` en lugar de `@react-pdf/renderer`.** Permite dibujar la vista previa sin escribir los valores bloqueados (en PDF el texto tapado sigue siendo extraíble; probado automáticamente). Limitación: sin PDF/UA etiquetado (texto seleccionable, orden de lectura correcto, idioma y título definidos). Fuentes estándar (WinAnsi) con sustitución de símbolos (≥ → >=).
- **D-06 · El BMI no es un output gratuito.** `outputs_spec.json` define exactamente 5 outputs gratuitos; el BMI aparece en el informe completo y se difumina en la vista previa.
- **D-07 · Copia al dueño con consentimiento.** Se respeta PRD §17 / D32: el aviso al dueño no lleva datos de salud ni PDF salvo `consent_owner_copy=true` (casilla separada y opcional). Esto difiere del kit PivotWorth (que enviaba siempre el PDF completo al dueño).
- **D-08 · Token de desbloqueo AES-256-GCM con inputs y email** (clave HKDF de `REPORT_TOKEN_SECRET`, caduca en `REPORT_RETENTION_DAYS`). Prueba el email sin OTP; el email, los inputs y el idioma salen del token, nunca del navegador. La compra guarda el payload cifrado (purga por retención).
- **D-09 · Los pagos exigen base de datos** (Supabase, REST con service role solo servidor, RLS sin políticas, funciones SQL atómicas `gp_purchase_mark_paid` / `gp_purchase_claim_fulfillment`). Migración: `supabase/migrations/20261016120000_paypal_purchases.sql`. No se creó ni modificó ningún proyecto de Supabase.
- **D-10 · Parámetros del modelo embebidos** en `src/lib/engine/params.v2.json` (extraídos de `drive/base/base_glucopredict.xlsx`, huella SHA-256 registrada). El loader de Google Drive (FR-16/17) queda **pendiente**; el cálculo no depende de Drive.
- **D-11 · i18n propio (`/[lang]`) y CSS propio** en lugar de next-intl y Tailwind/shadcn: menos dependencias y control total del diseño. Mismas rutas por idioma (es/en/pt).
- **D-12 · Antiabuso mínimo**: honeypot, comprobación de origen, límites de payload y rate limit en memoria por instancia. Turnstile y rate limit distribuido quedan pendientes (FR-24).
- **D-13 · Todo `noindex` hasta `ALLOW_INDEXING=true`** (gates legales/IP pendientes, D28). Las rutas de desbloqueo son siempre `noindex`/`no-referrer`/`no-store`.
- **D-14 · Datos legales de la entidad no inventados**: marcados `[PENDIENTE]` en privacidad/términos (razón social, domicilio, ley aplicable, política de reembolsos, revisión GDPR/LGPD/29733/CCPA).
- **D-15 · Pendientes explícitos**: `/admin`, PostHog, Sentry, privacy request (export/delete), Lighthouse CI, pruebas de carga.
