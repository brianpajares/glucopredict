import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, isLocale } from "@/lib/i18n/config";
import { legalSections, type LegalDoc } from "@/lib/i18n/legal";
import { getMessages } from "@/lib/i18n/messages";
import { ownerEmail } from "@/lib/env";

const DOCS: LegalDoc[] = ["privacidad", "terminos", "aviso-medico"];

export const dynamicParams = false;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => DOCS.map((doc) => ({ lang, doc })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; doc: string }> }): Promise<Metadata> {
  const { lang, doc } = await params;
  if (!isLocale(lang) || !DOCS.includes(doc as LegalDoc)) return {};
  return { title: getMessages(lang).legal_titles[doc as LegalDoc] };
}

export default async function LegalPage({ params }: { params: Promise<{ lang: string; doc: string }> }) {
  const { lang, doc } = await params;
  if (!isLocale(lang) || !DOCS.includes(doc as LegalDoc)) notFound();
  const m = getMessages(lang);
  const sections = legalSections(lang, doc as LegalDoc, ownerEmail());
  return (
    <div className="wrap">
      <article className="prose">
        <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)" }}>{m.legal_titles[doc as LegalDoc]}</h1>
        <p className="meta">2026-10-16</p>
        {sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
