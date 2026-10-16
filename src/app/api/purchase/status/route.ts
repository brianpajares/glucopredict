import { CheckoutFailure, openUnlock } from "@/lib/checkout";
import { getPurchaseRepo, publicStatus } from "@/lib/purchases";
import { clientIp, json, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/** Estado de la compra (solo con el token de desbloqueo de ese informe). Sin datos clínicos. */
export async function GET(req: Request) {
  if (!rateLimit(`st:${clientIp(req)}`, 60, 10 * 60_000)) return json(429, { error: "rate_limited" });
  const token = new URL(req.url).searchParams.get("t") ?? "";
  try {
    const data = openUnlock(token);
    const repo = getPurchaseRepo();
    if (!repo) return json(503, { error: "database_not_configured" });
    const p = await repo.findByReport(data.rid);
    if (!p) return json(200, { payment: "NONE", delivery: "NOT_STARTED" });
    return json(200, publicStatus(p));
  } catch (e) {
    if (e instanceof CheckoutFailure) return json(e.http, { error: e.code });
    return json(500, { error: "status_failed" });
  }
}
