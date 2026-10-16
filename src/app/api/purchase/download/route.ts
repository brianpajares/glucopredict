import { CheckoutFailure, openUnlock } from "@/lib/checkout";
import { getPurchaseRepo } from "@/lib/purchases";
import { buildReportPdf } from "@/lib/report";
import { clientIp, json, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Descarga del informe completo: solo si la compra está COMPLETED y con el token de desbloqueo. */
export async function GET(req: Request) {
  if (!rateLimit(`dl:${clientIp(req)}`, 15, 10 * 60_000)) return json(429, { error: "rate_limited" });
  const token = new URL(req.url).searchParams.get("t") ?? "";
  try {
    const data = openUnlock(token);
    const repo = getPurchaseRepo();
    if (!repo) return json(503, { error: "database_not_configured" });
    const p = await repo.findByReport(data.rid);
    if (!p || p.payment_status !== "COMPLETED") return json(402, { error: "payment_required" });
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
