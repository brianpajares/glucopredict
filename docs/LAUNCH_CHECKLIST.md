# LAUNCH_CHECKLIST

Estado a 2026-10-16: `[x]` = verificado en esta entrega (mocks / navegador) · `[ ]` = pendiente (requiere credenciales, terceros o decisión del dueño).

## Técnico
- [x] Paridad del motor 29/29 válidos + 9/9 inválidos en TypeScript (gate bloqueante en CI).
- [x] lint, typecheck, tests unitarios/integración y E2E en verde; `next build` limpio.
- [x] Vista previa borrosa verificada: el texto bloqueado no está en el PDF.
- [x] Informe completo ≥ 10 páginas en es/en/pt; PDF abre y se descarga.
- [x] Umbrales preliminares se muestran como preliminares (PE verificado con su limitación).
- [x] ES/EN/PT sin claves faltantes (tipado estricto).
- [ ] Correo real: dominio **Verified** en Resend y correo **Delivered** al usuario y al dueño (`docs/EMAIL_SETUP.md`).
- [ ] Supabase: migración ejecutada (`tablas = 2`, `funciones = 3`) en un proyecto propio de GlucoPredict.
- [ ] `/api/health` en producción: `email`, `database`, `report_links`, `paypal` y `payments.enabled` en `true`, `env: "sandbox"`.
- [ ] Compra completa en **PayPal Sandbox real**: vista previa → desbloqueo → pago → PDF completo → "VENTA CONFIRMADA | SANDBOX".
- [ ] Webhooks con respuesta 200 en PayPal Developer; reembolso refleja `REFUNDED`.
- [ ] Secretos solo en Vercel (ninguno en el repo); rotar cualquier secreto que se haya compartido por chat.
- [ ] Lighthouse móvil ≥ 90 en las cuatro categorías; p95 de la calculadora/preview < 2 s.
- [ ] `/admin`, PostHog/Sentry sin datos clínicos, Turnstile + rate limit distribuido, export/delete de privacidad (FR-12–14, 24–26; no implementados).

## Legal, clínico y producto (gates antes de cobrar LIVE)
- [ ] Datos de la entidad en privacidad y términos (hoy `[PENDIENTE]`): razón social, domicilio, ley aplicable.
- [ ] Revisión legal: GDPR, LGPD, Ley 29733 (D.S. 016-2024-JUS), CCPA/CPRA; política de reembolsos y renuncia al desistimiento.
- [ ] Revisión del uso comercial del nombre/instrumento FINDRISC/LA-FINDRISC o activar el respaldo CDC/ADA.
- [ ] Revisión clínica del contenido educativo del informe (rangos ADA, metas OMS, plan de hábitos, preguntas para consulta).
- [ ] Precio: sigue siendo una **hipótesis** (USD 9). Validar con A/B; el margen con PayPal (~5,4 % + US$0,30 en pagos internacionales) debe cumplir el objetivo ≥ 85 % (`spec/monetizacion.json`).
- [ ] Umbrales preliminares (MX/BR/CO/ES) siguen marcados como preliminares hasta validación local.
- [ ] `ALLOW_INDEXING=true` solo después de los gates anteriores.
- [ ] **Solo con aprobación escrita del dueño**: `PAYPAL_ENV=live` + `PAYMENTS_LIVE_APPROVED=true`, compra real propia y reembolso.
