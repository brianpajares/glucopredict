import { CheckoutFailure, createPaypalOrder } from "@/lib/checkout";
import { paymentsReady } from "@/lib/fulfillment";
import { CreateOrderSchema } from "@/lib/schemas";
import { clientIp, json, rateLimit, readJson, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json(403, { error: "bad_origin" });
  if (!rateLimit(`co:${clientIp(req)}`, 20, 10 * 60_000)) return json(429, { error: "rate_limited" });
  if (!paymentsReady().ready) return json(503, { error: "payments_disabled" });
  let parsed;
  try {
    parsed = CreateOrderSchema.safeParse(await readJson(req));
  } catch {
    return json(400, { error: "invalid_request" });
  }
  if (!parsed.success) return json(400, { error: "invalid_request" });
  try {
    const { orderId } = await createPaypalOrder(parsed.data.purchase_id, parsed.data.unlock_token);
    return json(200, { order_id: orderId });
  } catch (e) {
    if (e instanceof CheckoutFailure) return json(e.http, { error: e.code });
    const ref = e instanceof Error ? e.message.slice(0, 60) : "error";
    console.error(`[paypal.create-order] ${ref}`);
    return json(502, { error: "order_failed", ref });
  }
}
