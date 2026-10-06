# ACCEPTANCE_TESTS

Estos tests son gates, no ejemplos opcionales.

## AT-01 — US-01 / FR-01
**Objetivo:** Landing contiene tagline, disclaimer y CTA; smoke test en es/en/pt.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-02 — US-02 / FR-02
**Objetivo:** Playwright móvil 390x844 completa flujo en <=10 pantallas de pregunta y muestra progreso correcto.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-03 — US-03 / FR-03
**Objetivo:** Vitest cubre in→cm, lb→kg y errores de rangos; no coerciona strings/booleanos.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-04 — US-04 / FR-04
**Objetivo:** Los 29 vectores válidos coinciden y los 9 inválidos fallan como esperado.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-05 — US-05 / FR-05
**Objetivo:** Preview renderiza exactamente los 5 outputs gratuitos definidos en outputs_spec.json.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-06 — US-06 / FR-06
**Objetivo:** PE muestra 11/verificado con limitación; MX/BR/CO/ES/DEFAULT muestran preliminar.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-07 — US-07 / FR-07
**Objetivo:** Búsqueda de copy impide 'tu probabilidad' junto a reference_10y_pct; snapshot aprobado.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-08 — US-08 / FR-08
**Objetivo:** POST report-request requiere consent_report_delivery=true, es idempotente y guarda lead.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-09 — US-09 / FR-09
**Objetivo:** Con consent_owner_copy=false no se adjuntan inputs/PDF; true envía payload y PDF al OWNER_EMAIL.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-10 — US-10 / FR-10
**Objetivo:** Email localizado llega a inbox de prueba y el asunto no contiene score ni condición clínica.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-11 — US-11 / FR-11
**Objetivo:** PDF abre, contiene 7 secciones, versión, disclaimers y no revela URL pública indexable.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-12 — US-12 / FR-12
**Objetivo:** Usuario no admin recibe 403; admin ve lista/embudo sin claves secretas.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-13 — US-13 / FR-13
**Objetivo:** Dos reenvíos no crean un segundo report_request; quedan auditados.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-14 — US-14 / FR-14
**Objetivo:** Inspección de eventos confirma ausencia de email, cintura, peso, glucosa previa y score exacto.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-15 — US-15 / FR-15
**Objetivo:** E2E confirma localStorage/sessionStorage sin inputs clínicos; logs de error están redactados.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-16 — US-16 / FR-16
**Objetivo:** Con Drive online valida checksum; con Drive caído sirve caché válida; hash incorrecto rechaza versión.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-17 — US-17 / FR-17
**Objetivo:** drive:sync dry-run/listado coincide con manifest y subida conserva estructura de carpetas.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-18 — US-18 / FR-18
**Objetivo:** validation no expone checkout; stripe sí lo expone sin ocultar preview gratuito.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-19 — US-19 / FR-19
**Objetivo:** Webhook con firma inválida=400; mismo event_id dos veces produce una sola transición.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-20 — US-20 / FR-20
**Objetivo:** Pago exitoso entrega un solo PDF y registra delivered_at.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-21 — US-21 / FR-21
**Objetivo:** axe/Playwright sin violaciones críticas/serias; navegación completa solo teclado.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-22 — US-22 / FR-22
**Objetivo:** Rutas /es, /en, /pt y traducciones clave no presentan claves faltantes.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-23 — US-23 / FR-23
**Objetivo:** Sitemap/hreflang/canonical válidos; /admin y /report noindex.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-24 — US-24 / FR-24
**Objetivo:** Bot simulado/ráfaga supera límite y recibe 429; Turnstile inválido bloquea gate.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-25 — US-25 / FR-25
**Objetivo:** Evento sintético en Sentry no contiene payload clínico ni email.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-26 — US-26 / FR-26
**Objetivo:** Solicitud verificada produce export o eliminación y audit trail sin exponer datos a otro usuario.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-27 — US-27 / FR-27
**Objetivo:** Con dataset fixture 30% y 50/14d gate=true; con cualquiera por debajo gate=false.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-28 — US-28 / FR-28
**Objetivo:** PR con mutación de vector falla CI; PR correcto pasa lint/typecheck/unit/e2e.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-29 — US-29 / FR-29
**Objetivo:** Prueba de carga confirma p95 <2 s en calculate; Lighthouse móvil >=90 en 4 categorías objetivo.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-30 — US-30 / FR-30
**Objetivo:** Build de producción finaliza en Vercel; build adaptado a Netlify no requiere reescribir dominio.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-31 — US-31 / FR-31
**Objetivo:** Snapshots de preview/PDF contienen 'escenario de score' y causal_claim=false.
**Automatización preferida:** Playwright/integration.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.

## AT-32 — US-32 / FR-32
**Objetivo:** Cada cálculo persistido guarda model_version, manifest_version y checksum no vacíos.
**Automatización preferida:** Vitest.
**Pass:** resultado determinista, sin datos personales reales y sin desactivar controles de seguridad.
