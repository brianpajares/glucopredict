import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck, IconShield, VALUE_ICONS } from "@/components/Icons";
import { isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { reportPrice } from "@/lib/env";
import { paymentsReady } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

export default async function Landing({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const m = getMessages(lang);
  const paid = paymentsReady().ready;
  const price = reportPrice().label;
  const start = `/${lang}/calcular`;

  return (
    <>
      <div className="hero-wrap">
        <div className="wrap hero">
          <div>
            <div className="eyebrow">{m.landing.eyebrow}</div>
            <h1>{m.landing.h1}</h1>
            <p className="lead">{m.landing.body}</p>
            <ul className="trust">
              {m.landing.trust.map((t, i) => (
                <li key={t}>
                  {i === 0 ? <IconCheck /> : <IconShield />}
                  {t}
                </li>
              ))}
            </ul>
            <div className="cta-row">
              <Link className="btn lg" href={start} data-testid="cta-start">
                {m.landing.cta}
              </Link>
              <a className="btn secondary" href={`/api/sample?lang=${lang}`} target="_blank" rel="noopener">
                {m.landing.cta_secondary}
              </a>
            </div>
            <div className="stats">
              {m.landing.kpis.map((k) => (
                <div className="stat" key={k.l}>
                  <b>{k.v}</b>
                  <span>{k.l}</span>
                </div>
              ))}
            </div>
            <p className="safety">{m.safety.short}</p>
          </div>

          <div className="mock" aria-hidden="true">
            <div className="mock-page back2" />
            <div className="mock-page back1">
              <div className="blur-line m" />
              <div className="blur-line s" />
            </div>
            <div className="mock-page front">
              <div className="muted" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                {m.landing.mock_score}
              </div>
              <div className="mock-score">
                <b>14</b>
                <span className="muted">/26</span>
              </div>
              <div className="mock-bar">
                <i />
              </div>
              <div style={{ fontWeight: 700, margin: "8px 0 2px" }}>{m.landing.mock_band}: {m.result.bands.moderado}</div>
              <div className="muted" style={{ fontSize: "0.78rem", marginBottom: 16 }}>
                {m.landing.mock_note}
              </div>
              <span className="lock-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                {m.value.pages}
              </span>
              <div className="blur-line m" style={{ marginTop: 16 }} />
              <div className="blur-line" />
              <div className="blur-line s" />
              <div className="blur-line m" />
            </div>
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="how-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="how-h">{m.how.title}</h2>
          </div>
          <div className="grid3">
            {m.how.steps.map((s, i) => (
              <div className="mini" key={s.t}>
                <div className="num">{i + 1}</div>
                <h3>{s.t}</h3>
                <p>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt" aria-labelledby="value-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="value-h">{m.value.title}</h2>
            <p className="lead">{m.value.intro}</p>
          </div>
          <div className="grid3">
            {m.value.items.map((it, i) => {
              const Ic = VALUE_ICONS[i];
              return (
                <div className="mini" key={it.t}>
                  <div className="icon">
                    <Ic />
                  </div>
                  <h3>{it.t}</h3>
                  <p>{it.b}</p>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ marginTop: 18, fontWeight: 600 }}>
            {m.value.pages}
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="cmp-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="cmp-h">{m.compare.title}</h2>
          </div>
          <div className="compare">
            <div className="plan">
              <h3>{m.compare.free_title}</h3>
              <p className="price">
                US$0
              </p>
              <ul>
                {m.compare.free_items.map((t) => (
                  <li key={t}>
                    <IconCheck />
                    {t}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 20 }}>
                <Link className="btn secondary" href={start}>
                  {m.landing.cta}
                </Link>
              </div>
            </div>
            <div className="plan featured">
              <span className="tag">{m.compare.full_title}</span>
              <h3>{m.compare.full_title}</h3>
              <p className="price">
                {paid ? price : "US$0"} <small>{paid ? m.compare.one_time : m.compare.free_validation}</small>
              </p>
              <ul>
                {m.compare.full_items.map((t) => (
                  <li key={t}>
                    <IconCheck />
                    {t}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 20 }}>
                <Link className="btn" href={start}>
                  {m.landing.cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt" aria-labelledby="proof-h">
        <div className="wrap">
          <div className="section-head">
            <h2 id="proof-h">{m.proof.title}</h2>
          </div>
          <div className="grid3">
            {m.proof.items.map((p) => (
              <div className="mini" key={p.t}>
                <h3>{p.t}</h3>
                <p>{p.b}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 18 }}>
            <Link href={`/${lang}/como-funciona`}>{m.nav.how} →</Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="faq-h">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="section-head">
            <h2 id="faq-h">{m.faq.title}</h2>
          </div>
          {m.faq.items.map((f) => (
            <details className="faq" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band">
            <h2>{m.final.title}</h2>
            <p>{m.final.body}</p>
            <Link className="btn lg" href={start}>
              {m.final.cta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
