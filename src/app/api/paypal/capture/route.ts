import { CheckoutFailure, captureAndFulfill } from "@/lib/checkout";
import { paymentsReady } from "@/lib/fulfillment";
import { CaptureSchema } from "@/lib/schemas";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "bad_origin" });
  if (!rateLimit(`cap:${clientIp(req)}`, 20, 10 * 60_000)) return json(429, { error: "rate_limited" });
  if (!paymentsReady().ready) return json(503, { error: "payments_disabled" });
  let parsed;
  try {
    parsed = CaptureSchema.safeParse(await readJson(req));
  } catch {
    return json(400, { error: "invalid_request" });
  }
  if (!parsed.success) return json(400, { error: "invalid_request" });
  try {
    const r = await captureAndFulfill({ purchaseId: parsed.data.purchase_id, orderId: parsed.data.order_id, unlockToken: parsed.data.unlock_token });
    return json(200, r);
  } catch (e) {
    if (e instanceof CheckoutFailure) return json(e.http, { error: e.code });
    console.error(`[paypal.capture] ${e instanceof Error ? e.message : "error"}`);
    return json(500, { error: "capture_failed" });
  }
}
