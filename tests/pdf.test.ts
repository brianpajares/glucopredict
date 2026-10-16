import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it } from "vitest";
import { calculate } from "@/lib/engine/engine";
import { buildReport } from "@/lib/report/model";
import { unsupportedChars } from "@/lib/report/pdf";
import { buildReportPdf } from "@/lib/report";
import { LOCALES } from "@/lib/i18n/config";
import { SYNTH_INPUTS, extractPdfText, setEnv } from "./helpers/fakes";

beforeEach(() => setEnv());

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe("informe PDF (AT-11)", () => {
  for (const locale of LOCALES) {
    it(`${locale}: más de 8 páginas, todos los caracteres soportados y secciones del outputs_spec`, async () => {
      const full = await buildReportPdf({ locale, inputs: SYNTH_INPUTS, mode: "full" });
      const doc = await PDFDocument.load(full.pdf);
      expect(doc.getPageCount()).toBeGreaterThanOrEqual(10);
      expect(doc.getTitle()).toContain("GlucoPredict");
      const out = calculate(SYNTH_INPUTS);
      const model = buildReport({ locale, inputs: SYNTH_INPUTS, out, verification: "GP-TEST", generatedAt: new Date(), privacyUrl: "https://x.test/p" });
      expect(await unsupportedChars(strings(model))).toEqual([]);
      // las 7 secciones de pago de outputs_spec.json están presentes
      expect(model.pages.map((p) => p.id)).toEqual(
        expect.arrayContaining(["components", "detail", "scenarios", "country", "plan", "doctor", "method", "sources"]),
      );
      const text = await extractPdfText(full.pdf);
      expect(text).toContain("GP-");
      expect(text.toLowerCase()).not.toMatch(/tu probabilidad (real|personal) es|your (real|personal) probability is/);
    });

    it(`${locale}: la vista previa no escribe datos bloqueados`, async () => {
      const prev = await buildReportPdf({ locale, inputs: SYNTH_INPUTS, mode: "preview", unlockUrl: "https://x.test/u", priceLabel: "US$9" });
      const text = await extractPdfText(prev.pdf);
      expect(text).not.toMatch(/31[.,]25|95[.,]0 ?cm|80[.,]0 ?kg|52 (años|years|anos)/);
      const full = await extractPdfText((await buildReportPdf({ locale, inputs: SYNTH_INPUTS, mode: "full" })).pdf);
      expect(full.length).toBeGreaterThan(text.length * 2);
    });
  }

  it("el escenario combinado coincide con el motor y los escenarios son no causales", async () => {
    const out = calculate(SYNTH_INPUTS);
    const model = buildReport({ locale: "es", inputs: SYNTH_INPUTS, out, verification: "GP-T", generatedAt: new Date(), privacyUrl: "u" });
    const sc = model.pages.find((p) => p.id === "scenarios")!;
    const banner = sc.blocks.find((b) => b.t === "callout");
    expect(banner && "text" in banner ? banner.text : "").toMatch(/no predice/i);
    const table = sc.blocks.find((b) => b.t === "table");
    expect(table && "rows" in table ? table.rows.at(-1)?.[2] : "").toBe(`${out.score} → ${out.modifiable_scenario.best_case_score_under_score_rules}`);
  });
});
