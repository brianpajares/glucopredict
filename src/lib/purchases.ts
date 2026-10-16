import "server-only";
import { randomUUID } from "node:crypto";
import type { Locale } from "@/lib/i18n/config";
import { purchaseStorage, supabaseConfig } from "@/lib/env";

export type PaymentStatus = "CREATED" | "AWAITING_PAYMENT" | "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "DISPUTED";
export type FulfillmentStatus = "NOT_STARTED" | "PDF_READY" | "EMAIL_PENDING" | "EMAIL_ACCEPTED" | "DELIVERED_CONFIRMED" | "DELIVERY_FAILED";

export interface Purchase {
  id: string;
  report_id: string;
  email_hash: string;
  /** Payload cifrado (email + inputs clínicos + locale). Se purga tras la retención. */
  payload_ciphertext: string | null;
  locale: Locale;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  amount: string;
  currency: string;
  env: "sandbox" | "live";
  terms_accepted_at: string | null;
  consent_owner_copy: boolean;
  last_error: string | null;
  fulfillment_claimed_at: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewPurchase = Pick<Purchase, "report_id" | "email_hash" | "payload_ciphertext" | "locale" | "amount" | "currency" | "env" | "consent_owner_copy">;
export type MarkPaidResult = "paid" | "already_paid" | "mismatch";

export interface PurchaseRepo {
  /** true => sin base de datos: el estado se reconstruye desde el token de desbloqueo y PayPal. */
  readonly stateless?: boolean;
  /** Solo modo stateless: registra una compra reconstruida para esta instancia. */
  seed?(p: Purchase): void;
  create(p: NewPurchase): Promise<Purchase>;
  get(id: string): Promise<Purchase | null>;
  findByReport(reportId: string): Promise<Purchase | null>;
  findByOrder(orderId: string): Promise<Purchase | null>;
  findByCapture(captureId: string): Promise<Purchase | null>;
  update(id: string, patch: Partial<Omit<Purchase, "id" | "created_at">>): Promise<Purchase>;
  /** Transición atómica a COMPLETED. paypal_capture_id es único: un cobro no puede aplicarse dos veces. */
  markPaid(id: string, orderId: string, captureId: string, amount: string, currency: string): Promise<MarkPaidResult>;
  /** Reclama la entrega en exclusiva (dos procesos nunca envían el mismo correo a la vez). */
  claimFulfillment(id: string, staleMinutes: number): Promise<boolean>;
  /** true si el evento es nuevo; false si ya se procesó (deduplicación por event_id). */
  recordWebhookEvent(eventId: string, type: string): Promise<boolean>;
  /** Libera el evento para que el reintento de PayPal lo procese de nuevo tras un fallo. */
  forgetWebhookEvent(eventId: string): Promise<void>;
  listUndelivered(limit: number): Promise<Purchase[]>;
  purgeExpiredPayloads(olderThanDays: number): Promise<number>;
}

// ---------------------------------------------------------------------------------------------
// Memoria (tests y desarrollo sin base de datos)
// ---------------------------------------------------------------------------------------------
export class MemoryPurchaseRepo implements PurchaseRepo {
  readonly rows = new Map<string, Purchase>();
  readonly events = new Set<string>();

  async create(p: NewPurchase): Promise<Purchase> {
    const now = new Date().toISOString();
    const row: Purchase = {
      ...p,
      id: randomUUID(),
      payment_status: "CREATED",
      fulfillment_status: "NOT_STARTED",
      paypal_order_id: null,
      paypal_capture_id: null,
      terms_accepted_at: null,
      last_error: null,
      fulfillment_claimed_at: null,
      paid_at: null,
      fulfilled_at: null,
      created_at: now,
      updated_at: now,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }
  async get(id: string) {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }
  async findByReport(reportId: string) {
    const r = [...this.rows.values()].find((x) => x.report_id === reportId);
    return r ? { ...r } : null;
  }
  async findByOrder(orderId: string) {
    const r = [...this.rows.values()].find((x) => x.paypal_order_id === orderId);
    return r ? { ...r } : null;
  }
  async findByCapture(captureId: string) {
    const r = [...this.rows.values()].find((x) => x.paypal_capture_id === captureId);
    return r ? { ...r } : null;
  }
  async update(id: string, patch: Partial<Omit<Purchase, "id" | "created_at">>) {
    const r = this.rows.get(id);
    if (!r) throw new Error("purchase_not_found");
    Object.assign(r, patch, { updated_at: new Date().toISOString() });
    return { ...r };
  }
  async markPaid(id: string, orderId: string, captureId: string, amount: string, currency: string): Promise<MarkPaidResult> {
    const r = this.rows.get(id);
    if (!r) return "mismatch";
    if (r.amount !== amount || r.currency !== currency) return "mismatch";
    if (r.payment_status === "COMPLETED") return r.paypal_capture_id === captureId ? "already_paid" : "mismatch";
    const dup = [...this.rows.values()].find((x) => x.id !== id && x.paypal_capture_id === captureId);
    if (dup) return "mismatch";
    r.payment_status = "COMPLETED";
    r.paypal_order_id = orderId;
    r.paypal_capture_id = captureId;
    r.paid_at = new Date().toISOString();
    r.updated_at = r.paid_at;
    return "paid";
  }
  async claimFulfillment(id: string, staleMinutes: number): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r || r.payment_status !== "COMPLETED") return false;
    if (r.fulfillment_status === "EMAIL_ACCEPTED" || r.fulfillment_status === "DELIVERED_CONFIRMED") return false;
    const claimed = r.fulfillment_claimed_at ? Date.parse(r.fulfillment_claimed_at) : 0;
    if (claimed && Date.now() - claimed < staleMinutes * 60_000 && r.fulfillment_status === "EMAIL_PENDING") return false;
    r.fulfillment_status = "EMAIL_PENDING";
    r.fulfillment_claimed_at = new Date().toISOString();
    return true;
  }
  async recordWebhookEvent(eventId: string): Promise<boolean> {
    if (this.events.has(eventId)) return false;
    this.events.add(eventId);
    return true;
  }
  async forgetWebhookEvent(eventId: string): Promise<void> {
    this.events.delete(eventId);
  }
  async listUndelivered(limit: number) {
    return [...this.rows.values()]
      .filter((r) => r.payment_status === "COMPLETED" && !["EMAIL_ACCEPTED", "DELIVERED_CONFIRMED"].includes(r.fulfillment_status))
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }
  async purgeExpiredPayloads(olderThanDays: number) {
    let n = 0;
    const cutoff = Date.now() - olderThanDays * 86_400_000;
    for (const r of this.rows.values()) {
      if (r.payload_ciphertext && Date.parse(r.created_at) < cutoff && r.payment_status !== "COMPLETED") {
        r.payload_ciphertext = null;
        n++;
      } else if (r.payload_ciphertext && r.fulfilled_at && Date.parse(r.fulfilled_at) < cutoff) {
        r.payload_ciphertext = null;
        n++;
      }
    }
    return n;
  }
}

// ---------------------------------------------------------------------------------------------
// Sin base de datos: caché caliente por instancia (NO es fuente de verdad)
// ---------------------------------------------------------------------------------------------
/**
 * Modo sin base de datos. Cada petición reconstruye la compra desde el token de desbloqueo (que ya lleva email,
 * inputs e idioma cifrados) y consulta a PayPal. Esta clase solo da continuidad dentro de una misma petición/instancia.
 * Idempotencia entre instancias: PayPal solo permite una captura por orden y Resend deduplica por Idempotency-Key.
 */
export class StatelessPurchaseRepo extends MemoryPurchaseRepo {
  readonly stateless = true;

  seed(p: Purchase): void {
    if (this.rows.size > 500) this.prune();
    if (!this.rows.has(p.id)) this.rows.set(p.id, { ...p });
  }
  clear(): void {
    this.rows.clear();
    this.events.clear();
  }
  private prune(): void {
    const cutoff = Date.now() - 60 * 60_000;
    for (const [id, r] of this.rows) if (Date.parse(r.created_at) < cutoff) this.rows.delete(id);
  }
  async create(p: NewPurchase): Promise<Purchase> {
    const now = new Date().toISOString();
    const row: Purchase = {
      ...p,
      id: p.report_id, // el id de compra es el id del informe: así custom_id de PayPal se valida sin base de datos
      payment_status: "CREATED",
      fulfillment_status: "NOT_STARTED",
      paypal_order_id: null,
      paypal_capture_id: null,
      terms_accepted_at: null,
      last_error: null,
      fulfillment_claimed_at: null,
      paid_at: null,
      fulfilled_at: null,
      created_at: now,
      updated_at: now,
    };
    this.seed(row);
    return { ...this.rows.get(row.id)! };
  }
  async findByReport(): Promise<Purchase | null> {
    return null; // se reconstruye desde el token
  }
  async listUndelivered(): Promise<Purchase[]> {
    return []; // sin cola: los reintentos los dispara el propio usuario al reabrir su enlace
  }
}

let statelessSingleton: StatelessPurchaseRepo | null = null;
export function resetStatelessCache(): void {
  statelessSingleton?.clear();
}

// ---------------------------------------------------------------------------------------------
// Supabase (REST con service_role, solo servidor)
// ---------------------------------------------------------------------------------------------
export class SupabasePurchaseRepo implements PurchaseRepo {
  constructor(
    private readonly url: string,
    private readonly key: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.url}/rest/v1${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      throw new Error(`supabase_${res.status}_${body.code ?? "error"}`);
    }
    if (res.status === 204) return undefined as T;
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) {
      for (const row of data as { amount?: unknown }[]) {
        if (row && typeof row === "object" && "amount" in row) row.amount = Number(row.amount).toFixed(2);
      }
    }
    return data as T;
  }

  async create(p: NewPurchase): Promise<Purchase> {
    const rows = await this.req<Purchase[]>("/purchases", { method: "POST", body: JSON.stringify(p) });
    return rows[0];
  }
  async get(id: string) {
    const rows = await this.req<Purchase[]>(`/purchases?id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ?? null;
  }
  async findByReport(reportId: string) {
    const rows = await this.req<Purchase[]>(`/purchases?report_id=eq.${encodeURIComponent(reportId)}&limit=1`);
    return rows[0] ?? null;
  }
  async findByOrder(orderId: string) {
    const rows = await this.req<Purchase[]>(`/purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&limit=1`);
    return rows[0] ?? null;
  }
  async findByCapture(captureId: string) {
    const rows = await this.req<Purchase[]>(`/purchases?paypal_capture_id=eq.${encodeURIComponent(captureId)}&limit=1`);
    return rows[0] ?? null;
  }
  async update(id: string, patch: Partial<Omit<Purchase, "id" | "created_at">>) {
    const rows = await this.req<Purchase[]>(`/purchases?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
    if (!rows[0]) throw new Error("purchase_not_found");
    return rows[0];
  }
  async markPaid(id: string, orderId: string, captureId: string, amount: string, currency: string): Promise<MarkPaidResult> {
    const r = await this.req<string>("/rpc/gp_purchase_mark_paid", {
      method: "POST",
      body: JSON.stringify({ p_id: id, p_order: orderId, p_capture: captureId, p_amount: amount, p_currency: currency }),
    });
    return r as MarkPaidResult;
  }
  async claimFulfillment(id: string, staleMinutes: number): Promise<boolean> {
    return this.req<boolean>("/rpc/gp_purchase_claim_fulfillment", { method: "POST", body: JSON.stringify({ p_id: id, p_stale_minutes: staleMinutes }) });
  }
  async recordWebhookEvent(eventId: string, type: string): Promise<boolean> {
    try {
      await this.req("/paypal_webhook_events", { method: "POST", body: JSON.stringify({ event_id: eventId, event_type: type }) });
      return true;
    } catch (e) {
      if (e instanceof Error && e.message.includes("23505")) return false;
      throw e;
    }
  }
  async forgetWebhookEvent(eventId: string): Promise<void> {
    await this.req(`/paypal_webhook_events?event_id=eq.${encodeURIComponent(eventId)}`, { method: "DELETE" });
  }
  async listUndelivered(limit: number) {
    return this.req<Purchase[]>(
      `/purchases?payment_status=eq.COMPLETED&fulfillment_status=not.in.(EMAIL_ACCEPTED,DELIVERED_CONFIRMED)&order=created_at.asc&limit=${limit}`,
    );
  }
  async purgeExpiredPayloads(olderThanDays: number): Promise<number> {
    const n = await this.req<number>("/rpc/gp_purge_expired_payloads", { method: "POST", body: JSON.stringify({ p_days: olderThanDays }) });
    return typeof n === "number" ? n : 0;
  }
}

let override: PurchaseRepo | null | undefined;

/** Solo para tests: inyecta un repositorio (o null para simular "sin base de datos"). */
export function setPurchaseRepoForTests(repo: PurchaseRepo | null | undefined): void {
  override = repo;
}

export function getPurchaseRepo(): PurchaseRepo | null {
  if (override !== undefined) return override;
  const storage = purchaseStorage();
  if (storage === "stateless") return (statelessSingleton ??= new StatelessPurchaseRepo());
  const cfg = supabaseConfig();
  return storage === "supabase" && cfg ? new SupabasePurchaseRepo(cfg.url, cfg.key) : null;
}

export function publicStatus(p: Purchase): { payment: PaymentStatus; delivery: FulfillmentStatus } {
  return { payment: p.payment_status, delivery: p.fulfillment_status };
}
