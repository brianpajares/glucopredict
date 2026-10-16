import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";

/** Perfil sintético (spec/test_vectors.json: PE_typical_high → score 19). */
export const PROFILE = { age: "50", sex: "female", cm: "160", kg: "80", waist: "95" };

const ES = {
  next: /Continuar|Continue|Continuar/,
};

export async function fillWizard(page: Page, opts: { age?: string; sex?: "female" | "male"; cm?: string; kg?: string; waist?: string; yesNo?: boolean[]; family?: "none" | "second_degree" | "first_degree" } = {}) {
  const o = { age: PROFILE.age, sex: "female" as const, cm: PROFILE.cm, kg: PROFILE.kg, waist: PROFILE.waist, family: "first_degree" as const, ...opts };
  // activity, fruit, bp, glucose
  const yn = o.yesNo ?? [false, false, true, false];
  await page.locator("#f-age").fill(o.age);
  await page.getByRole("button", { name: ES.next }).click();
  await page.locator(`#c-sex-${o.sex}`).check({ force: true });
  await page.getByRole("button", { name: ES.next }).click();
  await page.locator("#f-cm").fill(o.cm);
  await page.getByRole("button", { name: ES.next }).click();
  await page.locator("#f-w").fill(o.kg);
  await page.getByRole("button", { name: ES.next }).click();
  await page.locator("#f-w").fill(o.waist);
  await page.getByRole("button", { name: ES.next }).click();
  for (const [i, key] of (["activity", "fruit", "bp", "glucose"] as const).entries()) {
    await page.locator(`#c-${key}-${yn[i]}`).check({ force: true });
    await page.getByRole("button", { name: ES.next }).click();
  }
  await page.locator(`#c-family-${o.family}`).check({ force: true });
  await page.getByRole("button", { name: ES.next }).click();
  await expect(page.getByTestId("score")).toBeVisible();
}

/** Réplica independiente del sellado AES-256-GCM de src/lib/token.ts (valida compatibilidad entre implementaciones). */
export function sealUnlock(data: unknown, secret: string, ttlDays = 30): string {
  const key = Buffer.from(hkdfSync("sha256", secret, "glucopredict-token-salt-v1", "aes-256-gcm-key", 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const env = { k: "unlock", e: Math.floor(Date.now() / 1000) + ttlDays * 86400, d: data };
  const ct = Buffer.concat([cipher.update(JSON.stringify(env), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

export const E2E_SECRET = "e2e-secret-e2e-secret-e2e-secret-0123456789";

export const SYNTH_UNLOCK = {
  rid: "11111111-1111-4111-8111-111111111111",
  email: "persona.prueba@dominio-prueba.test",
  locale: "es",
  oc: false,
  inputs: {
    country_code: "PE",
    age: 50,
    waist_threshold_sex: "female",
    body_measurements: { height_cm: 160, weight_kg: 80, waist_cm: 95 },
    physical_activity_30m_daily: false,
    fruit_veg_daily: false,
    antihypertensive_medication: true,
    history_high_glucose: false,
    family_history: "first_degree",
  },
};
