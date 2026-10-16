import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { MODEL_VERSION, PARAMS } from "@/lib/engine/engine";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getMessages(lang).how_page.meta_title };
}

export default async function HowPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const m = getMessages(lang);
  return (
    <div className="wrap">
      <article className="prose">
        <h1 style={{ fontSize: "clamp(1.9rem,5vw,2.8rem)" }}>{m.how_page.title}</h1>
        <p className="meta">
          Model v{MODEL_VERSION} · params {PARAMS.checksum_sha256.slice(0, 12)}
        </p>
        {m.how_page.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </section>
        ))}
        <p style={{ marginTop: 28 }}>
          <Link className="btn" href={`/${lang}/calcular`}>
            {m.landing.cta}
          </Link>
        </p>
      </article>
    </div>
  );
}
