import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const all = process.env.E2E_ALL_BROWSERS === "1";

/** Entorno SINTÉTICO para el servidor de pruebas: ningún secreto real, ningún servicio externo real. */
export const E2E_ENV = {
  MONETIZATION_MODE: "paypal",
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "e2e_client_id",
  PAYPAL_CLIENT_SECRET: "e2e_client_secret",
  PAYPAL_WEBHOOK_ID: "WH-E2E",
  RESEND_API_KEY: "re_e2e_1234567890",
  OWNER_EMAIL: "dueno@dominio-prueba.test",
  REPORT_TOKEN_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
  PURCHASE_STORAGE: "stateless",
  NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
  REPORT_PRICE_USD: "9.00",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    ...(all
      ? [
          { name: "firefox-desktop", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit-desktop", use: { ...devices["Desktop Safari"] } },
          { name: "webkit-mobile", use: { ...devices["iPhone 14"] } },
        ]
      : []),
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { ...E2E_ENV, PORT: String(PORT) },
  },
});
