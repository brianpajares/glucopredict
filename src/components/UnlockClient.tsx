"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmt, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { IconCheck, IconDownload } from "./Icons";

type Payment = "NONE" | "CREATED" | "AWAITING_PAYMENT" | "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "DISPUTED";
type Delivery = "NOT_STARTED" | "PDF_READY" | "EMAIL_PENDING" | "EMAIL_ACCEPTED" | "DELIVERED_CONFIRMED" | "DELIVERY_FAILED";

interface PaypalButtons {
  render(el: HTMLElement): Promise<void>;
  close(): Promise<void>;
}
interface PaypalSdk {
  Buttons(cfg: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: (err: unknown) => void;
    onCancel?: () => void;
  }): PaypalButtons;
}
declare global {
  interface Window {
    paypal?: PaypalSdk;
  }
}

const PP_LOCALE: Record<Locale, string> = { es: "es_XC", en: "en_US", pt: "pt_BR" };

function loadPaypal(clientId: string, lang: Locale): Promise<PaypalSdk> {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const existing = document.getElementById("paypal-sdk");
    if (existing) existing.remove();
    const s = document.createElement("script");
    s.id = "paypal-sdk";
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&locale=${PP_LOCALE[lang]}`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("paypal_sdk_missing")));
    s.onerror = () => reject(new Error("paypal_sdk_load_failed"));
    document.head.appendChild(s);
  });
}

export interface UnlockProps {
  lang: Locale;
  m: Messages;
  token: string;
  priceLabel: string;
  maskedEmail: string;
  paymentsEnabled: boolean;
  sandbox: boolean;
  initial: { payment: Payment; delivery: Delivery };
}

export function UnlockClient({ lang, m, token, priceLabel, maskedEmail, paymentsEnabled, sandbox, initial }: UnlockProps) {
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState(initial);
  const [error, setError] = useState<{ msg: string; ref?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const purchaseId = useRef<string | null>(null);
  const buttons = useRef<PaypalButtons | null>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const [orderId, setOrderId] = useState<string>("");
  const storageKey = `gp-order:${token.slice(-24)}`;
  const rememberOrder = useCallback(
    (id: string) => {
      setOrderId(id);
      try {
        window.localStorage.setItem(storageKey, id);
      } catch {
        /* conveniencia por navegador: puede no estar disponible */
      }
    },
    [storageKey],
  );

  const post = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  }, []);

  // Sin base de datos PayPal es el libro contable: si este navegador recuerda una orden, se verifica su estado.
  useEffect(() => {
    if (state.payment === "COMPLETED") return;
    let saved = "";
    try {
      saved = window.localStorage.getItem(storageKey) ?? "";
    } catch {
      saved = "";
    }
    if (!saved) return;
    let cancelled = false;
    fetch(`/api/purchase/status?t=${encodeURIComponent(token)}&o=${encodeURIComponent(saved)}`)
      .then((r) => r.json())
      .then((r: { payment?: Payment; delivery?: Delivery }) => {
        if (cancelled || r.payment !== "COMPLETED") return;
        setOrderId(saved);
        setState({ payment: "COMPLETED", delivery: r.delivery ?? "NOT_STARTED" });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al aceptar los términos se crea la compra y se montan los botones de PayPal.
  useEffect(() => {
    if (!accepted || !paymentsEnabled || state.payment === "COMPLETED") return;
    let cancelled = false;
    (async () => {
      try {
        const start = await post("/api/purchase/start", { unlock_token: token, accept_terms: true });
        if (!start.ok) {
          setError({ msg: start.status === 503 ? m.unlock.err_disabled : m.unlock.err_failed, ref: String(start.data.error ?? start.status) });
          return;
        }
        const d = start.data as { purchase_id: string; paypal_client_id: string; payment: Payment; delivery: Delivery };
        purchaseId.current = d.purchase_id;
        if (d.payment === "COMPLETED") {
          setState({ payment: d.payment, delivery: d.delivery });
          return;
        }
        const sdk = await loadPaypal(d.paypal_client_id, lang);
        if (cancelled || !slot.current) return;
        slot.current.innerHTML = "";
        const b = sdk.Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 48 },
          createOrder: async () => {
            setError(null);
            const r = await post("/api/paypal/create-order", { purchase_id: purchaseId.current, unlock_token: token, accept_terms: true });
            if (!r.ok) throw new Error(String(r.data.error ?? "order_failed"));
            rememberOrder(String(r.data.order_id));
            return String(r.data.order_id);
          },
          onApprove: async (data) => {
            setBusy(true);
            const r = await post("/api/paypal/capture", { purchase_id: purchaseId.current, order_id: data.orderID, unlock_token: token });
            setBusy(false);
            if (!r.ok) {
              setError({ msg: m.unlock.err_failed, ref: String(r.data.error ?? r.status) });
              return;
            }
            const res = r.data as { payment: Payment; delivery: Delivery; ref?: string };
            setState({ payment: res.payment, delivery: res.delivery });
            if (res.payment === "FAILED") setError({ msg: m.unlock.err_failed, ref: res.ref });
          },
          onError: (err) => setError({ msg: m.unlock.err_failed, ref: err instanceof Error ? err.message.slice(0, 60) : "paypal_error" }),
        });
        buttons.current = b;
        await b.render(slot.current);
      } catch (e) {
        if (!cancelled) setError({ msg: m.unlock.err_failed, ref: e instanceof Error ? e.message.slice(0, 60) : "error" });
      }
    })();
    return () => {
      cancelled = true;
      buttons.current?.close().catch(() => undefined);
      buttons.current = null;
    };
  }, [accepted, paymentsEnabled, token, lang, post, rememberOrder, m.unlock.err_disabled, m.unlock.err_failed, state.payment]);

  // Pago pendiente: consulta el estado hasta que PayPal lo confirme.
  useEffect(() => {
    if (state.payment !== "PENDING") return;
    let n = 0;
    const id = window.setInterval(async () => {
      n += 1;
      if (n > 50) return window.clearInterval(id);
      const r = await fetch(`/api/purchase/status?t=${encodeURIComponent(token)}&o=${encodeURIComponent(orderId)}`).then((x) => x.json()).catch(() => null);
      if (r && r.payment && r.payment !== "PENDING") setState({ payment: r.payment, delivery: r.delivery });
    }, 6000);
    return () => window.clearInterval(id);
  }, [state.payment, token, orderId]);

  useEffect(() => {
    if (state.payment === "COMPLETED" || state.payment === "PENDING") doneRef.current?.focus();
  }, [state.payment]);

  if (state.payment === "COMPLETED" || state.payment === "PENDING") {
    const completed = state.payment === "COMPLETED";
    const failedDelivery = state.delivery === "DELIVERY_FAILED";
    return (
      <div className="card" role="status" data-testid="paid-done">
        <div className="success-ico">
          <IconCheck size={30} />
        </div>
        <h2 ref={doneRef} tabIndex={-1} style={{ outline: "none" }}>
          {completed ? m.unlock.done_title : m.unlock.paying}
        </h2>
        <p>{!completed ? m.unlock.done_pending : failedDelivery ? m.unlock.done_delivery_failed : fmt(m.unlock.done_body, { email: maskedEmail })}</p>
        {completed && (
          <a className="btn lg" href={`/api/purchase/download?t=${encodeURIComponent(token)}${orderId ? `&o=${encodeURIComponent(orderId)}` : ""}`} data-testid="download">
            <IconDownload /> {m.unlock.download}
          </a>
        )}
        <p className="muted" style={{ marginTop: 16 }}>
          {m.success.spam}
        </p>
      </div>
    );
  }

  return (
    <div className="pay-box" id="pay">
      {sandbox && <div className="test-banner">{m.unlock.sandbox}</div>}
      {!paymentsEnabled ? (
        <div className="error" role="alert">
          {m.unlock.err_disabled}
        </div>
      ) : (
        <>
          <label className="check">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} data-testid="accept-terms" />
            <span>
              {m.unlock.terms.split("{terms}")[0]}
              <Link href={`/${lang}/legal/terminos`} target="_blank">
                {m.unlock.terms_link}
              </Link>
              {m.unlock.terms.split("{terms}")[1]}
            </span>
          </label>
          <h3 style={{ marginTop: 16 }}>
            {m.unlock.pay_title} · {priceLabel}
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {m.unlock.pay_help}
          </p>
          <div ref={slot} className="paypal-slot" data-disabled={!accepted} aria-busy={busy} />
          {busy && <p role="status">{m.unlock.paying}</p>}
          <div role="alert" aria-live="assertive">
            {error && (
              <div className="error">
                {error.msg}
                {error.ref && <div className="ref" style={{ color: "inherit" }}>{m.unlock.ref}: ref: {error.ref}</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
