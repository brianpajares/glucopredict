import "server-only";
import { fromEmail, resendKey, resendKeyState } from "@/lib/env";

/**
 * Cliente de Resend por REST. Lecciones de PivotWorth:
 *  - Idempotency-Key va como HEADER, nunca en el payload.
 *  - Remitente y destinatarios ya vienen normalizados desde env.ts.
 *  - Cada fallo devuelve un código `ref` corto para diagnosticar desde la UI sin abrir logs.
 */
export interface Attachment {
  filename: string;
  content: Uint8Array;
}

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Attachment[];
  idempotencyKey?: string;
}

export type SendResult = { ok: true; id: string | null } | { ok: false; ref: string; status: number };

const RESEND_URL = "https://api.resend.com/emails";

export function redactEmails(text: string): string {
  return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
}

function refFromError(status: number, body: { name?: string; message?: string }): string {
  const name = (body.name ?? "error").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  let suffix = "";
  if (status === 422) {
    const m = (body.message ?? "").toLowerCase();
    if (/\bto\b/.test(m)) suffix = "_to";
    else if (/\bfrom\b/.test(m)) suffix = "_from";
    else if (/attachment/.test(m)) suffix = "_attachment";
  }
  return `resend_${status}_${name}${suffix}`;
}

export async function sendEmail(args: SendArgs, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const key = resendKey();
  if (!key) return { ok: false, ref: `email_not_configured_RESEND_API_KEY${resendKeyState() === "ok" ? "" : `_${resendKeyState()}`}`, status: 0 };
  const payload: Record<string, unknown> = {
    from: fromEmail(),
    to: Array.isArray(args.to) ? args.to : [args.to],
    subject: args.subject,
    html: args.html,
    text: args.text,
  };
  if (args.replyTo) payload.reply_to = args.replyTo;
  if (args.attachments?.length) {
    payload.attachments = args.attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") }));
  }
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (args.idempotencyKey) headers["Idempotency-Key"] = args.idempotencyKey;
  try {
    const res = await fetchImpl(RESEND_URL, { method: "POST", headers, body: JSON.stringify(payload) });
    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };
    if (!res.ok) {
      console.error(`[resend] ${res.status} ${body.name ?? ""} ${redactEmails(body.message ?? "")}`);
      return { ok: false, ref: refFromError(res.status, body), status: res.status };
    }
    return { ok: true, id: body.id ?? null };
  } catch (e) {
    console.error(`[resend] network_error ${redactEmails(e instanceof Error ? e.message : "")}`);
    return { ok: false, ref: "resend_network_error", status: 0 };
  }
}
