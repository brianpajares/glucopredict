import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { EngineInputs } from "@/lib/engine/types";
import { paypalConfig, reportPrice } from "@/lib/env";
import { fulfill, sealPayload, type PurchasePayload } from "@/lib/fulfillment";
import { PaypalError, captureOrder, createOrder, getOrder, judgeOrder, type PaypalOrder } from "@/lib/paypal";
import { getPurchaseRepo, publicStatus, type Purchase, type PurchaseRepo } from "@/lib/purchases";
import { TokenError, emailHash, open } from "@/lib/token";

/** Contenido del token de desbloqueo: el email y los inputs salen del TOKEN, nunca del navegador. */
export interface UnlockData {
  rid: string;
  email: string;
  locale: Locale;
  inputs: EngineInputs;
  oc: boolean;
}

export type CheckoutError =
  | "database_not_configured"
  | "payments_disabled"
  | "unlock_invalid"
  | "terms_required"
  | "purchase_not_found"
  | "purchase_mismatch"
  | "already_paid"
  | "order_mismatch";

export class CheckoutFailure extends Error {
  constructor(
    public readonly code: CheckoutError | string,
    public readonly http: number,
  ) {
    super(code);
  }
}

export function openUnlock(token: string): UnlockData {
  try {
    return open<UnlockData>("unlock", token);
  } catch (e) {
    if (e instanceof TokenError) throw new CheckoutFailure("unlock_invalid", 410);
    throw e;
  }
}

function repoOrThrow(): PurchaseRepo {
  const repo = getPurchaseRepo();
  if (!repo) throw new CheckoutFailure("database_not_configured", 503);
  return repo;
}

function assertOwnership(purchase: Purchase, data: UnlockData): void {
  if (purchase.report_id !== data.rid) throw new CheckoutFailure("purchase_mismatch", 403);
}

export async function startPurchase(unlockToken: string, acceptTerms: boolean): Promise<{ purchase: Purchase; created: boolean }> {
  const repo = repoOrThrow();
  const data = openUnlock(unlockToken);
  if (!acceptTerms) throw new CheckoutFailure("terms_required", 422);
  const existing = await repo.findByReport(data.rid);
  if (existing) {
    if (!existing.terms_accepted_at) {
      return { purchase: await repo.update(existing.id, { terms_accepted_at: new Date().toISOString() }), created: false };
    }
    return { purchase: existing, created: false };
  }
  const price = reportPrice();
  const payload: PurchasePayload = { rid: data.rid, email: data.email, locale: data.locale, inputs: data.inputs, oc: data.oc };
  const created = await repo.create({
    report_id: data.rid,
    email_hash: emailHash(data.email),
    payload_ciphertext: sealPayload(payload),
    locale: data.locale,
    amount: price.value,
    currency: price.currency,
    env: paypalConfig().env,
    consent_owner_copy: data.oc,
  });
  return { purchase: await repo.update(created.id, { terms_accepted_at: new Date().toISOString() }), created: true };
}

export async function createPaypalOrder(purchaseId: string, unlockToken: string, fetchImpl: typeof fetch = fetch): Promise<{ orderId: string }> {
  const repo = repoOrThrow();
  const data = openUnlock(unlockToken);
  const purchase = await repo.get(purchaseId);
  if (!purchase) throw new CheckoutFailure("purchase_not_found", 404);
  assertOwnership(purchase, data);
  if (!purchase.terms_accepted_at) throw new CheckoutFailure("terms_required", 422);
  if (purchase.payment_status === "COMPLETED") throw new CheckoutFailure("already_paid", 409);
  if (purchase.paypal_order_id && purchase.payment_status === "AWAITING_PAYMENT") return { orderId: purchase.paypal_order_id };
  const order = await createOrder({ purchaseId: purchase.id, requestId: `gp-order-${purchase.id}` }, fetchImpl);
  await repo.update(purchase.id, { paypal_order_id: order.id, payment_status: "AWAITING_PAYMENT", last_error: null });
  return { orderId: order.id };
}

export interface SettleResult {
  payment: Purchase["payment_status"];
  delivery: Purchase["fulfillment_status"];
  ref?: string;
}

/** Aplica el veredicto de una orden de PayPal sobre una compra (compartido por captura y webhook). */
export async function settleOrder(purchase: Purchase, order: PaypalOrder, repo: PurchaseRepo): Promise<SettleResult> {
  const verdict = judgeOrder(order, {
    purchaseId: purchase.id,
    orderId: purchase.paypal_order_id ?? order.id,
    amount: purchase.amount,
    currency: purchase.currency,
    merchantId: paypalConfig().merchantId || undefined,
  });
  if (verdict.kind === "rejected") {
    const p = await repo.update(purchase.id, { payment_status: "FAILED", last_error: `rejected_${verdict.reason}` });
    return { ...publicStatus(p), ref: `rejected_${verdict.reason}` };
  }
  if (verdict.kind === "pending") {
    const p = await repo.update(purchase.id, { payment_status: "PENDING" });
    return publicStatus(p);
  }
  const mark = await repo.markPaid(purchase.id, order.id, verdict.captureId, verdict.amount, verdict.currency);
  if (mark === "mismatch") {
    const p = await repo.update(purchase.id, { payment_status: "FAILED", last_error: "mark_paid_mismatch" });
    return { ...publicStatus(p), ref: "mark_paid_mismatch" };
  }
  const fresh = (await repo.get(purchase.id)) ?? purchase;
  const f = await fulfill(fresh);
  const after = (await repo.get(purchase.id)) ?? fresh;
  return { ...publicStatus(after), ref: f.ok ? undefined : f.ref };
}

export async function captureAndFulfill(a: { purchaseId: string; orderId: string; unlockToken: string }, fetchImpl: typeof fetch = fetch): Promise<SettleResult> {
  const repo = repoOrThrow();
  const data = openUnlock(a.unlockToken);
  const purchase = await repo.get(a.purchaseId);
  if (!purchase) throw new CheckoutFailure("purchase_not_found", 404);
  assertOwnership(purchase, data);
  if (purchase.paypal_order_id !== a.orderId) throw new CheckoutFailure("order_mismatch", 409);
  if (purchase.payment_status === "COMPLETED") {
    const f = await fulfill(purchase);
    const after = (await repo.get(purchase.id)) ?? purchase;
    return { ...publicStatus(after), ref: f.ok ? undefined : f.ref };
  }
  let order: PaypalOrder;
  try {
    order = await captureOrder(a.orderId, `gp-capture-${purchase.id}`, fetchImpl);
  } catch (e) {
    if (e instanceof PaypalError && e.status === 422 && /order_already_captured/.test(e.code)) {
      order = await getOrder(a.orderId, fetchImpl);
    } else {
      const ref = e instanceof PaypalError ? e.code : "paypal_capture_error";
      const p = await repo.update(purchase.id, { payment_status: "FAILED", last_error: ref });
      return { ...publicStatus(p), ref };
    }
  }
  return settleOrder(purchase, order, repo);
}

// ------------------------------------------------------------------------------------------
// Webhook
// ------------------------------------------------------------------------------------------
interface WebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    disputed_transactions?: { seller_transaction_id?: string }[];
  };
}

/** Devuelve true si se procesó (o es ignorable). false => responder 500 para que PayPal reintente. */
export async function handleWebhookEvent(event: WebhookEvent, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const repo = getPurchaseRepo();
  if (!repo || !event.id || !event.event_type) return false;
  const isNew = await repo.recordWebhookEvent(event.id, event.event_type);
  if (!isNew) return true;
  try {
    const res = event.resource ?? {};
    const type = event.event_type;
    const findPurchase = async (): Promise<Purchase | null> => {
      const orderId = res.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const p = await repo.findByOrder(orderId);
        if (p) return p;
      }
      if (res.custom_id) return repo.get(res.custom_id).catch(() => null);
      if (res.id) return repo.findByCapture(res.id);
      return null;
    };
    if (type === "PAYMENT.CAPTURE.COMPLETED") {
      const p = await findPurchase();
      if (!p || !p.paypal_order_id) return true;
      // No se confía en el cuerpo del evento: se consulta la orden y se valida igual que en la captura.
      const order = await getOrder(p.paypal_order_id, fetchImpl);
      const r = await settleOrder(p, order, repo);
      const ok = !r.ref || r.ref.startsWith("rejected_") || r.ref === "mark_paid_mismatch";
      if (!ok) await repo.forgetWebhookEvent(event.id);
      return ok;
    }
    if (type === "PAYMENT.CAPTURE.PENDING") {
      const p = await findPurchase();
      if (p && p.payment_status !== "COMPLETED") await repo.update(p.id, { payment_status: "PENDING" });
      return true;
    }
    if (type === "PAYMENT.CAPTURE.DENIED" || type === "PAYMENT.CAPTURE.DECLINED") {
      const p = await findPurchase();
      if (p && p.payment_status !== "COMPLETED") await repo.update(p.id, { payment_status: "FAILED", last_error: type.toLowerCase() });
      return true;
    }
    if (type === "PAYMENT.CAPTURE.REFUNDED" || type === "PAYMENT.CAPTURE.REVERSED") {
      const p = (res.id ? await repo.findByCapture(res.id) : null) ?? (await findPurchase());
      if (p) await repo.update(p.id, { payment_status: "REFUNDED" });
      return true;
    }
    if (type === "CUSTOMER.DISPUTE.CREATED") {
      const cap = res.disputed_transactions?.[0]?.seller_transaction_id;
      const p = cap ? await repo.findByCapture(cap) : null;
      if (p) await repo.update(p.id, { payment_status: "DISPUTED" });
      return true;
    }
    return true; // CHECKOUT.ORDER.APPROVED y otros: se confirman sin acción
  } catch (e) {
    console.error(`[webhook] error ${e instanceof Error ? e.message : "unknown"}`);
    await repo.forgetWebhookEvent(event.id).catch(() => undefined);
    return false;
  }
}
