import { CheckoutFailure, openUnlock, verifyPaidOrder } from "@/lib/checkout";
import { getPurchaseRepo } from "@/lib/purchases";
import { buildReportPdf } from "@/lib/report";
import { clientIp, json, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Descarga del informe completo. Requiere el token de desbloqueo y que el pago esté confirmado:
 *  - con base de datos: la compra está COMPLETED;
 *  - sin base de datos: la orden de PayPal (`o`) está COMPLETED, pertenece a este informe y no fue reembolsada.
 */
export async function GET(req: Request) {
  if (!rateLimit(`dl:${clientIp(req)}`, 15, 10 * 60_000)) return json(429, { error: "rate_limited" });
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const orderId = url.searchParams.get("o") ?? "";
  try {
    const data = openUnlock(token);
    const repo = getPurchaseRepo();
    if (!repo) return json(503, { error: "database_not_configured" });
    let paid: boolean;
    if (repo.stateless) {
      paid = orderId.length >= 5 && orderId.length <= 64 && (await verifyPaidOrder(data, orderId));
    } else {
      const p = await repo.findByReport(data.rid);
      paid = !!p && p.payment_status === "COMPLETED";
    }
    if (!paid) return json(402, { error: "payment_required" });
    const built = await buildReportPdf({ locale: data.locale, inputs: data.inputs, mode: "full" });
    return new Response(Buffer.from(built.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="GlucoPredict-${built.verification}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    if (e instanceof CheckoutFailure) return json(e.http, { error: e.code });
    return json(500, { error: "download_failed" });
  }
}
