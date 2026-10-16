import type { Locale } from "@/lib/i18n/config";
import { COPY_EN } from "./copy.en";
import { COPY_ES } from "./copy.es";
import { COPY_PT } from "./copy.pt";
import type { ReportCopy } from "./copy.types";

const BY_LOCALE: Record<Locale, ReportCopy> = { es: COPY_ES, en: COPY_EN, pt: COPY_PT };

export function reportCopy(locale: Locale): ReportCopy {
  return BY_LOCALE[locale];
}
