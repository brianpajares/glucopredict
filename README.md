# GlucoPredict

GlucoPredict es una herramienta **educativa de cribado** basada en FINDRISC / LA-FINDRISC: calcula un score de 0 a 26, una banda histórica y orienta si conviene confirmar con una prueba clínica. **No diagnostica diabetes**, no estima una probabilidad personal y no da consejo de tratamiento.

## Qué hace la aplicación

1. **Calculadora gratuita** (landing → wizard de 10 pasos → resultado) en es / en / pt. El score, la banda, el gráfico, el factor principal y la recomendación de seguimiento son **siempre gratis**.
2. **Informe completo de 10+ páginas (PDF)**: desglose de los 8 componentes, escenarios de la regla, contexto de país, pruebas de confirmación, plan educativo de 12 semanas, hoja de seguimiento, resumen y preguntas para la consulta, metodología y fuentes.
3. **Dos modos** (`MONETIZATION_MODE`):
   - `validation` (por defecto, PRD §17): el informe completo se envía gratis por email.
   - `paypal`: el usuario recibe una **vista previa borrosa** (el contenido bloqueado nunca se escribe en el PDF) y un enlace privado de desbloqueo; paga con PayPal/tarjeta y recibe el PDF completo por email. Solo se activa si PayPal + Resend + `REPORT_TOKEN_SECRET` están configurados y hay dónde registrar compras: `PURCHASE_STORAGE=stateless` (sin base de datos, sin costo) o Supabase.
4. **Diagnóstico**: `GET /api/health` (sin secretos) dice qué está configurado y qué falta.

## Stack

Next.js (App Router) · TypeScript strict · pdf-lib · Resend (REST) · PayPal Checkout Orders v2 · Supabase opcional (REST, service role solo servidor) · Vitest · Playwright · Vercel.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completa solo lo que necesites
npm run dev
```

Comandos obligatorios antes de cerrar un cambio:

```bash
npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm run build
```

- `npm test`: paridad del motor con `spec/test_vectors.json` (29 válidos + 9 inválidos, **gate bloqueante**), pagos con PayPal/Resend simulados, PDF y tokens.
- `npm run test:e2e`: Playwright (construye y levanta la app con un entorno sintético; Chromium escritorio + móvil. `E2E_ALL_BROWSERS=1` añade Firefox y WebKit).
- `npm run sample:pdf -- es`: genera PDFs de muestra (completo y vista previa) con un perfil sintético en `tmp-samples/`.

## Puesta en marcha de correo y pagos

- Correo: [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md)
- PayPal, Supabase y variables por entorno: [`docs/PAYPAL_SETUP.md`](docs/PAYPAL_SETUP.md)
- Estado de la auditoría y decisiones: [`docs/AUDIT_2026-10-16.md`](docs/AUDIT_2026-10-16.md) y [`DECISIONS.md`](DECISIONS.md)
- Antes de cobrar de verdad: [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md)

## Reglas que no se negocian

- Fuente de verdad: `docs/PRD.md` → `spec/` → `ux/`. El motor vive en `src/lib/engine` y la UI no contiene reglas del score.
- Secretos solo en variables de entorno del servidor. Nunca en el repo, el cliente o los logs.
- PayPal **LIVE** requiere `PAYPAL_ENV=live` **y** `PAYMENTS_LIVE_APPROVED=true`.
- Fixtures sintéticos; nunca PII real. Sin datos clínicos en analítica ni en logs.
- Los precios son hipótesis preliminares (`spec/monetizacion.json`), no precios validados.
