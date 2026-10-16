import "server-only";

/**
 * Lectura normalizada de variables de entorno (solo servidor).
 * Lección PivotWorth: Vercel guarda lo que se pega — comillas, espacios y texto extra rompen Resend (422).
 * Aquí se limpia todo al leer y se usa un valor por defecto seguro si no es válido.
 */

export type MonetizationMode = "validation" | "paypal";
export type PaypalEnv = "sandbox" | "live";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function clean(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
}

/** Extrae solo la dirección de correo de un texto con comillas, nombre o comentarios pegados. */
export function extractEmail(value: string | undefined | null): string | null {
  const m = clean(value).match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

const DEFAULT_OWNER = "info@zone-digital.com";

export function ownerEmail(): string {
  return extractEmail(process.env.OWNER_EMAIL) ?? DEFAULT_OWNER;
}

export function adminNoticeEmail(): string {
  return extractEmail(process.env.GLUCOPREDICT_ADMIN_EMAIL) ?? ownerEmail();
}

/** Remitente siempre "Nombre <correo@dominio>". */
export function fromEmail(): string {
  const raw = clean(process.env.RESEND_FROM_EMAIL);
  const addr = extractEmail(raw) ?? extractEmail(process.env.OWNER_EMAIL) ?? DEFAULT_OWNER;
  const nameMatch = raw.match(/^([^<@]+?)\s*</);
  const name = nameMatch ? clean(nameMatch[1]).replace(/[<>"]/g, "") : "GlucoPredict";
  return `${name || "GlucoPredict"} <${addr}>`;
}

export function fromDomain(): string {
  const m = fromEmail().match(/@([^>]+)>/);
  return m ? m[1] : "";
}

export function resendKeyState(): "missing" | "placeholder" | "unexpected_format" | "ok" {
  const key = clean(process.env.RESEND_API_KEY);
  if (!key) return "missing";
  if (/replace|example|xxxx|your/i.test(key) || key === "re_") return "placeholder";
  if (!/^re_[A-Za-z0-9_-]{8,}$/.test(key)) return "unexpected_format";
  return "ok";
}

export function resendKey(): string | null {
  return resendKeyState() === "ok" ? clean(process.env.RESEND_API_KEY) : null;
}

export function tokenSecret(): string | null {
  const s = clean(process.env.REPORT_TOKEN_SECRET) || clean(process.env.REPORT_LINK_SECRET);
  return s.length >= 32 ? s : null;
}

export function appUrl(): string {
  const configured = clean(process.env.NEXT_PUBLIC_APP_URL);
  if (/^https?:\/\//.test(configured)) return configured.replace(/\/+$/, "");
  const vercel = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) || clean(process.env.VERCEL_URL);
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function monetizationMode(): MonetizationMode {
  return clean(process.env.MONETIZATION_MODE).toLowerCase() === "paypal" ? "paypal" : "validation";
}

export function paypalEnv(): PaypalEnv {
  return clean(process.env.PAYPAL_ENV).toLowerCase() === "live" ? "live" : "sandbox";
}

export interface PaypalConfig {
  env: PaypalEnv;
  clientId: string;
  clientSecret: string;
  webhookId: string;
  merchantId: string;
  liveApproved: boolean;
  /** Credenciales mínimas presentes. */
  configured: boolean;
  /** Configurado y (sandbox o LIVE aprobado con doble interruptor). */
  usable: boolean;
  liveBlocked: boolean;
}

export function paypalConfig(): PaypalConfig {
  const env = paypalEnv();
  const clientId = clean(process.env.PAYPAL_CLIENT_ID);
  const clientSecret = clean(process.env.PAYPAL_CLIENT_SECRET);
  const webhookId = clean(process.env.PAYPAL_WEBHOOK_ID);
  const merchantId = clean(process.env.PAYPAL_MERCHANT_ID);
  const liveApproved = clean(process.env.PAYMENTS_LIVE_APPROVED).toLowerCase() === "true";
  const configured = clientId.length > 0 && clientSecret.length > 0;
  const liveBlocked = env === "live" && !liveApproved;
  return { env, clientId, clientSecret, webhookId, merchantId, liveApproved, configured, usable: configured && !liveBlocked, liveBlocked };
}

export function supabaseConfig(): { url: string; key: string } | null {
  const url = clean(process.env.SUPABASE_URL).replace(/\/+$/, "");
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!/^https:\/\//.test(url) || key.length < 20 || /replace/i.test(key) || /project-ref/.test(url)) return null;
  return { url, key };
}

export type PurchaseStorage = "supabase" | "stateless" | "none";

/**
 * Dónde viven las compras. `PURCHASE_STORAGE=stateless` => sin base de datos (PayPal es el libro contable;
 * ver DECISIONS.md D-16). Si no, Supabase cuando está configurado; si no, "none" (pagos deshabilitados).
 */
export function purchaseStorage(): PurchaseStorage {
  if (clean(process.env.PURCHASE_STORAGE).toLowerCase() === "stateless") return "stateless";
  return supabaseConfig() ? "supabase" : "none";
}

/** Precio en servidor únicamente. Hipótesis preliminar de spec/monetizacion.json (US: USD 9). */
export function reportPrice(): { value: string; currency: "USD"; label: string } {
  const raw = clean(process.env.REPORT_PRICE_USD);
  const n = Number(raw);
  const value = Number.isFinite(n) && n >= 1 && n <= 100 ? n.toFixed(2) : "9.00";
  return { value, currency: "USD", label: `US$${Number(value) % 1 === 0 ? Number(value).toFixed(0) : value}` };
}

export function retentionDays(): number {
  const n = Number(clean(process.env.REPORT_RETENTION_DAYS));
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : 30;
}

export function cronSecret(): string | null {
  const s = clean(process.env.CRON_SECRET);
  return s.length >= 16 ? s : null;
}

export function deploymentInfo(): { deployment: "production" | "preview" | "local"; branch: string | null; commit: string | null } {
  const v = clean(process.env.VERCEL_ENV);
  const deployment = v === "production" ? "production" : v === "preview" ? "preview" : "local";
  const commit = clean(process.env.VERCEL_GIT_COMMIT_SHA);
  return { deployment, branch: clean(process.env.VERCEL_GIT_COMMIT_REF) || null, commit: commit ? commit.slice(0, 7) : null };
}
