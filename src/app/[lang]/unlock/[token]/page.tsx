import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconCheck } from "@/components/Icons";
import { UnlockClient } from "@/components/UnlockClient";
import { CheckoutFailure, openUnlock, type UnlockData } from "@/lib/checkout";
import { calculate } from "@/lib/engine/engine";
import { paypalConfig, reportPrice } from "@/lib/env";
import { paymentsReady } from "@/lib/fulfillment";
import { fmt, isLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getPurchaseRepo } from "@/lib/purchases";

export const dynamic = "force-dynamic";

/** Enlace privado: noindex, sin referrer y sin caché (cabeceras en next.config). */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getMessages(lang).unlock.meta_title, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

function mask(email: string): string {
  const [u, d] = email.split("@");
  return d ? `${u.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, u.length - 1)))}@${d}` : "***";
}

export default async function UnlockPage({ params }: { params: Promise<{ lang: string; token: string }> }) {
  const { lang, token } = await params;
  if (!isLocale(lang)) notFound();
  const m = getMessages(lang);

  let data: UnlockData | null = null;
  try {
    data = openUnlock(token);
  } catch (e) {
    if (!(e instanceof CheckoutFailure)) throw e;
  }

  if (!data) {
    return (
      <div className="wrap">
        <div className="gate">
          <div className="card" data-testid="unlock-invalid">
            <h2>{m.unlock.err_invalid_t}</h2>
            <p className="muted">{m.unlock.err_invalid_b}</p>
            <Link className="btn" href={`/${lang}/calcular`}>
              {m.nav.start}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const out = calculate(data.inputs);
  const price = reportPrice();
  const ready = paymentsReady().ready;
  const repo = getPurchaseRepo();
  let initial: { payment: "NONE" | "CREATED" | "AWAITING_PAYMENT" | "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "DISPUTED"; delivery: "NOT_STARTED" | "PDF_READY" | "EMAIL_PENDING" | "EMAIL_ACCEPTED" | "DELIVERED_CONFIRMED" | "DELIVERY_FAILED" } = { payment: "NONE", delivery: "NOT_STARTED" };
  if (repo) {
    const p = await repo.findByReport(data.rid).catch(() => null);
    if (p) initial = { payment: p.payment_status, delivery: p.fulfillment_status };
  }

  return (
    <div className="wrap">
      <div className="shell wide">
        <div className="card">
          <div className="eyebrow">{m.unlock.eyebrow}</div>
          <h1 style={{ fontSize: "clamp(1.8rem,5vw,2.6rem)" }}>{fmt(m.unlock.title, { score: out.score })}</h1>
          <p className="muted">{m.unlock.summary}</p>

          <h3>{m.unlock.includes_title}</h3>
          <ul className="included">
            {m.value.items.map((it) => (
              <li key={it.t}>
                <IconCheck />
                <span>
                  <strong>{it.t}.</strong> <span className="muted">{it.b}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="price" style={{ margin: "16px 0 4px" }}>
            {price.label} <small>{m.unlock.price_label} · {m.unlock.one_time}</small>
          </p>
          <UnlockClient
            lang={lang}
            m={m}
            token={token}
            priceLabel={price.label}
            maskedEmail={mask(data.email)}
            paymentsEnabled={ready}
            sandbox={paypalConfig().env === "sandbox"}
            initial={initial}
          />
          <p className="safety">{m.safety.long}</p>
        </div>
      </div>
    </div>
  );
}
