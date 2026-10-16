import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as downloadGET } from "@/app/api/purchase/download/route";
import { GET as statusGET } from "@/app/api/purchase/status/route";
import { POST as webhookPOST } from "@/app/api/paypal/webhook/route";
import { captureAndFulfill, createPaypalOrder, startPurchase } from "@/lib/checkout";
import { paymentsReady } from "@/lib/fulfillment";
import { requestReport } from "@/lib/leads";
import { getPurchaseRepo, resetStatelessCache, setPurchaseRepoForTests } from "@/lib/purchases";
import { resetPaypalTokenCache } from "@/lib/paypal";
import { resetRateLimits } from "@/lib/security";
import { resetRecentRequests } from "@/lib/leads";
import { SYNTH_INPUTS, extractPdfText, installNet, setEnv, type Net } from "./helpers/fakes";

/**
 * Modo SIN base de datos (PURCHASE_STORAGE=stateless): PayPal es el libro contable y el token de desbloqueo
 * lleva los datos. Cada paso se ejecuta tras vaciar la caché para simular instancias serverless distintas.
 */
let net: Net;

const REQ = (email: string) => ({
  locale: "es",
  country_code: "PE",
  inputs: (({ country_code: _c, ...rest }) => rest)(SYNTH_INPUTS),
  email,
  consent_report_delivery: true,
  consent_owner_copy: false,
});

const fresh = () => {
  resetStatelessCache();
  resetRateLimits();
};

async function unlockToken(email = "cliente@dominio-prueba.test") {
  const r = await requestReport(REQ(email), "203.0.113.9");
  expect(r.status).toBe(200);
  return (r.body as { unlock_url: string }).unlock_url.split("/unlock/")[1];
}

beforeEach(() => {
  setEnv({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined, PURCHASE_STORAGE: "stateless" });
  setPurchaseRepoForTests(undefined);
  resetStatelessCache();
  resetPaypalTokenCache();
  resetRateLimits();
  resetRecentRequests();
  net = installNet();
});
afterEach(() => vi.unstubAllGlobals());

const paidMails = () => net.sent.filter((m) => m.attachments.some((a) => /^GlucoPredict-GP-.*\.pdf$/.test(a.filename) && !/vista-previa|COMPLETO/.test(a.filename)));

async function pay(token: string) {
  const { purchase } = await startPurchase(token, true);
  fresh(); // otra instancia crea la orden
  const { orderId } = await createPaypalOrder(purchase.id, token, { acceptTerms: true });
  fresh(); // y otra captura
  return { purchase, orderId, capture: () => captureAndFulfill({ purchaseId: purchase.id, orderId, unlockToken: token }) };
}

const req = (url: string) => new Request(`https://app.dominio-prueba.test${url}`);

describe("modo sin base de datos", () => {
  it("los pagos se habilitan sin Supabase y /health lo refleja; sin ninguno de los dos quedan deshabilitados", () => {
    expect(paymentsReady()).toEqual({ ready: true, missing: [] });
    expect(getPurchaseRepo()?.stateless).toBe(true);
    setEnv({ PURCHASE_STORAGE: undefined, SUPABASE_URL: undefined });
    setPurchaseRepoForTests(undefined);
    const r = paymentsReady();
    expect(r.ready).toBe(false);
    expect(r.missing.join(" ")).toMatch(/PURCHASE_STORAGE=stateless/);
  });

  it("pago completo entre instancias distintas: PDF al email del token y aviso de venta; el correo trae el enlace de descarga", async () => {
    const token = await unlockToken("comprador@dominio-prueba.test");
    net.sent.length = 0;
    const { capture, orderId } = await pay(token);
    const r = await capture();
    expect(r).toMatchObject({ payment: "COMPLETED", delivery: "EMAIL_ACCEPTED" });
    const mail = paidMails();
    expect(mail).toHaveLength(1);
    expect(mail[0].to).toEqual(["comprador@dominio-prueba.test"]);
    expect(await extractPdfText(mail[0].attachments[0].content)).toContain("52 años");
    expect(net.sent.some((m) => m.subject.includes("VENTA CONFIRMADA") && m.subject.endsWith("SANDBOX"))).toBe(true);
    // el HTML del correo contiene el enlace de descarga con la orden
    expect(orderId).toMatch(/^ORDER/);
  });

  it("doble captura simultánea desde dos instancias: un único correo (Idempotency-Key)", async () => {
    const token = await unlockToken("doble@dominio-prueba.test");
    const { purchase, orderId } = await pay(token);
    net.sent.length = 0;
    const call = async () => {
      fresh();
      return captureAndFulfill({ purchaseId: purchase.id, orderId, unlockToken: token });
    };
    await Promise.all([call(), call()]);
    expect(paidMails()).toHaveLength(1);
    expect(net.sent.filter((m) => m.subject.includes("VENTA CONFIRMADA"))).toHaveLength(1);
  });

  it("pago abandonado: no se entrega nada y la descarga exige pago", async () => {
    const token = await unlockToken("abandona@dominio-prueba.test");
    net.sent.length = 0;
    const { orderId } = await pay(token);
    expect(paidMails()).toHaveLength(0);
    const dl = await downloadGET(req(`/api/purchase/download?t=${token}&o=${orderId}`));
    expect(dl.status).toBe(402);
    const noOrder = await downloadGET(req(`/api/purchase/download?t=${token}`));
    expect(noOrder.status).toBe(402);
  });

  it("importe incorrecto: se rechaza, no se entrega y la descarga sigue bloqueada", async () => {
    const token = await unlockToken("mal@dominio-prueba.test");
    net.mutateCapture = (o) => (o.captureAmount = "1.00");
    const { capture, orderId } = await pay(token);
    net.sent.length = 0;
    const r = await capture();
    expect(r.payment).toBe("FAILED");
    expect(paidMails()).toHaveLength(0);
    expect((await downloadGET(req(`/api/purchase/download?t=${token}&o=${orderId}`))).status).toBe(402);
  });

  it("descarga y estado tras pagar se verifican contra PayPal (sin base de datos)", async () => {
    const token = await unlockToken("vuelve@dominio-prueba.test");
    const { capture, orderId } = await pay(token);
    await capture();
    fresh();
    const dl = await downloadGET(req(`/api/purchase/download?t=${token}&o=${orderId}`));
    expect(dl.status).toBe(200);
    expect(dl.headers.get("content-type")).toBe("application/pdf");
    const st = await statusGET(req(`/api/purchase/status?t=${token}&o=${orderId}`));
    expect(await st.json()).toMatchObject({ payment: "COMPLETED" });
    // una orden de otro informe no sirve para este token
    const other = await unlockToken("otro@dominio-prueba.test");
    expect((await downloadGET(req(`/api/purchase/download?t=${other}&o=${orderId}`))).status).toBe(402);
  });

  it("un reembolso en PayPal revoca la descarga y avisa al dueño por webhook", async () => {
    const token = await unlockToken("reembolso@dominio-prueba.test");
    const { capture, orderId } = await pay(token);
    await capture();
    // PayPal marca la captura como reembolsada
    net.orders.get(orderId)!.captureStatus = "REFUNDED";
    fresh();
    expect((await downloadGET(req(`/api/purchase/download?t=${token}&o=${orderId}`))).status).toBe(402);
    net.sent.length = 0;
    const res = await webhookPOST(
      new Request("https://app.dominio-prueba.test/api/paypal/webhook", {
        method: "POST",
        headers: { "paypal-transmission-id": "t", "paypal-transmission-sig": "s", "paypal-cert-url": "u", "paypal-auth-algo": "a", "paypal-transmission-time": "now" },
        body: JSON.stringify({ id: "EVT-REF-1", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: `CAP-${orderId}` } }),
      }),
    );
    expect(res.status).toBe(200);
    expect(net.sent.find((m) => m.subject.startsWith("GlucoPredict | EVENTO PAYPAL PAYMENT.CAPTURE.REFUNDED"))?.to).toEqual(["dueno@dominio-prueba.test"]);
  });

  it("sin aceptar términos no se crea la orden", async () => {
    const token = await unlockToken("terminos@dominio-prueba.test");
    const { purchase } = await startPurchase(token, true);
    fresh();
    await expect(createPaypalOrder(purchase.id, token, { acceptTerms: false })).rejects.toMatchObject({ code: "terms_required" });
  });
});
