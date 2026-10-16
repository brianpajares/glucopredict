import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutFailure, captureAndFulfill, createPaypalOrder, handleWebhookEvent, startPurchase } from "@/lib/checkout";
import { fulfill } from "@/lib/fulfillment";
import { requestReport } from "@/lib/leads";
import { judgeOrder, type PaypalOrder } from "@/lib/paypal";
import type { MemoryPurchaseRepo } from "@/lib/purchases";
import { POST as webhookPOST } from "@/app/api/paypal/webhook/route";
import { SYNTH_INPUTS, extractPdfText, freshState, installNet, setEnv, type Net } from "./helpers/fakes";

let net: Net;
let repo: MemoryPurchaseRepo;

const REQ = (email: string, over: Record<string, unknown> = {}) => ({
  locale: "es",
  country_code: "PE",
  inputs: (({ country_code: _c, ...rest }) => rest)(SYNTH_INPUTS),
  email,
  consent_report_delivery: true,
  consent_owner_copy: false,
  ...over,
});

async function requestPaid(email = "cliente1@dominio-prueba.test", over: Record<string, unknown> = {}) {
  const r = await requestReport(REQ(email, over), "203.0.113.5");
  expect(r.status).toBe(200);
  const body = r.body as { unlock_url: string; report_id: string };
  const token = body.unlock_url.split("/unlock/")[1];
  return { token, body };
}

beforeEach(() => {
  setEnv();
  repo = freshState();
  net = installNet();
});
afterEach(() => vi.unstubAllGlobals());

const deliveries = () => net.sent.filter((m) => m.attachments.some((a) => /\.pdf$/.test(a.filename) && !/vista-previa|COMPLETO/.test(a.filename)));

describe("solicitud de informe (modo de pago listo)", () => {
  it("envía vista previa con enlace de desbloqueo y NO devuelve el informe", async () => {
    const { body } = await requestPaid();
    expect(JSON.stringify(body)).not.toMatch(/"score"|"components"|"report"/);
    const userMail = net.sent.find((m) => m.to[0] === "cliente1@dominio-prueba.test")!;
    expect(userMail.attachments[0].filename).toMatch(/vista-previa\.pdf$/);
    expect(userMail.idempotencyKey).toMatch(/^gp-preview-/);
    // aviso al dueño sin datos de salud (sin consentimiento de copia)
    const owner = net.sent.find((m) => m.to[0] === "dueno@dominio-prueba.test")!;
    expect(owner.subject).toMatch(/^\[GlucoPredict\] Solicitud de informe /);
    expect(owner.attachments).toHaveLength(0);
  });

  it("con consent_owner_copy el dueño recibe el PDF completo; el usuario solo la vista previa", async () => {
    await requestPaid("cliente2@dominio-prueba.test", { consent_owner_copy: true });
    const owner = net.sent.find((m) => m.to[0] === "dueno@dominio-prueba.test")!;
    expect(owner.attachments[0].filename).toMatch(/COMPLETO\.pdf$/);
    const ownerText = await extractPdfText(owner.attachments[0].content);
    expect(ownerText).toContain("Padre/madre, hermano/a o hijo/a");
  });

  it("el PDF de vista previa no contiene los valores bloqueados y tiene enlaces de desbloqueo", async () => {
    await requestPaid("cliente3@dominio-prueba.test");
    const pdf = net.sent.find((m) => m.to[0] === "cliente3@dominio-prueba.test")!.attachments[0].content;
    const text = await extractPdfText(pdf);
    for (const secret of ["52 años", "Padre/madre, hermano/a o hijo/a", "31,25", "95,0 cm", "Medicación para presión alta: ", "Reserva una cita"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("19/26"); // el score es gratis
    const { countUriAnnotations } = await import("./helpers/fakes");
    expect(await countUriAnnotations(pdf)).toBeGreaterThanOrEqual(2);
  });

  it("rechaza campos adicionales, strings en booleanos y falta de consentimiento", async () => {
    const extra = await requestReport({ ...REQ("a@dominio-prueba.test"), extra: 1 }, "1.1.1.1");
    expect(extra.status).toBe(400);
    const bad = await requestReport(REQ("b@dominio-prueba.test", { inputs: { ...REQ("x").inputs, fruit_veg_daily: "true" } }), "1.1.1.2");
    expect(bad.status).toBe(400);
    const noConsent = await requestReport(REQ("c@dominio-prueba.test", { consent_report_delivery: false }), "1.1.1.3");
    expect(noConsent.status).toBe(422);
    expect(net.sent).toHaveLength(0);
  });

  it("honeypot: no envía nada", async () => {
    const r = await requestReport(REQ("bot@dominio-prueba.test", { website: "http://spam" }), "9.9.9.9");
    expect(r.status).toBe(200);
    expect(net.sent).toHaveLength(0);
  });

  it("si el proveedor de email cae devuelve ref y no entrega nada", async () => {
    net.resendDown = true;
    const r = await requestReport(REQ("down@dominio-prueba.test"), "5.5.5.5");
    expect(r.status).toBe(502);
    expect((r.body as { ref: string }).ref).toBe("resend_500_internal_server_error");
  });

  it("sin RESEND_API_KEY informa el ref de configuración", async () => {
    setEnv({ RESEND_API_KEY: undefined, MONETIZATION_MODE: "validation" });
    const r = await requestReport(REQ("nokey@dominio-prueba.test"), "6.6.6.6");
    expect(r.status).toBe(503);
    expect((r.body as { ref: string }).ref).toMatch(/^email_not_configured_RESEND_API_KEY/);
  });
});

describe("modo validación (pagos no configurados): informe completo gratis por email", () => {
  it("MONETIZATION_MODE=validation por defecto entrega el informe completo", async () => {
    setEnv({ MONETIZATION_MODE: undefined });
    const r = await requestReport(REQ("free@dominio-prueba.test"), "7.7.7.7");
    expect(r.status).toBe(200);
    expect((r.body as { mode: string }).mode).toBe("free");
    const m = net.sent.find((x) => x.to[0] === "free@dominio-prueba.test")!;
    expect(m.attachments[0].filename).not.toMatch(/vista-previa/);
    const doc = await import("pdf-lib").then((p) => p.PDFDocument.load(Buffer.from(m.attachments[0].content, "base64")));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(10);
  });
});

describe("flujo de pago PayPal (mocks de fetch)", () => {
  async function approveAndCapture(token: string) {
    const { purchase } = await startPurchase(token, true);
    const { orderId } = await createPaypalOrder(purchase.id, token);
    return { purchase, orderId, run: () => captureAndFulfill({ purchaseId: purchase.id, orderId, unlockToken: token }) };
  }

  it("pago COMPLETED 9.00 USD: PDF completo al email del TOKEN (no al del pagador) + aviso VENTA CONFIRMADA | SANDBOX", async () => {
    const { token } = await requestPaid("comprador@dominio-prueba.test");
    net.sent.length = 0;
    const { run, purchase } = await approveAndCapture(token);
    const r = await run();
    expect(r.payment).toBe("COMPLETED");
    expect(r.delivery).toBe("EMAIL_ACCEPTED");
    const mail = deliveries();
    expect(mail).toHaveLength(1);
    expect(mail[0].to).toEqual(["comprador@dominio-prueba.test"]);
    const pages = (await import("pdf-lib")).PDFDocument.load(Buffer.from(mail[0].attachments[0].content, "base64"));
    expect((await pages).getPageCount()).toBeGreaterThanOrEqual(10);
    expect(await extractPdfText(mail[0].attachments[0].content)).toContain("52 años");
    const sale = net.sent.find((m) => m.subject.includes("VENTA CONFIRMADA"))!;
    expect(sale.subject).toBe(`GlucoPredict | VENTA CONFIRMADA US$9 | ${purchase.id} | ENTREGADO | SANDBOX`);
    expect(sale.to).toEqual(["dueno@dominio-prueba.test"]);
    expect(sale.attachments).toHaveLength(0); // sin consentimiento de copia
  });

  it("pago abandonado: no se entrega nada", async () => {
    const { token } = await requestPaid("abandona@dominio-prueba.test");
    net.sent.length = 0;
    await approveAndCapture(token); // se crea la orden pero nunca se captura
    expect(deliveries()).toHaveLength(0);
    expect(net.sent.filter((m) => m.subject.includes("VENTA"))).toHaveLength(0);
  });

  it("PENDING no entrega; el webhook COMPLETED entrega después", async () => {
    const { token } = await requestPaid("pend@dominio-prueba.test");
    net.captureOutcome = () => "PENDING";
    const { run, orderId, purchase } = await approveAndCapture(token);
    net.sent.length = 0;
    const r = await run();
    expect(r.payment).toBe("PENDING");
    expect(deliveries()).toHaveLength(0);
    // PayPal completa la captura y envía el webhook
    const o = net.orders.get(orderId)!;
    o.captureStatus = "COMPLETED";
    const ok = await handleWebhookEvent({
      id: "WH-EVT-1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: o.captureId, custom_id: purchase.id, supplementary_data: { related_ids: { order_id: orderId } } },
    });
    expect(ok).toBe(true);
    expect(deliveries()).toHaveLength(1);
    expect((await repo.get(purchase.id))!.payment_status).toBe("COMPLETED");
  });

  it.each([
    ["importe 9.99", (o: { captureAmount?: string }) => (o.captureAmount = "9.99")],
    ["moneda EUR", (o: { captureCurrency?: string }) => (o.captureCurrency = "EUR")],
  ])("%s: no entrega y marca FAILED", async (_n, mutate) => {
    const { token } = await requestPaid("mal@dominio-prueba.test");
    net.mutateCapture = mutate as Net["mutateCapture"];
    const { run, purchase } = await approveAndCapture(token);
    net.sent.length = 0;
    const r = await run();
    expect(r.payment).toBe("FAILED");
    expect(deliveries()).toHaveLength(0);
    expect((await repo.get(purchase.id))!.last_error).toMatch(/^rejected_/);
  });

  it("merchant distinto o custom_id ajeno: se rechaza", async () => {
    const order: PaypalOrder = {
      id: "ORDERABCDE",
      status: "COMPLETED",
      purchase_units: [{ custom_id: "p1", reference_id: "p1", payee: { merchant_id: "OTRO" }, payments: { captures: [{ id: "C1", status: "COMPLETED", amount: { currency_code: "USD", value: "9.00" } }] } }],
    };
    const exp = { purchaseId: "p1", orderId: "ORDERABCDE", amount: "9.00", currency: "USD", merchantId: "MERCHANT1" };
    expect(judgeOrder(order, exp)).toEqual({ kind: "rejected", reason: "merchant_mismatch" });
    expect(judgeOrder(order, { ...exp, merchantId: "OTRO", purchaseId: "p2" })).toEqual({ kind: "rejected", reason: "custom_id_mismatch" });
    expect(judgeOrder({ ...order, purchase_units: [...order.purchase_units!, ...order.purchase_units!] }, { ...exp, merchantId: undefined })).toEqual({ kind: "rejected", reason: "purchase_units_not_one" });
    expect(judgeOrder(order, { ...exp, merchantId: "OTRO" })).toMatchObject({ kind: "completed" });
  });

  it("dos compradores a la vez: cada uno recibe lo suyo", async () => {
    const a = await requestPaid("a@dominio-prueba.test");
    const b = await requestPaid("b@dominio-prueba.test", { inputs: { ...REQ("x").inputs, age: 70 } });
    net.sent.length = 0;
    const [pa, pb] = await Promise.all([approveAndCapture(a.token), approveAndCapture(b.token)]);
    await Promise.all([pa.run(), pb.run()]);
    const recipients = deliveries().map((m) => m.to[0]).sort();
    expect(recipients).toEqual(["a@dominio-prueba.test", "b@dominio-prueba.test"]);
    const mb = deliveries().find((m) => m.to[0] === "b@dominio-prueba.test")!;
    expect(await extractPdfText(mb.attachments[0].content)).toContain("70 años");
  });

  it("doble captura simultánea: un único correo (claim atómico)", async () => {
    const { token } = await requestPaid("doble@dominio-prueba.test");
    const { run } = await approveAndCapture(token);
    net.sent.length = 0;
    await Promise.all([run(), run()]);
    expect(deliveries()).toHaveLength(1);
  });

  it("el proveedor de email cae al pagar: DELIVERY_FAILED y el cron reintenta", async () => {
    const { token } = await requestPaid("caida@dominio-prueba.test");
    const { run, purchase } = await approveAndCapture(token);
    net.resendDown = true;
    const r = await run();
    expect(r.payment).toBe("COMPLETED");
    expect(r.delivery).toBe("DELIVERY_FAILED");
    net.resendDown = false;
    net.sent.length = 0;
    const retry = await fulfill((await repo.get(purchase.id))!);
    expect(retry.ok).toBe(true);
    expect(deliveries()).toHaveLength(1);
    expect((await repo.get(purchase.id))!.fulfillment_status).toBe("EMAIL_ACCEPTED");
  });

  it("token manipulado → 410; sin aceptar términos → 422; token de otro informe no abre la compra", async () => {
    const { token } = await requestPaid("tok@dominio-prueba.test");
    await expect(startPurchase(`${token.slice(0, -4)}AAAA`, true)).rejects.toMatchObject({ code: "unlock_invalid", http: 410 });
    await expect(startPurchase(token, false)).rejects.toMatchObject({ code: "terms_required" });
    const other = await requestPaid("otro@dominio-prueba.test", { inputs: { ...REQ("x").inputs, age: 61 } });
    const { purchase } = await startPurchase(token, true);
    await expect(createPaypalOrder(purchase.id, other.token)).rejects.toBeInstanceOf(CheckoutFailure);
  });

  it("LIVE bloqueado sin PAYMENTS_LIVE_APPROVED: los pagos quedan deshabilitados", async () => {
    setEnv({ PAYPAL_ENV: "live", PAYMENTS_LIVE_APPROVED: "false" });
    const r = await requestReport(REQ("live@dominio-prueba.test"), "8.8.8.8");
    expect((r.body as { mode: string }).mode).toBe("free");
  });
});

describe("webhook de PayPal", () => {
  const makeReq = (body: unknown) =>
    new Request("https://app.dominio-prueba.test/api/paypal/webhook", {
      method: "POST",
      headers: { "paypal-transmission-id": "t", "paypal-transmission-sig": "s", "paypal-cert-url": "u", "paypal-auth-algo": "a", "paypal-transmission-time": "now" },
      body: JSON.stringify(body),
    });

  it("firma falsa → 401 y no se entrega nada", async () => {
    const { token } = await requestPaid("firma@dominio-prueba.test");
    const { purchase } = await startPurchase(token, true);
    const { orderId } = await createPaypalOrder(purchase.id, token);
    net.sent.length = 0;
    net.signatureValid = false;
    const res = await webhookPOST(makeReq({ id: "E1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { supplementary_data: { related_ids: { order_id: orderId } } } }));
    expect(res.status).toBe(401);
    expect(net.sent).toHaveLength(0);
  });

  it("eventos duplicados → una sola entrega; si la entrega falla responde 500 y el reintento entrega", async () => {
    const { token } = await requestPaid("dup@dominio-prueba.test");
    net.captureOutcome = () => "PENDING";
    const { purchase } = await startPurchase(token, true);
    const { orderId } = await createPaypalOrder(purchase.id, token);
    await captureAndFulfill({ purchaseId: purchase.id, orderId, unlockToken: token });
    net.orders.get(orderId)!.captureStatus = "COMPLETED";
    net.sent.length = 0;
    const evt = { id: "E-DUP", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: `CAP-${orderId}`, supplementary_data: { related_ids: { order_id: orderId } } } };
    net.resendDown = true;
    expect((await webhookPOST(makeReq(evt))).status).toBe(500);
    net.resendDown = false;
    expect((await webhookPOST(makeReq(evt))).status).toBe(200);
    expect((await webhookPOST(makeReq(evt))).status).toBe(200); // duplicado
    expect(deliveries()).toHaveLength(1);
  });

  it("reembolso → REFUNDED; disputa → DISPUTED", async () => {
    const { token } = await requestPaid("ref@dominio-prueba.test");
    const { purchase, orderId, run } = await (async () => {
      const { purchase } = await startPurchase(token, true);
      const { orderId } = await createPaypalOrder(purchase.id, token);
      return { purchase, orderId, run: () => captureAndFulfill({ purchaseId: purchase.id, orderId, unlockToken: token }) };
    })();
    await run();
    const capId = `CAP-${orderId}`;
    await handleWebhookEvent({ id: "E-DSP", event_type: "CUSTOMER.DISPUTE.CREATED", resource: { disputed_transactions: [{ seller_transaction_id: capId }] } });
    expect((await repo.get(purchase.id))!.payment_status).toBe("DISPUTED");
    await handleWebhookEvent({ id: "E-RF", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: capId } });
    expect((await repo.get(purchase.id))!.payment_status).toBe("REFUNDED");
  });
});
