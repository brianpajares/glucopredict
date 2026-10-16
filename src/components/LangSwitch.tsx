"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/config";

export function LangSwitch({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.split("/").slice(2).join("/");
  const isUnlock = pathname.split("/")[2] === "unlock";
  return (
    <div className="lang" role="group" aria-label={label}>
      {LOCALES.map((l) => (
        <Link
          key={l}
          // el enlace de desbloqueo es privado y está ligado a su idioma: se vuelve al inicio del idioma elegido
          href={isUnlock || !rest ? `/${l}` : `/${l}/${rest}`}
          hrefLang={l}
          lang={l}
          aria-current={l === lang ? "true" : undefined}
          scroll={false}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
