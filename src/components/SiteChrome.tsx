import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { LangSwitch } from "./LangSwitch";

export function SiteHeader({ lang }: { lang: Locale }) {
  const m = getMessages(lang);
  return (
    <header className="site-header">
      <div className="wrap topbar">
        <Link href={`/${lang}`} className="brand">
          <span className="mark" aria-hidden="true">
            G
          </span>
          <span>{m.brand}</span>
        </Link>
        <nav className="nav" aria-label="Principal">
          <Link className="navlink" href={`/${lang}/como-funciona`}>
            {m.nav.how}
          </Link>
          <a className="navlink" href={`/api/sample?lang=${lang}`} target="_blank" rel="noopener">
            {m.nav.sample}
          </a>
          <LangSwitch lang={lang} label={m.common.language} />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Locale }) {
  const m = getMessages(lang);
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div>
          <p style={{ margin: "0 0 6px" }}>
            <strong>{m.footer.rights}</strong>
          </p>
          <p className="disclaimer-bar">
            {m.safety.long} {m.footer.note}
          </p>
        </div>
        <nav aria-label="Legal">
          <Link href={`/${lang}/legal/privacidad`}>{m.nav.privacy}</Link>
          <Link href={`/${lang}/legal/terminos`}>{m.nav.terms}</Link>
          <Link href={`/${lang}/legal/aviso-medico`}>{m.nav.medical}</Link>
          <Link href={`/${lang}/como-funciona`}>{m.nav.how}</Link>
        </nav>
      </div>
    </footer>
  );
}
