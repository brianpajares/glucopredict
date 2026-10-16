import { deploymentInfo, fromDomain, monetizationMode, paypalConfig, reportPrice, resendKeyState, supabaseConfig, tokenSecret, cronSecret } from "@/lib/env";
import { paymentsReady } from "@/lib/fulfillment";
import { MODEL_VERSION, PARAMS } from "@/lib/engine/engine";
import { json } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Diagnóstico público SIN secretos (lección PivotWorth: ver el estado real de cada entorno en 10 segundos). */
export async function GET() {
  const pp = paypalConfig();
  const pay = paymentsReady();
  const key = resendKeyState();
  return json(200, {
    status: "ok",
    app: "glucopredict",
    model: { version: MODEL_VERSION, params_checksum: PARAMS.checksum_sha256.slice(0, 12) },
    integrations: {
      email: key === "ok",
      resend_api_key: key,
      email_from_domain: fromDomain(),
      database: supabaseConfig() !== null,
      report_links: tokenSecret() !== null,
      paypal: pp.configured,
      cron: cronSecret() !== null,
      deployment: deploymentInfo().deployment,
      build: { branch: deploymentInfo().branch, commit: deploymentInfo().commit },
    },
    payments: {
      mode: monetizationMode(),
      enabled: pay.ready,
      env: pp.env,
      client_id: pp.clientId || null,
      live_blocked: pp.liveBlocked,
      webhook_configured: pp.webhookId.length > 0,
      price: reportPrice().label,
      missing: pay.missing,
    },
  });
}
