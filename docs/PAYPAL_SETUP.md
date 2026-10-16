# PayPal + Supabase: pasos para el dueño

> Pega los secretos **solo en Vercel → Settings → Environment Variables** (marca **Production y Preview**) y haz **Redeploy** después de cada cambio. Nunca en el chat ni en el repo.

## 0. Cómo funciona (resumen)

```
calculadora → email (+ consentimientos) → POST /api/reports/request
   ├─ vista previa borrosa (PDF) + enlace /<idioma>/unlock/<token cifrado> al usuario
   └─ aviso al dueño (sin datos de salud salvo consentimiento de copia)
enlace → acepta términos → POST /api/purchase/start → botones PayPal
   → POST /api/paypal/create-order (precio solo en servidor, custom_id = id de compra)
   → POST /api/paypal/capture (valida order id, 1 purchase_unit, custom_id, COMPLETED, importe y moneda exactos, merchant)
   → función SQL atómica gp_purchase_mark_paid → gp_purchase_claim_fulfillment
   → PDF completo al email del token (nunca al del pagador) + "VENTA CONFIRMADA" al dueño
respaldo: webhook firmado /api/paypal/webhook · cron diario /api/cron/retention
```

## 1. Supabase (10 min)

1. https://supabase.com/dashboard → **New project** (plan gratis, región cercana). Un proyecto **propio de GlucoPredict**.
2. **SQL Editor → New query** → pega el contenido de [`supabase/migrations/20261016120000_paypal_purchases.sql`](../supabase/migrations/20261016120000_paypal_purchases.sql) → **Run**. La consulta final debe devolver `tablas = 2`, `funciones = 3`.
3. **Project Settings → API** → copia `Project URL` → `SUPABASE_URL` y la clave **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (solo en Vercel).

## 2. PayPal Sandbox (10 min)

1. https://developer.paypal.com → interruptor **Sandbox** → **Apps & Credentials → Create App** (Merchant).
2. Copia **Client ID** → `PAYPAL_CLIENT_ID` y **Secret** → `PAYPAL_CLIENT_SECRET`.
3. En la app → **Webhooks → Add Webhook**:
   - URL: `https://<tu-dominio-de-produccion>/api/paypal/webhook` (Preview con *Deployment Protection* devuelve 401: usa producción o un bypass).
   - Eventos: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `CUSTOMER.DISPUTE.CREATED`.
   - Copia el **Webhook ID** → `PAYPAL_WEBHOOK_ID`.
4. **Testing Tools → Sandbox Accounts**: la cuenta *Personal* paga en las pruebas; el Merchant ID de la cuenta *Business* → `PAYPAL_MERCHANT_ID` (recomendado).

## 3. Variables en Vercel (Production y Preview)

| Variable | Valor |
|---|---|
| `MONETIZATION_MODE` | `paypal` (con `validation` el informe completo sale gratis) |
| `PAYPAL_ENV` | `sandbox` |
| `PAYMENTS_LIVE_APPROVED` | `false` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` / `PAYPAL_MERCHANT_ID` | los de Sandbox |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | del paso 1 |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `OWNER_EMAIL` | ver `EMAIL_SETUP.md` |
| `REPORT_TOKEN_SECRET` | `openssl rand -base64 48` (≥ 32 caracteres) |
| `CRON_SECRET` | aleatorio ≥ 16 caracteres (Vercel Cron lo envía solo) |
| `NEXT_PUBLIC_APP_URL` | `https://<tu-dominio>` (base de los enlaces de los correos) |

## 4. Verificar

1. **Redeploy** y abre `https://<tu-app>/api/health`. Debe salir: `email:true`, `database:true`, `report_links:true`, `paypal:true`, `payments.enabled:true`, `payments.env:"sandbox"`, `payments.missing:[]`. Si falta algo, `payments.missing` lo nombra.
2. Prueba real: calculadora → email → llega la **vista previa borrosa** → *Desbloquear* → pagas con la cuenta Personal de Sandbox → llega el PDF completo y "VENTA CONFIRMADA … | SANDBOX".
3. PayPal Developer → Webhooks → *Event delivery*: respuestas 200.
4. Reembolso desde la cuenta Business de Sandbox → la compra pasa a `REFUNDED`.

## 5. LIVE (solo con tu aprobación explícita)

Credenciales y webhook **Live** (distintos) en **Production**: `PAYPAL_ENV=live` **y** `PAYMENTS_LIVE_APPROVED=true`, Redeploy, `/api/health` debe decir `"env":"live"`. Haz una compra real propia y reembólsala. Completa antes los `[PENDIENTE]` legales (`docs/LAUNCH_CHECKLIST.md`).

**Rollback:** `PAYMENTS_LIVE_APPROVED=false` (o borra `PAYPAL_CLIENT_ID`) y Redeploy; o *Deployments → anterior → Promote to Production*.

## 6. Qué probó el código y qué no

- Probado con mocks (Vitest): pago OK, abandonado, PENDING→COMPLETED, importe/moneda/merchant/custom_id incorrectos, firma falsa, webhooks duplicados, dos compradores, doble captura simultánea, caída de Resend + reintento, token manipulado.
- Probado en navegador (Playwright) con PayPal simulado: flujo de desbloqueo y pago.
- **No probado todavía contra PayPal Sandbox real ni contra Resend/Supabase reales**: requiere tus credenciales (paso 4).
