import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { calculate } from "@/lib/engine/engine";
import type { EngineInputs, EngineOutput } from "@/lib/engine/types";
import { appUrl } from "@/lib/env";
import { canonicalize, verificationId } from "@/lib/token";
import { reportCopy } from "./copy";
import { buildReport } from "./model";
import { renderReportPdf } from "./pdf";

export interface BuiltReport {
  pdf: Uint8Array;
  out: EngineOutput;
  verification: string;
  pageCount: number;
}

export interface BuildArgs {
  locale: Locale;
  inputs: EngineInputs;
  mode: "full" | "preview";
  unlockUrl?: string;
  priceLabel?: string;
  now?: Date;
}

export async function buildReportPdf(args: BuildArgs): Promise<BuiltReport> {
  const out = calculate(args.inputs);
  const verification = verificationId(canonicalize(args.inputs), out.model_version);
  const doc = buildReport({
    locale: args.locale,
    inputs: args.inputs,
    out,
    verification,
    generatedAt: args.now ?? new Date(),
    privacyUrl: `${appUrl()}/${args.locale}/legal/privacidad`,
  });
  const pdf = await renderReportPdf(doc, reportCopy(args.locale), {
    mode: args.mode,
    preview: args.mode === "preview" && args.unlockUrl ? { unlockUrl: args.unlockUrl, priceLabel: args.priceLabel ?? "" } : undefined,
  });
  return { pdf, out, verification, pageCount: doc.pages.length };
}
