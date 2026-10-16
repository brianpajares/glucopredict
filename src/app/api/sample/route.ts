import { isLocale, type Locale } from "@/lib/i18n/config";
import type { EngineInputs } from "@/lib/engine/types";
import { reportPrice } from "@/lib/env";
import { buildReportPdf } from "@/lib/report";
import { clientIp, json, rateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Perfil 100 % SINTÉTICO (nunca datos reales) para mostrar cómo luce la vista previa borrosa. */
const SYNTHETIC: EngineInputs = {
  country_code: "DEFAULT_LATAM",
  age: 52,
  waist_threshold_sex: "female",
  body_measurements: { height_cm: 162, weight_kg: 78, waist_cm: 92 },
  physical_activity_30m_daily: false,
  fruit_veg_daily: false,
  antihypertensive_medication: false,
  history_high_glucose: false,
  family_history: "second_degree",
};

export async function GET(req: Request) {
  if (!rateLimit(`sample:${clientIp(req)}`, 20, 10 * 60_000)) return json(429, { error: "rate_limited" });
  const q = new URL(req.url).searchParams.get("lang");
  const locale: Locale = isLocale(q) ? q : "es";
  const built = await buildReportPdf({
    locale,
    inputs: SYNTHETIC,
    mode: "preview",
    unlockUrl: `${new URL(req.url).origin}/${locale}/calcular`,
    priceLabel: reportPrice().label,
    now: new Date("2026-01-01T00:00:00Z"),
  });
  return new Response(Buffer.from(built.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="GlucoPredict-${locale}-ejemplo.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
