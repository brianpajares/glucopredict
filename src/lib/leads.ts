import "server-only";
import { randomUUID } from "node:crypto";
import { EngineValidationError, calculate } from "@/lib/engine/engine";
import type { EngineInputs } from "@/lib/engine/types";
import { appUrl, extractEmail, ownerEmail, reportPrice, retentionDays } from "@/lib/env";
import { ownerLeadEmail, previewEmail, reportEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { paymentsReady } from "@/lib/fulfillment";
import { buildReportPdf } from "@/lib/report";
import { ReportRequestSchema, EMAIL_RE } from "@/lib/schemas";
import { rateLimit } from "@/lib/security";
import { canonicalize, emailHash, seal } from "@/lib/token";
import type { UnlockData } from "@/lib/checkout";

export type RequestResult =
  | { status: 200; body: { report_id: string; delivery: "email_sent"; mode: "paid" | "free"; unlock_url?: string } }
  | { status: 400 | 422 | 429 | 502 | 503; body: { error: string; ref?: string } };

const recent = new Map<string, { at: number; result: RequestResult }>();

/**
 * POST /api/reports/request.
 *  - Modo de pago listo: vista previa borrosa al usuario + enlace de desbloqueo; la API NUNCA devuelve el informe.
 *  - Sin pagos configurados (modo validación): informe completo por email (PRD §17).
 * El resultado real se recalcula en el servidor a partir de los inputs; nunca se confía en un score del cliente.
 */
export async function requestReport(raw: unknown, ip: string): Promise<RequestResult> {
  const parsed = ReportRequestSchema.safeParse(raw);
  if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
  const body = parsed.data;

  if (body.website && body.website.trim() !== "") {
    // honeypot: respuesta idéntica a un éxito, sin enviar nada
    return { status: 200, body: { report_id: randomUUID(), delivery: "email_sent", mode: "free" } };
  }
  if (!body.consent_report_delivery) return { status: 422, body: { error: "consent_required" } };
  const email = extractEmail(body.email);
  if (!email || !EMAIL_RE.test(email) || email !== body.email.trim().toLowerCase()) return { status: 422, body: { error: "invalid_email" } };

  const inputs: EngineInputs = { ...body.inputs, country_code: body.country_code };
  try {
    calculate(inputs);
  } catch (e) {
    if (e instanceof EngineValidationError) return { status: 422, body: { error: "invalid_inputs", ref: e.message.split(" ")[0] } };
    throw e;
  }

  if (!rateLimit(`rr:ip:${ip}`, 8, 10 * 60_000) || !rateLimit(`rr:em:${emailHash(email)}`, 4, 60 * 60_000)) {
    return { status: 429, body: { error: "rate_limited" } };
  }

  const dedupeKey = emailHash(`${email}|${canonicalize(inputs)}|${body.locale}`);
  const cached = recent.get(dedupeKey);
  if (cached && Date.now() - cached.at < 2 * 60_000) return cached.result;

  const rid = randomUUID();
  const oc = body.consent_owner_copy === true;
  const pay = paymentsReady();
  let result: RequestResult;

  if (pay.ready) {
    const unlock: UnlockData = { rid, email, locale: body.locale, inputs, oc };
    const token = seal("unlock", unlock, retentionDays());
    const unlockUrl = `${appUrl()}/${body.locale}/unlock/${token}`;
    const price = reportPrice();
    const built = await buildReportPdf({ locale: body.locale, inputs, mode: "preview", unlockUrl, priceLabel: price.label });
    const mail = previewEmail(body.locale, { unlockUrl, priceLabel: price.label, days: retentionDays() });
    const sent = await sendEmail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [{ filename: `GlucoPredict-${built.verification}-vista-previa.pdf`, content: built.pdf }],
      idempotencyKey: `gp-preview-${rid}`,
    });
    if (!sent.ok) return { status: sent.ref.startsWith("email_not_configured") ? 503 : 502, body: { error: "email_failed", ref: sent.ref } };
    await notifyOwner({ rid, locale: body.locale, country: built.out.country_code, mode: "preview", withCopy: oc, inputs, verification: built.verification });
    result = { status: 200, body: { report_id: rid, delivery: "email_sent", mode: "paid", unlock_url: unlockUrl } };
  } else {
    const built = await buildReportPdf({ locale: body.locale, inputs, mode: "full" });
    const mail = reportEmail(body.locale, "free");
    const sent = await sendEmail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: [{ filename: `GlucoPredict-${built.verification}.pdf`, content: built.pdf }],
      idempotencyKey: `gp-free-${rid}`,
    });
    if (!sent.ok) return { status: sent.ref.startsWith("email_not_configured") ? 503 : 502, body: { error: "email_failed", ref: sent.ref } };
    await notifyOwner({ rid, locale: body.locale, country: built.out.country_code, mode: "free", withCopy: oc, inputs, verification: built.verification, pdf: built.pdf });
    result = { status: 200, body: { report_id: rid, delivery: "email_sent", mode: "free" } };
  }
  recent.set(dedupeKey, { at: Date.now(), result });
  if (recent.size > 500) for (const [k, v] of recent) if (Date.now() - v.at > 2 * 60_000) recent.delete(k);
  return result;
}

export function resetRecentRequests(): void {
  recent.clear();
}

/** Aviso al dueño: sin datos de salud salvo consentimiento explícito (PRD §17, D32). Mejor esfuerzo. */
async function notifyOwner(a: {
  rid: string;
  locale: "es" | "en" | "pt";
  country: string;
  mode: "preview" | "free";
  withCopy: boolean;
  inputs: EngineInputs;
  verification: string;
  pdf?: Uint8Array;
}): Promise<void> {
  const mail = ownerLeadEmail({ id: a.rid, locale: a.locale, country: a.country, mode: a.mode, withCopy: a.withCopy });
  let attachments: { filename: string; content: Uint8Array }[] | undefined;
  if (a.withCopy) {
    const full = a.pdf ?? (await buildReportPdf({ locale: a.locale, inputs: a.inputs, mode: "full" })).pdf;
    attachments = [{ filename: `GlucoPredict-${a.verification}-COMPLETO.pdf`, content: full }];
  }
  await sendEmail({ to: ownerEmail(), subject: mail.subject, html: mail.html, text: mail.text, attachments, idempotencyKey: `gp-lead-${a.rid}` }).catch(() => undefined);
}
