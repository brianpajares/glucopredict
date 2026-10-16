export const LOCALES = ["es", "en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export const COUNTRIES = ["PE", "MX", "BR", "CO", "ES", "DEFAULT_LATAM"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export function isCountry(value: string | undefined | null): value is CountryCode {
  return !!value && (COUNTRIES as readonly string[]).includes(value);
}

export const INTL_LOCALE: Record<Locale, string> = { es: "es", en: "en-US", pt: "pt-BR" };

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
