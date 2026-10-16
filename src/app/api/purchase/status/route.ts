import { CheckoutFailure, openUnlock, verifyPaidOrder } from "@/lib/checkout";
import { getPurchaseRepo, publicStatus } from "@/lib/purchases";
import { clientIp, json, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

/** Estado de la compra (solo con el token de desbloqueo de ese informe). Sin datos clínicos. */
export async function GET(req: Request) {
  if (!rateLimit(`st:${clientIp(req)}`, 60, 10 * 60_000)) return json(429, { error: "rate_limited" });
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const orderId = url.searchParams.get("o") ?? "";
  try {
    const data = openUnlock(token);
    const repo = getPurchaseRepo();
    if (!repo) return json(503, { error: "database_not_configured" });
    if (repo.stateless) {
      // sin base de datos PayPal es el libro contable: se consulta la orden que el navegador recuerda
      if (orderId.length < 5 || orderId.length > 64) return json(200, { payment: "NONE", delivery: "NOT_STARTED" });
      const paid = await verifyPaidOrder(data, orderId);
      return json(200, { payment: paid ? "COMPLETED" : "NONE", delivery: "NOT_STARTED" });
    }
    const p = await repo.findByReport(data.rid);
    if (!p) return json(200, { payment: "NONE", delivery: "NOT_STARTED" });
    return json(200, publicStatus(p));
  } catch (e) {
    if (e instanceof CheckoutFailure) return json(e.http, { error: e.code });
    return json(500, { error: "status_failed" });
  }
}
