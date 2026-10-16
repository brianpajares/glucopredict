/**
 * Genera PDFs de muestra (full + preview) con un perfil SINTÉTICO para inspección visual.
 * Uso: npm run sample:pdf -- [es|en|pt] [salida]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { buildReportPdf } from "../src/lib/report";
import type { EngineInputs } from "../src/lib/engine/types";
import type { Locale } from "../src/lib/i18n/config";

process.env.REPORT_TOKEN_SECRET ??= "sample-only-secret-sample-only-secret-0123456789";

const locale = (process.argv[2] ?? "es") as Locale;
const outDir = process.argv[3] ?? join(process.cwd(), "tmp-samples");
mkdirSync(outDir, { recursive: true });

const inputs: EngineInputs = {
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

async function main() {
  for (const mode of ["full", "preview"] as const) {
    const r = await buildReportPdf({ locale, inputs, mode, unlockUrl: "https://example.test/es/unlock/TOKEN", priceLabel: "US$9" });
    const file = join(outDir, `sample-${locale}-${mode}.pdf`);
    writeFileSync(file, r.pdf);
    const pages = (await PDFDocument.load(r.pdf)).getPageCount();
    console.log(`${file}  pages=${pages}  bytes=${r.pdf.length}`);
  }
}
void main();
