import { vi } from "vitest";
import { PDFArray, PDFDocument, PDFRawStream, PDFRef, decodePDFRawStream } from "pdf-lib";
import type { EngineInputs } from "@/lib/engine/types";
import { MemoryPurchaseRepo, setPurchaseRepoForTests } from "@/lib/purchases";
import { resetPaypalTokenCache } from "@/lib/paypal";
import { resetRateLimits } from "@/lib/security";
import { resetRecentRequests } from "@/lib/leads";

/** Perfil 100 % sintético (CLAUDE.md: nunca PII real). */
export const SYNTH_INPUTS: EngineInputs = {
  country_code: "PE",
  age: 52,
  waist_threshold_sex: "female",
  body_measurements: { height_cm: 160, weight_kg: 80, waist_cm: 95 },
  physical_activity_30m_daily: false,
  fruit_veg_daily: false,
  antihypertensive_medication: true,
  history_high_glucose: false,
  family_history: "first_degree",
};

export interface SentMail {
  to: string[];
  subject: string;
  attachments: { filename: string; content: string }[];
  idempotencyKey: string | null;
}

export interface Net {
  sent: SentMail[];
  resendDown: boolean;
  /** Resultado de la captura por orden. */
  captureOutcome: (orderId: string, order: FakeOrder) => "COMPLETED" | "PENDING" | "DECLINED";
  mutateCapture: (order: FakeOrder) => void;
  orders: Map<string, FakeOrder>;
  signatureValid: boolean;
  calls: string[];
}

export interface FakeOrder {
  id: string;
  custom_id: string;
  amount: string;
  currency: string;
  merchant: string;
  status: string;
  captureId?: string;
  captureStatus?: string;
  captureAmount?: string;
  captureCurrency?: string;
}

let orderSeq = 0;

export function installNet(): Net {
  const net: Net = {
    sent: [],
    resendDown: false,
    captureOutcome: () => "COMPLETED",
    mutateCapture: () => undefined,
    orders: new Map(),
    signatureValid: true,
    calls: [],
  };

  const orderJson = (o: FakeOrder) => ({
    id: o.id,
    status: o.status,
    purchase_units: [
      {
        reference_id: o.custom_id,
        custom_id: o.custom_id,
        amount: { currency_code: o.currency, value: o.amount },
        payee: { merchant_id: o.merchant },
        payments: o.captureId
          ? { captures: [{ id: o.captureId, status: o.captureStatus ?? "COMPLETED", amount: { currency_code: o.captureCurrency ?? o.currency, value: o.captureAmount ?? o.amount } }] }
          : undefined,
      },
    ],
  });

  const fake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : undefined;
    const res = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
    net.calls.push(`${method} ${url.replace(/https:\/\/api(-m)?\.(sandbox\.)?(paypal|resend)\.com/, "")}`);

    if (url.endsWith("/v1/oauth2/token")) return res(200, { access_token: "tok", expires_in: 3600 });
    if (url.endsWith("/v2/checkout/orders") && method === "POST") {
      const pu = body.purchase_units[0];
      const o: FakeOrder = {
        id: `ORDER${++orderSeq}XXXXXXXX`,
        custom_id: pu.custom_id,
        amount: pu.amount.value,
        currency: pu.amount.currency_code,
        merchant: "MERCHANT1",
        status: "CREATED",
      };
      net.orders.set(o.id, o);
      return res(201, orderJson(o));
    }
    const cap = url.match(/\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (cap && method === "POST") {
      const o = net.orders.get(cap[1]);
      if (!o) return res(404, { name: "RESOURCE_NOT_FOUND" });
      const outcome = net.captureOutcome(o.id, o);
      if (outcome === "DECLINED") return res(422, { name: "INSTRUMENT_DECLINED" });
      o.captureId = `CAP-${o.id}`;
      o.captureStatus = outcome;
      o.status = outcome === "COMPLETED" ? "COMPLETED" : "PENDING";
      net.mutateCapture(o);
      return res(201, orderJson(o));
    }
    const get = url.match(/\/v2\/checkout\/orders\/([^/]+)$/);
    if (get && method === "GET") {
      const o = net.orders.get(get[1]);
      return o ? res(200, orderJson(o)) : res(404, { name: "RESOURCE_NOT_FOUND" });
    }
    if (url.endsWith("/v1/notifications/verify-webhook-signature")) {
      return res(200, { verification_status: net.signatureValid ? "SUCCESS" : "FAILURE" });
    }
    if (url === "https://api.resend.com/emails") {
      if (net.resendDown) return res(500, { name: "internal_server_error", message: "down" });
      const p = body as { to: string[]; subject: string; attachments?: { filename: string; content: string }[] };
      const headers = init?.headers as Record<string, string>;
      net.sent.push({ to: p.to, subject: p.subject, attachments: p.attachments ?? [], idempotencyKey: headers["Idempotency-Key"] ?? null });
      return res(200, { id: `em_${net.sent.length}` });
    }
    return res(404, { name: "unexpected_url", message: url });
  });
  vi.stubGlobal("fetch", fake);
  return net;
}

export function setEnv(overrides: Record<string, string | undefined> = {}): void {
  const base: Record<string, string | undefined> = {
    MONETIZATION_MODE: "paypal",
    PAYPAL_ENV: "sandbox",
    PAYPAL_CLIENT_ID: "test_client_id",
    PAYPAL_CLIENT_SECRET: "test_client_secret",
    PAYPAL_WEBHOOK_ID: "WH-TEST",
    PAYPAL_MERCHANT_ID: "MERCHANT1",
    PAYMENTS_LIVE_APPROVED: "false",
    RESEND_API_KEY: "re_test_1234567890",
    RESEND_FROM_EMAIL: "GlucoPredict <reportes@dominio-prueba.test>",
    OWNER_EMAIL: "dueno@dominio-prueba.test",
    REPORT_TOKEN_SECRET: "test-secret-test-secret-test-secret-0123456789",
    NEXT_PUBLIC_APP_URL: "https://app.dominio-prueba.test",
    REPORT_PRICE_USD: "9.00",
    SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    CRON_SECRET: "cron-secret-cron-secret",
  };
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

export function freshState(): MemoryPurchaseRepo {
  const repo = new MemoryPurchaseRepo();
  setPurchaseRepoForTests(repo);
  resetPaypalTokenCache();
  resetRateLimits();
  resetRecentRequests();
  return repo;
}

/** Extrae el texto escrito en un PDF de pdf-lib (strings hex de Helvetica/WinAnsi). */
export async function extractPdfText(bytes: Uint8Array | string): Promise<string> {
  const data = typeof bytes === "string" ? Buffer.from(bytes, "base64") : bytes;
  const doc = await PDFDocument.load(data);
  let out = "";
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      let content: Uint8Array;
      try {
        content = decodePDFRawStream(obj).decode();
      } catch {
        continue;
      }
      const text = Buffer.from(content).toString("latin1");
      for (const m of text.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
        const hex = m[1];
        let s = "";
        for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
        out += `${s}\n`;
      }
    }
  }
  void PDFArray;
  void PDFRef;
  return out;
}

export async function countUriAnnotations(bytes: Uint8Array | string): Promise<number> {
  const data = typeof bytes === "string" ? Buffer.from(bytes, "base64") : bytes;
  const doc = await PDFDocument.load(data);
  let n = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const s = String(obj);
    if (s.includes("/Link") && s.includes("/URI")) n++;
  }
  return n;
}
