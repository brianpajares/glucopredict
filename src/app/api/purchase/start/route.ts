import { CheckoutFailure, startPurchase } from "@/lib/checkout";
import { paypalConfig } from "@/lib/env";
import { paymentsReady } from "@/lib/fulfillment";
import { PurchaseStartSchema } from "@/lib/schemas";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "bad_origin" });
  if (!rateLimit(`ps:${clientIp(req)}`, 20, 10 * 60_000)) return json(429, { error: "rate_limited" });
  if (!paymentsReady().ready) return json(503, { error: "payments_disabled" });
  let parsed;
  try {
    parsed = PurchaseStartSchema.safeParse(await readJson(req));
  } catch {
    return json(400, { error: "invalid_request" });
  }
  if (!parsed.success) return json(400, { error: "invalid_request" });
  try {
    const { purchase } = await startPurchase(parsed.data.unlock_token, parsed.data.accept_terms);
    const cfg = paypalConfig();
    return json(200, {
      purchase_id: purchase.id,
      payment: purchase.payment_status,
      delivery: purchase.fulfillment_status,
      paypal_client_id: cfg.clientId,
      paypal_env: cfg.env,
      amount: purchase.amount,
      currency: purchase.currency,
    });
  } catch (e) {
    if (e instanceof CheckoutFailure) return json(e.http, { error: e.code });
    console.error(`[purchase.start] ${e instanceof Error ? e.message : "error"}`);
    return json(500, { error: "purchase_start_failed" });
  }
}
