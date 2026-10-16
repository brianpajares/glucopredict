import "server-only";
import { paypalConfig, reportPrice } from "@/lib/env";

/** PayPal Checkout Orders v2 — solo servidor. Precio y moneda se fijan aquí, nunca en el cliente. */

export interface PaypalOrder {
  id: string;
  status: string;
  purchase_units?: {
    reference_id?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: { currency_code?: string; value?: string };
    payee?: { merchant_id?: string };
    payments?: { captures?: { id: string; status: string; amount?: { currency_code?: string; value?: string } }[] };
  }[];
}

export class PaypalError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 0,
  ) {
    super(code);
    this.name = "PaypalError";
  }
}

type Fetch = typeof fetch;

function baseUrl(): string {
  return paypalConfig().env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

let tokenCache: { token: string; exp: number; key: string } | null = null;

export async function getAccessToken(fetchImpl: Fetch = fetch): Promise<string> {
  const cfg = paypalConfig();
  const cacheKey = `${cfg.env}:${cfg.clientId}`;
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.exp > Date.now() + 30_000) return tokenCache.token;
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetchImpl(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new PaypalError(`paypal_auth_${res.status}`, res.status);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, exp: Date.now() + data.expires_in * 1000, key: cacheKey };
  return data.access_token;
}

export function resetPaypalTokenCache(): void {
  tokenCache = null;
}

async function api<T>(path: string, init: RequestInit & { requestId?: string }, fetchImpl: Fetch): Promise<T> {
  const token = await getAccessToken(fetchImpl);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;
  const res = await fetchImpl(`${baseUrl()}${path}`, { method: init.method, body: init.body, headers });
  const body = (await res.json().catch(() => ({}))) as T & { name?: string };
  if (!res.ok) {
    console.error(`[paypal] ${init.method ?? "GET"} ${path.split("?")[0].replace(/\/[A-Z0-9]{10,}/g, "/:id")} -> ${res.status} ${(body as { name?: string }).name ?? ""}`);
    throw new PaypalError(`paypal_${res.status}_${String((body as { name?: string }).name ?? "error").toLowerCase()}`, res.status);
  }
  return body;
}

export async function createOrder(a: { purchaseId: string; requestId: string }, fetchImpl: Fetch = fetch): Promise<PaypalOrder> {
  const price = reportPrice();
  return api<PaypalOrder>(
    "/v2/checkout/orders",
    {
      method: "POST",
      requestId: a.requestId,
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: a.purchaseId,
            custom_id: a.purchaseId,
            invoice_id: `GP-${a.purchaseId.replace(/-/g, "").slice(0, 16).toUpperCase()}`,
            description: "GlucoPredict - informe completo (PDF)",
            amount: { currency_code: price.currency, value: price.value },
          },
        ],
        application_context: { brand_name: "GlucoPredict", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
      }),
    },
    fetchImpl,
  );
}

export async function captureOrder(orderId: string, requestId: string, fetchImpl: Fetch = fetch): Promise<PaypalOrder> {
  return api<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: "POST", requestId, body: "{}" }, fetchImpl);
}

export async function getOrder(orderId: string, fetchImpl: Fetch = fetch): Promise<PaypalOrder> {
  return api<PaypalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: "GET" }, fetchImpl);
}

export type CaptureVerdict =
  | { kind: "completed"; captureId: string; amount: string; currency: string }
  | { kind: "pending"; captureId: string }
  | { kind: "rejected"; reason: string };

export function normalizeAmount(v: string | undefined): string {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

/**
 * Valida TODO antes de entregar: order id, una sola purchase_unit, custom_id, estado, importe y moneda exactos,
 * y merchant esperado (si está configurado). Pura y testeable.
 */
export function judgeOrder(
  order: PaypalOrder,
  expected: { purchaseId: string; orderId: string; amount: string; currency: string; merchantId?: string },
): CaptureVerdict {
  if (order.id !== expected.orderId) return { kind: "rejected", reason: "order_id_mismatch" };
  const units = order.purchase_units ?? [];
  if (units.length !== 1) return { kind: "rejected", reason: "purchase_units_not_one" };
  const pu = units[0];
  if (pu.custom_id !== expected.purchaseId || (pu.reference_id && pu.reference_id !== expected.purchaseId)) {
    return { kind: "rejected", reason: "custom_id_mismatch" };
  }
  if (expected.merchantId && pu.payee?.merchant_id !== expected.merchantId) return { kind: "rejected", reason: "merchant_mismatch" };
  const captures = pu.payments?.captures ?? [];
  const cap = captures.find((c) => c.status === "COMPLETED") ?? captures.find((c) => c.status === "PENDING") ?? captures[0];
  if (!cap) return { kind: "rejected", reason: "no_capture" };
  if (cap.status === "PENDING") return { kind: "pending", captureId: cap.id };
  if (cap.status !== "COMPLETED") return { kind: "rejected", reason: `capture_${cap.status.toLowerCase()}` };
  if (cap.amount?.currency_code !== expected.currency) return { kind: "rejected", reason: "currency_mismatch" };
  if (normalizeAmount(cap.amount?.value) !== expected.amount) return { kind: "rejected", reason: "amount_mismatch" };
  return { kind: "completed", captureId: cap.id, amount: expected.amount, currency: expected.currency };
}

export async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
  fetchImpl: Fetch = fetch,
): Promise<boolean> {
  const cfg = paypalConfig();
  if (!cfg.webhookId) return false;
  const h = (k: string) => headers.get(k) ?? "";
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return false;
  }
  try {
    const res = await api<{ verification_status?: string }>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: JSON.stringify({
          auth_algo: h("paypal-auth-algo"),
          cert_url: h("paypal-cert-url"),
          transmission_id: h("paypal-transmission-id"),
          transmission_sig: h("paypal-transmission-sig"),
          transmission_time: h("paypal-transmission-time"),
          webhook_id: cfg.webhookId,
          webhook_event: event,
        }),
      },
      fetchImpl,
    );
    return res.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
