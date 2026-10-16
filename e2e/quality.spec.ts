import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { E2E_SECRET, SYNTH_UNLOCK, fillWizard, sealUnlock } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

const token = sealUnlock(SYNTH_UNLOCK, E2E_SECRET);

test.describe("AT-21 accesibilidad (axe, WCAG 2.2 AA)", () => {
  for (const path of ["/es", "/en", "/pt", "/es/calcular", "/es/como-funciona", "/es/legal/privacidad", "/es/legal/terminos", "/es/legal/aviso-medico", `/es/unlock/${token}`]) {
    test(`sin violaciones en ${path.replace(token, "TOKEN")}`, async ({ page }) => {
      await page.goto(path);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await axe(page);
    });
  }

  test("resultado y gate", async ({ page }) => {
    await page.goto("/es/calcular");
    await fillWizard(page);
    await axe(page);
    await page.getByTestId("open-gate").click();
    await expect(page.locator("#g-email")).toBeVisible();
    await axe(page);
  });

  test("navegación por teclado: foco visible y avance con Enter", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "teclado en escritorio");
    await page.goto("/es/calcular");
    await page.locator("#f-age").focus();
    await page.keyboard.type("45");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: /umbral de cintura/i })).toBeFocused();
  });
});

test.describe("responsive: sin desbordamiento horizontal de 320 a 1440 px", () => {
  for (const width of [320, 375, 768, 1280, 1440]) {
    test(`${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/es", "/es/calcular", `/es/unlock/${token}`, "/es/legal/terminos"]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} desborda ${overflow}px`).toBeLessThanOrEqual(0);
      }
      await page.goto("/es/calcular");
      await fillWizard(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
