import { handleWebhookEvent } from "@/lib/checkout";
import { verifyWebhookSignature } from "@/lib/paypal";
import { json } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Webhook de PayPal: firma verificada, deduplicado por event_id; 500 si la entrega falla (PayPal reintenta). */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 262_144) return json(413, { error: "payload_too_large" });
  const valid = await verifyWebhookSignature(req.headers, raw);
  if (!valid) return json(401, { error: "invalid_signature" });
  let event: Parameters<typeof handleWebhookEvent>[0];
  try {
    event = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const ok = await handleWebhookEvent(event);
  return ok ? json(200, { received: true }) : json(500, { error: "processing_failed" });
}
