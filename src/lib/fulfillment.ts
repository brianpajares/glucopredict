import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { EngineInputs } from "@/lib/engine/types";
import { adminNoticeEmail, appUrl, monetizationMode, paypalConfig, reportPrice, resendKeyState, retentionDays, tokenSecret } from "@/lib/env";
import { reportEmail, ownerSaleEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { getPurchaseRepo, type Purchase } from "@/lib/purchases";
import { buildReportPdf } from "@/lib/report";
import { open, seal } from "@/lib/token";

/** Datos que viajan cifrados: nunca en claro en la base de datos ni en logs. */
export interface PurchasePayload {
  rid: string;
  email: string;
  locale: Locale;
  inputs: EngineInputs;
  oc: boolean;
}

export function sealPayload(p: PurchasePayload): string {
  return seal("payload", p, retentionDays() * 2);
}

export function openPayload(ciphertext: string): PurchasePayload {
  return open<PurchasePayload>("payload", ciphertext);
}

export function paymentsReady(): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (monetizationMode() !== "paypal") missing.push("MONETIZATION_MODE=paypal");
  const pp = paypalConfig();
  if (!pp.configured) missing.push("PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET");
  if (pp.liveBlocked) missing.push("PAYMENTS_LIVE_APPROVED=true (LIVE bloqueado)");
  if (!getPurchaseRepo()) missing.push("PURCHASE_STORAGE=stateless (sin base de datos) o SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
  const key = resendKeyState();
  if (key !== "ok") missing.push(`RESEND_API_KEY (${key})`);
  if (!tokenSecret()) missing.push("REPORT_TOKEN_SECRET (>=32 caracteres)");
  return { ready: missing.length === 0, missing };
}

export type FulfillResult = { ok: true; skipped?: boolean } | { ok: false; ref: string };

/**
 * Entrega idempotente: reclama la entrega en exclusiva, genera el PDF completo y lo envía al email
 * del payload (verificado por el token de desbloqueo), nunca al del pagador de PayPal.
 */
export async function fulfill(purchase: Purchase): Promise<FulfillResult> {
  const repo = getPurchaseRepo();
  if (!repo) return { ok: false, ref: "database_not_configured" };
  const firstAttempt = purchase.fulfillment_status === "NOT_STARTED";
  const claimed = await repo.claimFulfillment(purchase.id, 10);
  if (!claimed) return { ok: true, skipped: true };

  const label = (delivery: string, withCopy: boolean, pdf?: Uint8Array) => {
    const mail = ownerSaleEmail({
      id: purchase.id,
      priceLabel: reportPrice().label,
      delivery,
      env: paypalConfig().env,
      captureId: purchase.paypal_capture_id ?? "-",
      withCopy,
    });
    return sendEmail({
      to: adminNoticeEmail(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      idempotencyKey: `gp-sale-${purchase.id}-${delivery}`,
      attachments: withCopy && pdf ? [{ filename: `GlucoPredict-${purchase.id.slice(0, 8)}-COMPLETO.pdf`, content: pdf }] : undefined,
    });
  };

  try {
    if (!purchase.payload_ciphertext) throw new Error("payload_purged");
    const payload = openPayload(purchase.payload_ciphertext);
    const built = await buildReportPdf({ locale: payload.locale, inputs: payload.inputs, mode: "full" });
    // Enlace para volver a descargar (comprobante): token de desbloqueo + id de orden, verificados contra PayPal.
    const unlockToken = seal("unlock", { rid: payload.rid, email: payload.email, locale: payload.locale, inputs: payload.inputs, oc: payload.oc }, retentionDays());
    const downloadUrl = purchase.paypal_order_id
      ? `${appUrl()}/api/purchase/download?t=${encodeURIComponent(unlockToken)}&o=${encodeURIComponent(purchase.paypal_order_id)}`
      : undefined;
    const mail = reportEmail(payload.locale, "paid", { downloadUrl });
    const sent = await sendEmail({
      to: payload.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [{ filename: `GlucoPredict-${built.verification}.pdf`, content: built.pdf }],
      idempotencyKey: `gp-report-${purchase.id}`,
    });
    if (!sent.ok) {
      await repo.update(purchase.id, { fulfillment_status: "DELIVERY_FAILED", last_error: sent.ref });
      if (firstAttempt) await label("ENTREGA_FALLIDA", false);
      return { ok: false, ref: sent.ref };
    }
    await repo.update(purchase.id, { fulfillment_status: "EMAIL_ACCEPTED", fulfilled_at: new Date().toISOString(), last_error: null });
    await label("ENTREGADO", payload.oc, built.pdf).catch(() => undefined);
    return { ok: true };
  } catch (e) {
    const ref = e instanceof Error ? e.message.slice(0, 80) : "fulfillment_error";
    await repo.update(purchase.id, { fulfillment_status: "DELIVERY_FAILED", last_error: ref }).catch(() => undefined);
    if (firstAttempt) await label("ENTREGA_FALLIDA", false).catch(() => undefined);
    return { ok: false, ref };
  }
}
