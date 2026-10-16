# PayPal (y base de datos opcional): pasos para el dueño

> Pega los secretos **solo en Vercel → Settings → Environment Variables** (marca **Production y Preview**) y haz **Redeploy** después de cada cambio. Nunca en el chat ni en el repo.

## 0. Cómo funciona

```
calculadora → email (+ consentimientos) → POST /api/reports/request
   ├─ vista previa borrosa (PDF) + enlace /<idioma>/unlock/<token cifrado> al usuario
   └─ aviso al dueño (sin datos de salud salvo consentimiento de copia)
enlace → acepta términos → botones PayPal
   → POST /api/paypal/create-order (precio solo en servidor, custom_id = id del informe)
   → POST /api/paypal/capture (valida order id, 1 purchase_unit, custom_id, COMPLETED, importe y moneda exactos, merchant)
   → PDF completo al email del token (nunca al del pagador) + "VENTA CONFIRMADA" al dueño
   → botón de descarga inmediata y enlace de descarga en el correo de entrega (comprobante)
respaldo: webhook firmado /api/paypal/webhook
```

## 1. ¿Base de datos o no? (elige UNA)

| | **A. Sin base de datos** (`PURCHASE_STORAGE=stateless`) — **recomendada, costo 0** | B. Supabase |
|---|---|---|
| Servicios extra | ninguno | un proyecto de Supabase |
| Dónde queda el registro de ventas | PayPal (Actividad), los correos "VENTA CONFIRMADA" y los logs de Resend | tabla `purchases` |
| Antidoble entrega | PayPal solo permite una captura por orden + `Idempotency-Key` de Resend | funciones SQL atómicas |
| Descarga posterior | el correo de entrega trae un botón; cada descarga se verifica contra PayPal (orden `COMPLETED`, no reembolsada) | consulta a la tabla |
| Reembolso / disputa | la descarga se bloquea sola y recibes un correo "EVENTO PAYPAL …" | estado `REFUNDED` / `DISPUTED` |
| Pagos `PENDING` (revisión de PayPal) | no se entregan solos si el usuario cerró la pestaña: el navegador recuerda la orden y entrega al reabrir el enlace; recibes un aviso | el webhook entrega solo |
| Reintentos automáticos (cron) | no aplica: tras pagar siempre aparece el botón de descarga aunque falle el correo | sí |

Elige **A** salvo que quieras un panel/registro propio. Con **B** sigue el paso 1B.

### 1B. (Solo si eliges Supabase)
1. https://supabase.com/dashboard → **New project** propio de GlucoPredict.
2. **SQL Editor → New query** → pega [`supabase/migrations/20261016120000_paypal_purchases.sql`](../supabase/migrations/20261016120000_paypal_purchases.sql) → **Run** (debe devolver `tablas = 2`, `funciones = 3`).
3. **Project Settings → API**: `Project URL` → `SUPABASE_URL`; clave **service_role** → `SUPABASE_SERVICE_ROLE_KEY`.

## 2. PayPal Sandbox (10 min)

1. https://developer.paypal.com → interruptor **Sandbox** → **Apps & Credentials → Create App** (Merchant).
2. **Client ID** → `PAYPAL_CLIENT_ID`; **Secret** → `PAYPAL_CLIENT_SECRET`.
3. En la app → **Webhooks → Add Webhook**:
   - URL: `https://<tu-dominio-de-produccion>/api/paypal/webhook`.
   - Eventos: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `CUSTOMER.DISPUTE.CREATED`.
   - **Webhook ID** → `PAYPAL_WEBHOOK_ID`.
4. **Testing Tools → Sandbox Accounts**: la cuenta *Personal* paga; el Merchant ID de la cuenta *Business* → `PAYPAL_MERCHANT_ID` (recomendado).

## 3. Variables en Vercel (Production y Preview)

| Variable | Valor |
|---|---|
| `MONETIZATION_MODE` | `paypal` (con `validation` el informe completo sale gratis) |
| `PURCHASE_STORAGE` | `stateless` (opción A). Con Supabase déjala vacía |
| `PAYPAL_ENV` | `sandbox` |
| `PAYMENTS_LIVE_APPROVED` | `false` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` / `PAYPAL_MERCHANT_ID` | los de Sandbox |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `OWNER_EMAIL` | ver `EMAIL_SETUP.md` |
| `REPORT_TOKEN_SECRET` | `openssl rand -base64 48` (≥ 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | `https://<tu-dominio>` (base de los enlaces de los correos) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | solo opción B |
| `CRON_SECRET` | solo opción B (reintentos y purga); aleatorio ≥ 16 caracteres |

## 4. Verificar

1. **Redeploy** y abre `https://<tu-app>/api/health`. Debe salir: `email:true`, `report_links:true`, `paypal:true`, `payments.enabled:true`, `payments.storage:"stateless"` (o `"supabase"`), `env:"sandbox"`, `payments.missing:[]`. Si falta algo, `payments.missing` lo nombra.
2. Prueba real: calculadora → email → llega la **vista previa borrosa** → *Desbloquear* → pagas con la cuenta Personal de Sandbox → botón de descarga + PDF completo por correo + "VENTA CONFIRMADA … | SANDBOX".
3. PayPal Developer → Webhooks → *Event delivery*: respuestas 200.
4. Reembolso desde la cuenta Business de Sandbox → la descarga del informe deja de funcionar y recibes el aviso "EVENTO PAYPAL … REFUNDED".

## 5. LIVE (solo con tu aprobación explícita)

Credenciales y webhook **Live** (distintos) en **Production**: `PAYPAL_ENV=live` **y** `PAYMENTS_LIVE_APPROVED=true`, Redeploy, `/api/health` debe decir `"env":"live"`. Haz una compra real propia y reembólsala. Completa antes los `[PENDIENTE]` legales (`docs/LAUNCH_CHECKLIST.md`).

**Rollback:** `PAYMENTS_LIVE_APPROVED=false` (o borra `PAYPAL_CLIENT_ID`) y Redeploy; o *Deployments → anterior → Promote to Production*.

## 6. Qué probó el código y qué no

- Probado con mocks (Vitest), con base de datos **y** sin ella: pago OK, abandonado, PENDING→COMPLETED (con BD), importe/moneda/merchant/custom_id incorrectos, firma falsa, webhooks duplicados, dos compradores, doble captura simultánea desde instancias distintas, caída de Resend, reembolso que revoca la descarga, token manipulado.
- Probado en navegador (Playwright) con PayPal simulado: flujo de desbloqueo y pago.
- **No probado todavía contra PayPal Sandbox real ni contra Resend real**: requiere tus credenciales (paso 4).
