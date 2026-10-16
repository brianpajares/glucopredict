import type { Locale } from "./config";
import { en } from "./messages.en";
import { es, type Messages } from "./messages.es";
import { pt } from "./messages.pt";

export type { Messages };

const BY_LOCALE: Record<Locale, Messages> = { es, en, pt };

export function getMessages(locale: Locale): Messages {
  return BY_LOCALE[locale];
}
