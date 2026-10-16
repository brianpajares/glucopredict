import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clean, extractEmail, fromEmail, ownerEmail, paypalConfig, reportPrice, resendKeyState, retentionDays } from "@/lib/env";
import { redactEmails, sendEmail } from "@/lib/email/resend";
import { ownerLeadEmail, ownerSaleEmail, previewEmail, reportEmail } from "@/lib/email/templates";
import { TokenError, canonicalize, emailHash, open, seal, verificationId } from "@/lib/token";
import { setEnv } from "./helpers/fakes";

beforeEach(() => setEnv());
afterEach(() => vi.unstubAllGlobals());

describe("normalización de variables de entorno (lecciones PivotWorth #2/#3)", () => {
  it("extrae solo la dirección aunque se haya pegado texto o comillas", () => {
    expect(extractEmail("info@zone-digital.com (ya es el valor por defecto)")).toBe("info@zone-digital.com");
    expect(extractEmail('"Info@Zone-Digital.com"')).toBe("info@zone-digital.com");
    expect(extractEmail("sin correo")).toBeNull();
    setEnv({ OWNER_EMAIL: "info@zone-digital.com (ya es el valor por defecto)" });
    expect(ownerEmail()).toBe("info@zone-digital.com");
    setEnv({ OWNER_EMAIL: "basura" });
    expect(ownerEmail()).toBe("info@zone-digital.com"); // valor por defecto seguro
  });

  it("el remitente siempre es «Nombre <correo@dominio>»", () => {
    setEnv({ RESEND_FROM_EMAIL: '"GlucoPredict <reportes@midominio.com>"' });
    expect(fromEmail()).toBe("GlucoPredict <reportes@midominio.com>");
    setEnv({ RESEND_FROM_EMAIL: "reportes@midominio.com" });
    expect(fromEmail()).toBe("GlucoPredict <reportes@midominio.com>");
    setEnv({ RESEND_FROM_EMAIL: undefined, OWNER_EMAIL: "dueno@x.test" });
    expect(fromEmail()).toBe("GlucoPredict <dueno@x.test>");
  });

  it("estado de la API key de Resend", () => {
    setEnv({ RESEND_API_KEY: undefined });
    expect(resendKeyState()).toBe("missing");
    setEnv({ RESEND_API_KEY: "re_replace_me" });
    expect(resendKeyState()).toBe("placeholder");
    setEnv({ RESEND_API_KEY: "clave-rara" });
    expect(resendKeyState()).toBe("unexpected_format");
    setEnv({ RESEND_API_KEY: "'re_abcdefgh12345678'" });
    expect(resendKeyState()).toBe("ok");
    expect(clean(' "valor" ')).toBe("valor");
  });

  it("PayPal LIVE necesita doble interruptor", () => {
    setEnv({ PAYPAL_ENV: "live", PAYMENTS_LIVE_APPROVED: "false" });
    expect(paypalConfig()).toMatchObject({ env: "live", liveBlocked: true, usable: false });
    setEnv({ PAYPAL_ENV: "live", PAYMENTS_LIVE_APPROVED: "true" });
    expect(paypalConfig()).toMatchObject({ liveBlocked: false, usable: true });
    setEnv({ PAYPAL_ENV: undefined });
    expect(paypalConfig().env).toBe("sandbox");
  });

  it("precio y retención con valores por defecto y límites", () => {
    expect(reportPrice()).toEqual({ value: "9.00", currency: "USD", label: "US$9" });
    setEnv({ REPORT_PRICE_USD: "12.5" });
    expect(reportPrice().label).toBe("US$12.50");
    setEnv({ REPORT_PRICE_USD: "0.01" });
    expect(reportPrice().value).toBe("9.00");
    expect(retentionDays()).toBe(30);
  });
});

describe("Resend", () => {
  const args = { to: "a@b.test", subject: "s", html: "<p>x</p>", text: "x", idempotencyKey: "k-1" };

  it("Idempotency-Key va en la cabecera, no en el payload", async () => {
    let seen: { headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const f = vi.fn(async (_u: RequestInfo | URL, init?: RequestInit) => {
      seen = { headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) };
      return new Response(JSON.stringify({ id: "em_1" }), { status: 200 });
    });
    const r = await sendEmail(args, f as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, id: "em_1" });
    expect(seen!.headers["Idempotency-Key"]).toBe("k-1");
    expect(JSON.stringify(seen!.body)).not.toMatch(/idempotency/i);
    expect(seen!.body.from).toBe("GlucoPredict <reportes@dominio-prueba.test>");
  });

  it.each([
    [403, { name: "validation_error", message: "domain not verified" }, "resend_403_validation_error"],
    [422, { name: "validation_error", message: "Invalid `to` field" }, "resend_422_validation_error_to"],
    [422, { name: "validation_error", message: "Invalid `from` field" }, "resend_422_validation_error_from"],
    [429, { name: "rate_limit_exceeded", message: "slow down" }, "resend_429_rate_limit_exceeded"],
  ])("HTTP %s → ref %s", async (status, body, ref) => {
    const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    const r = await sendEmail(args, f as unknown as typeof fetch);
    expect(r).toMatchObject({ ok: false, ref });
  });

  it("sin API key informa el ref de configuración y no hace red", async () => {
    setEnv({ RESEND_API_KEY: undefined });
    const f = vi.fn();
    const r = await sendEmail(args, f as unknown as typeof fetch);
    expect(r).toMatchObject({ ok: false, ref: "email_not_configured_RESEND_API_KEY_missing" });
    expect(f).not.toHaveBeenCalled();
  });

  it("los logs ocultan los emails de terceros", () => {
    expect(redactEmails("Invalid to: persona@dominio.com y otra@x.org")).toBe("Invalid to: [email] y [email]");
  });
});

describe("plantillas de correo (AT-09/AT-10)", () => {
  it("el asunto del usuario no contiene score ni condición clínica", () => {
    for (const l of ["es", "en", "pt"] as const) {
      const p = previewEmail(l, { unlockUrl: "https://x.test/u", priceLabel: "US$9", days: 30 });
      const r = reportEmail(l, "paid");
      for (const m of [p, r]) expect(m.subject).not.toMatch(/\d|diabet|score|riesgo|risk|risco/i);
      expect(p.html).toContain("https://x.test/u");
      expect(p.html).toContain("US$9");
    }
  });
  it("asunto exacto del aviso al dueño y de venta", () => {
    expect(ownerLeadEmail({ id: "abc", locale: "es", country: "PE", mode: "preview", withCopy: false }).subject).toBe("[GlucoPredict] Solicitud de informe abc");
    expect(ownerSaleEmail({ id: "ID1", priceLabel: "US$9", delivery: "ENTREGADO", env: "live", captureId: "C", withCopy: false }).subject).toBe("GlucoPredict | VENTA CONFIRMADA US$9 | ID1 | ENTREGADO");
  });
  it("escapa HTML en el contenido", () => {
    const m = previewEmail("es", { unlockUrl: 'https://x.test/?a="b"<script>', priceLabel: "US$9", days: 30 });
    expect(m.html).not.toContain("<script>");
  });
});

describe("tokens AES-256-GCM", () => {
  it("ida y vuelta con tipo y caducidad", () => {
    const t = seal("unlock", { a: 1, email: "x@y.test" }, 1);
    expect(open("unlock", t)).toEqual({ a: 1, email: "x@y.test" });
    expect(t).not.toContain("x@y.test"); // nada en claro
    expect(() => open("payload", t)).toThrowError(TokenError);
  });
  it("expirado, manipulado, mal formado y secreto distinto fallan", () => {
    const expired = seal("unlock", {}, -1);
    expect(() => open("unlock", expired)).toThrowError("token_expired");
    const t = seal("unlock", { a: 1 }, 1);
    const tampered = `${t.slice(0, -3)}${t.endsWith("AAA") ? "BBB" : "AAA"}`;
    expect(() => open("unlock", tampered)).toThrowError("token_tampered");
    expect(() => open("unlock", "abc")).toThrowError("token_malformed");
    expect(() => open("unlock", t, "otro-secreto-otro-secreto-otro-secreto-12345")).toThrowError("token_tampered");
  });
  it("id de verificación opaco y estable; hash de email determinista", () => {
    const a = verificationId(canonicalize({ b: 2, a: 1 }), "2.0");
    expect(a).toMatch(/^GP-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(verificationId(canonicalize({ a: 1, b: 2 }), "2.0")).toBe(a);
    expect(verificationId(canonicalize({ a: 1, b: 3 }), "2.0")).not.toBe(a);
    expect(emailHash(" A@B.test ")).toBe(emailHash("a@b.test"));
  });
});
