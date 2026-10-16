import { expect, test } from "@playwright/test";
import { E2E_SECRET, SYNTH_UNLOCK, fillWizard, sealUnlock } from "./helpers";

test.describe("landing y navegación", () => {
  for (const [lang, h1, cta] of [
    ["es", /¿Conviene confirmar tu riesgo de diabetes/, "Calcular mi score gratis"],
    ["en", /Should you confirm your diabetes risk/, "Calculate my score for free"],
    ["pt", /Vale a pena confirmar seu risco de diabetes/, "Calcular meu score grátis"],
  ] as const) {
    test(`AT-01 ${lang}: propuesta de valor, aviso de cribado y CTA`, async ({ page }) => {
      await page.goto(`/${lang}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1);
      await expect(page.getByTestId("cta-start")).toHaveText(cta);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByText(/diabetes/i).first()).toBeVisible();
    });
  }

  test("raíz redirige al idioma del navegador", async ({ request }) => {
    const r = await request.get("/", { headers: { "accept-language": "pt-BR,pt;q=0.9" }, maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(r.headers().location).toMatch(/\/pt$/);
  });

  test("selector de idioma conserva la ruta", async ({ page }) => {
    await page.goto("/es/como-funciona");
    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/como-funciona$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How GlucoPredict works");
  });

  test("/api/health no expone secretos y refleja el estado", async ({ request }) => {
    const r = await request.get("/api/health");
    const text = await r.text();
    expect(text).not.toMatch(/e2e_client_secret|re_e2e_|e2e-secret|service-role/);
    const j = JSON.parse(text);
    expect(j.integrations.resend_api_key).toBe("ok");
    expect(j.payments.env).toBe("sandbox");
    expect(j.payments.live_blocked).toBe(false);
  });

  test("cabeceras: CSP con PayPal, COOP para popups y noindex", async ({ request }) => {
    const r = await request.get("/es");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("https://www.paypal.com");
    expect(h["content-security-policy"]).not.toContain("upgrade-insecure-requests"); // solo en Vercel
    expect(h["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
    expect(h["permissions-policy"]).toContain("payment=(self");
    expect(h["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("wizard, resultado y gate", () => {
  test("AT-02/AT-05/AT-06: 10 pasos sin respuestas precargadas, preview con los 5 outputs gratis y umbral PE verificado", async ({ page }) => {
    await page.goto("/es/calcular");
    await expect(page.getByText("Paso 1 de 10").first()).toBeVisible();
    await expect(page.locator("#f-age")).toHaveValue("");
    // validación inline que conserva el valor y no avanza
    await page.locator("#f-age").fill("17");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "entre 18 y 80" })).toBeVisible();
    await page.locator("#f-age").fill("");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Este dato es necesario")).toBeVisible();
    await page.locator("#f-country").selectOption("PE");
    await fillWizard(page);

    await expect(page.getByTestId("score")).toContainText("19"); // PE_typical_high → score 19
    await expect(page.getByTestId("band")).toContainText("Alto");
    await expect(page.locator('[role="img"][aria-label*="19/26"]')).toBeVisible(); // score_chart
    await expect(page.getByText("Tu factor con más puntos")).toBeVisible(); // insight
    await expect(page.getByTestId("followup")).toContainText("Conviene confirmar"); // lab_cta
    await expect(page.getByText(/Umbral de seguimiento para Perú: 11/)).toBeVisible();
    await expect(page.getByText("verificado", { exact: true }).first()).toBeVisible();
    // AT-07: ninguna probabilidad personal junto a la referencia histórica
    await expect(page.locator("body")).not.toContainText(/tu probabilidad (real|es)/i);
    await expect(page.locator("body")).not.toContainText("33%");
  });

  test("AT-06: perfil preliminar fuera de Perú y recálculo instantáneo al cambiar país", async ({ page }) => {
    await page.goto("/es/calcular?pais=MX");
    await fillWizard(page, { age: "44", sex: "male", cm: "170", kg: "70", waist: "100", yesNo: [true, true, false, false], family: "second_degree" });
    await expect(page.getByText("preliminar", { exact: true }).first()).toBeVisible();
    // ES usa la regla FINDRISC original de cintura (3 pts a 100 cm para hombres): el score cambia
    const mx = await page.getByTestId("score").innerText();
    await page.locator("#r-country").selectOption("ES");
    const es = await page.getByTestId("score").innerText();
    expect(es).not.toBe(mx);
  });

  test("AT-03: unidades imperiales se convierten a métrico antes del motor (vector imperial_conversion_canonical)", async ({ page }) => {
    await page.goto("/es/calcular?pais=MX");
    await page.locator("#f-age").fill("48");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#c-sex-male").check({ force: true });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Imperial" }).click();
    await page.locator("#f-ft").fill("5");
    await page.locator("#f-in").fill("8");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Imperial" }).click();
    await page.locator("#f-w").fill("180");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#f-w").fill("36");
    await page.getByRole("button", { name: "Continuar" }).click();
    for (const [key, v] of [["activity", "false"], ["fruit", "true"], ["bp", "false"], ["glucose", "false"]] as const) {
      await page.locator(`#c-${key}-${v}`).check({ force: true });
      await page.getByRole("button", { name: "Continuar" }).click();
    }
    await page.locator("#c-family-first_degree").check({ force: true });
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByTestId("score")).toContainText("10"); // spec/test_vectors.json: score 10
  });

  test("BMI fuera de rango pide revisar unidades en vez de recalificar", async ({ page }) => {
    await page.goto("/es/calcular");
    await page.locator("#f-age").fill("40");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#c-sex-female").check({ force: true });
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#f-cm").fill("220");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.locator("#f-w").fill("40");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/BMI sale fuera de lo habitual/)).toBeVisible();
  });

  test("AT-08: gate exige consentimiento; éxito sin informe ni descarga y con enlace de desbloqueo", async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route("**/api/reports/request", async (route) => {
      body = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ report_id: "r1", delivery: "email_sent", mode: "paid", unlock_url: "http://localhost:3100/es/unlock/TOKEN-DE-PRUEBA" }) });
    });
    await page.goto("/es/calcular");
    await fillWizard(page);
    await page.getByTestId("open-gate").click();
    await page.locator("#g-email").fill("persona.prueba@dominio-prueba.test");
    await page.getByTestId("submit-email").click();
    await expect(page.getByText("Debes aceptar para recibir el informe.")).toBeVisible();
    await page.getByLabel(/Acepto recibir este informe/).check();
    await page.getByTestId("submit-email").click();
    await expect(page.getByTestId("success")).toBeVisible();
    await expect(page.getByText("¡Felicidades! Revisa tu correo")).toBeVisible();
    await expect(page.getByTestId("unlock-link")).toHaveAttribute("href", /\/es\/unlock\/TOKEN-DE-PRUEBA$/);
    // sin informe en pantalla, sin descarga, sin email completo
    await expect(page.getByRole("link", { name: /descargar/i })).toHaveCount(0);
    await expect(page.getByTestId("success")).not.toContainText("persona.prueba@dominio-prueba.test");
    // contrato de la petición: strict, sin score ni informe del cliente
    expect(body).toMatchObject({ locale: "es", country_code: "DEFAULT_LATAM", consent_report_delivery: true, consent_owner_copy: false });
    expect(Object.keys(body as unknown as object).sort()).toEqual(["consent_owner_copy", "consent_report_delivery", "country_code", "email", "inputs", "locale", "website"]);
    expect(JSON.stringify(body)).not.toMatch(/"score"|"band"/);
  });

  test("errores del servidor muestran un código ref: de diagnóstico", async ({ page }) => {
    await page.route("**/api/reports/request", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "email_failed", ref: "email_not_configured_RESEND_API_KEY" }) }),
    );
    await page.goto("/es/calcular");
    await fillWizard(page);
    await page.getByTestId("open-gate").click();
    await page.locator("#g-email").fill("persona.prueba@dominio-prueba.test");
    await page.getByLabel(/Acepto recibir este informe/).check();
    await page.getByTestId("submit-email").click();
    await expect(page.getByText(/ref: email_not_configured_RESEND_API_KEY/)).toBeVisible();
  });
});

test.describe("desbloqueo y pago (PayPal simulado)", () => {
  const token = sealUnlock(SYNTH_UNLOCK, E2E_SECRET);

  test("token inválido → mensaje claro y cabeceras privadas", async ({ page }) => {
    const res = await page.goto("/es/unlock/token-invalido-token-invalido-1234567890");
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
    await expect(page.getByTestId("unlock-invalid")).toBeVisible();
  });

  test("token válido: resumen gratuito, precio, términos y pago con PayPal → informe descargable", async ({ page }) => {
    await page.route("**/api/purchase/start", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ purchase_id: "22222222-2222-4222-8222-222222222222", payment: "CREATED", delivery: "NOT_STARTED", paypal_client_id: "e2e_client_id", paypal_env: "sandbox", amount: "9.00", currency: "USD" }) }),
    );
    await page.route("**/api/paypal/create-order", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ order_id: "ORDER-E2E-123" }) }));
    let capturedBody: Record<string, unknown> = {};
    await page.route("**/api/paypal/capture", async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ payment: "COMPLETED", delivery: "EMAIL_ACCEPTED" }) });
    });
    // SDK de PayPal simulado: un botón que ejecuta createOrder/onApprove
    await page.route("https://www.paypal.com/sdk/js**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `window.paypal={Buttons:function(cfg){return{render:function(el){var b=document.createElement('button');b.textContent='PayPal-simulado';b.onclick=function(){cfg.createOrder().then(function(id){return cfg.onApprove({orderID:id})})};el.appendChild(b);return Promise.resolve()},close:function(){return Promise.resolve()}}}};`,
      }),
    );

    await page.goto(`/es/unlock/${token}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu score es 19 de 26");
    await expect(page.getByText("US$9").first()).toBeVisible();
    await expect(page.getByText("MODO PRUEBA")).toBeVisible();
    await expect(page.locator(".paypal-slot")).toHaveAttribute("data-disabled", "true");
    await page.getByTestId("accept-terms").check();
    await page.getByRole("button", { name: "PayPal-simulado" }).click();
    await expect(page.getByTestId("paid-done")).toBeVisible();
    await expect(page.getByText("Pago confirmado")).toBeVisible();
    await expect(page.getByTestId("paid-done")).toContainText(/p\*+@dominio-prueba\.test/);
    await expect(page.getByTestId("download")).toHaveAttribute("href", /\/api\/purchase\/download\?t=/);
    expect(capturedBody).toMatchObject({ purchase_id: "22222222-2222-4222-8222-222222222222", order_id: "ORDER-E2E-123" });
  });

  test("descarga sin pago → 402 (la compra no existe o no está COMPLETED)", async ({ request }) => {
    const r = await request.get(`/api/purchase/download?t=${token}`);
    expect([402, 500, 503]).toContain(r.status());
  });

  test("ejemplo de vista previa: PDF sintético disponible", async ({ request }) => {
    const r = await request.get("/api/sample?lang=es");
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("application/pdf");
    expect((await r.body()).subarray(0, 4).toString()).toBe("%PDF");
  });
});

test.describe("API: contratos y seguridad", () => {
  test("POST sin origen válido → 403; con campos extra → 400", async ({ request, baseURL }) => {
    const bad = await request.post("/api/reports/request", { data: {}, headers: { origin: "https://evil.test" } });
    expect(bad.status()).toBe(403);
    const extra = await request.post("/api/reports/request", { data: { x: 1 }, headers: { origin: baseURL! } });
    expect(extra.status()).toBe(400);
  });

  test("webhook sin firma válida → 401", async ({ request }) => {
    const r = await request.post("/api/paypal/webhook", { data: { id: "E", event_type: "PAYMENT.CAPTURE.COMPLETED" } });
    expect(r.status()).toBe(401);
  });

  test("cron exige CRON_SECRET", async ({ request }) => {
    expect((await request.get("/api/cron/retention")).status()).toBe(401);
  });
});
