"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { COUNTRIES, fmt, isCountry, type CountryCode, type Locale } from "@/lib/i18n/config";
import { calculate, countryProfile, PARAMS } from "@/lib/engine/engine";
import { topComponent } from "@/lib/engine/insights";
import type { BandId, EngineInputs, EngineOutput, FamilyHistory, Sex } from "@/lib/engine/types";
import { bmiLooksImplausible, feetInchesToCm, inchesToCm, parseLocaleNumber, poundsToKg } from "@/lib/engine/units";
import type { Messages } from "@/lib/i18n/messages";
import { IconCheck, IconLock, IconMail } from "./Icons";

type StepKey = "age" | "sex" | "height" | "weight" | "waist" | "activity" | "fruit" | "bp" | "glucose" | "family";
const STEPS: StepKey[] = ["age", "sex", "height", "weight", "waist", "activity", "fruit", "bp", "glucose", "family"];
type Unit = "metric" | "imperial";
type Phase = "wizard" | "processing" | "result" | "gate" | "success";

interface Answers {
  age?: number;
  sex?: Sex;
  height_cm?: number;
  weight_kg?: number;
  waist_cm?: number;
  activity?: boolean;
  fruit?: boolean;
  bp?: boolean;
  glucose?: boolean;
  family?: FamilyHistory;
}

export interface OfferConfig {
  mode: "paid" | "free";
  priceLabel: string;
}

const BAND_WIDTHS = PARAMS.bands.map((b) => b.max - b.min + 1);
const SCALE_TOTAL = BAND_WIDTHS.reduce((a, b) => a + b, 0);

function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, u.length - 1)))}@${d}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function defaultCountry(lang: Locale): CountryCode {
  return lang === "pt" ? "BR" : "DEFAULT_LATAM";
}

/** Campos de texto de un paso a partir de las respuestas ya guardadas (en la unidad elegida). */
function fieldsFor(key: StepKey, unit: Unit, a: Answers): Record<string, string> {
  const f: Record<string, string> = {};
  if (key === "age" && a.age !== undefined) f.age = String(a.age);
  if (key === "height" && a.height_cm !== undefined) {
    if (unit === "metric") f.cm = String(a.height_cm);
    else {
      const totalIn = a.height_cm / 2.54;
      const ft = Math.floor(totalIn / 12);
      f.ft = String(ft);
      f.inch = String(round1(totalIn - ft * 12));
    }
  }
  if (key === "weight" && a.weight_kg !== undefined) f.w = String(unit === "metric" ? a.weight_kg : round1(a.weight_kg / 0.45359237));
  if (key === "waist" && a.waist_cm !== undefined) f.w = String(unit === "metric" ? a.waist_cm : round1(a.waist_cm / 2.54));
  return f;
}

function choiceFor(key: StepKey, a: Answers): string {
  const map: Partial<Record<StepKey, string | undefined>> = {
    sex: a.sex,
    activity: a.activity === undefined ? undefined : String(a.activity),
    fruit: a.fruit === undefined ? undefined : String(a.fruit),
    bp: a.bp === undefined ? undefined : String(a.bp),
    glucose: a.glucose === undefined ? undefined : String(a.glucose),
    family: a.family,
  };
  return map[key] ?? "";
}

export function Calculator({ lang, m, offer, initialCountry }: { lang: Locale; m: Messages; offer: OfferConfig; initialCountry?: CountryCode }) {
  const [phase, setPhase] = useState<Phase>("wizard");
  const [step, setStep] = useState(0);
  const [unit, setUnit] = useState<Unit>("metric");
  const [country, setCountry] = useState<CountryCode>(initialCountry ?? defaultCountry(lang));
  const [answers, setAnswers] = useState<Answers>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [out, setOut] = useState<EngineOutput | null>(null);
  const [calcError, setCalcError] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  const key = STEPS[step];

  /** Cambia de paso y precarga campos/elección (sin efectos: todo ocurre en eventos). */
  function goTo(nextStep: number, nextUnit: Unit, a: Answers) {
    const k = STEPS[nextStep];
    setStep(nextStep);
    setUnit(nextUnit);
    setFields(fieldsFor(k, nextUnit, a));
    setChoice(choiceFor(k, a));
    setError(null);
  }

  /** Cambia la unidad conservando lo ya escrito (se convierte a métrico y se reescribe en la nueva unidad). */
  function switchUnit(nextUnit: Unit) {
    if (nextUnit === unit) return;
    const a: Answers = { ...answers };
    if (key === "height") {
      const cm = unit === "metric" ? num(fields.cm) : feetInchesToCm(num(fields.ft || "0"), num(fields.inch || "0"));
      if (Number.isFinite(cm)) a.height_cm = round1(cm);
    }
    if (key === "weight") {
      const raw = num(fields.w);
      if (Number.isFinite(raw)) a.weight_kg = round1(unit === "metric" ? raw : poundsToKg(raw));
    }
    if (key === "waist") {
      const raw = num(fields.w);
      if (Number.isFinite(raw)) a.waist_cm = round1(unit === "metric" ? raw : inchesToCm(raw));
    }
    setAnswers(a);
    goTo(step, nextUnit, a);
  }

  useEffect(() => {
    if (phase === "wizard") titleRef.current?.focus();
    if (phase === "result") resultRef.current?.focus();
  }, [phase, step]);

  const compute = useCallback(
    (a: Answers, c: CountryCode): EngineOutput | null => {
      try {
        const inputs: EngineInputs = {
          country_code: c,
          age: a.age as number,
          waist_threshold_sex: a.sex as Sex,
          body_measurements: { height_cm: a.height_cm as number, weight_kg: a.weight_kg as number, waist_cm: a.waist_cm as number },
          physical_activity_30m_daily: a.activity as boolean,
          fruit_veg_daily: a.fruit as boolean,
          antihypertensive_medication: a.bp as boolean,
          history_high_glucose: a.glucose as boolean,
          family_history: a.family as FamilyHistory,
        };
        return calculate(inputs);
      } catch {
        return null;
      }
    },
    [],
  );

  const inputsForApi = useMemo((): Omit<EngineInputs, "country_code"> | null => {
    if (answers.age === undefined || !answers.sex || answers.height_cm === undefined || answers.weight_kg === undefined || answers.waist_cm === undefined) return null;
    if (answers.activity === undefined || answers.fruit === undefined || answers.bp === undefined || answers.glucose === undefined || !answers.family) return null;
    return {
      age: answers.age,
      waist_threshold_sex: answers.sex,
      body_measurements: { height_cm: answers.height_cm, weight_kg: answers.weight_kg, waist_cm: answers.waist_cm },
      physical_activity_30m_daily: answers.activity,
      fruit_veg_daily: answers.fruit,
      antihypertensive_medication: answers.bp,
      history_high_glucose: answers.glucose,
      family_history: answers.family,
    };
  }, [answers]);

  function num(raw: string | undefined): number {
    return parseLocaleNumber(raw ?? "");
  }

  function validateStep(): { patch?: Answers; error?: string } {
    const e = m.wizard.err;
    switch (key) {
      case "age": {
        const v = num(fields.age);
        if (!Number.isFinite(v)) return { error: fields.age?.trim() ? e.number : m.common.required };
        if (!Number.isInteger(v) || v < 18 || v > 80) return { error: e.age };
        return { patch: { age: v } };
      }
      case "height": {
        let cm: number;
        if (unit === "metric") cm = num(fields.cm);
        else cm = feetInchesToCm(num(fields.ft || "0"), num(fields.inch || "0"));
        if (!Number.isFinite(cm)) return { error: m.common.required };
        cm = round1(cm);
        if (cm < 120 || cm > 220) return { error: e.height };
        return { patch: { height_cm: cm } };
      }
      case "weight": {
        const raw = num(fields.w);
        if (!Number.isFinite(raw)) return { error: fields.w?.trim() ? e.number : m.common.required };
        const kg = round1(unit === "metric" ? raw : poundsToKg(raw));
        if (kg < 35 || kg > 250) return { error: e.weight };
        if (answers.height_cm !== undefined && bmiLooksImplausible(answers.height_cm, kg)) return { error: e.bmi };
        return { patch: { weight_kg: kg } };
      }
      case "waist": {
        const raw = num(fields.w);
        if (!Number.isFinite(raw)) return { error: fields.w?.trim() ? e.number : m.common.required };
        const cm = round1(unit === "metric" ? raw : inchesToCm(raw));
        if (cm < 50 || cm > 180) return { error: e.waist };
        return { patch: { waist_cm: cm } };
      }
      case "sex":
        return choice === "female" || choice === "male" ? { patch: { sex: choice } } : { error: m.common.required };
      case "family":
        return choice === "none" || choice === "second_degree" || choice === "first_degree" ? { patch: { family: choice } } : { error: m.common.required };
      default: {
        if (choice !== "true" && choice !== "false") return { error: m.common.required };
        const v = choice === "true";
        return { patch: { [key]: v } as Answers };
      }
    }
  }

  function next() {
    const r = validateStep();
    if (r.error) {
      setError(r.error);
      return;
    }
    const merged = { ...answers, ...r.patch };
    setAnswers(merged);
    if (step < STEPS.length - 1) {
      goTo(step + 1, unit, merged);
      return;
    }
    setPhase("processing");
    setCalcError(false);
    window.setTimeout(() => {
      const res = compute(merged, country);
      if (!res) {
        setCalcError(true);
        setPhase("wizard");
        return;
      }
      setOut(res);
      setPhase("result");
      window.scrollTo({ top: 0 });
    }, 600);
  }

  function back() {
    if (step > 0) goTo(step - 1, unit, answers);
  }

  function onCountry(c: CountryCode) {
    setCountry(c);
    if (out) {
      const res = compute(answers, c);
      if (res) setOut(res);
    }
  }

  function restart() {
    setAnswers({});
    goTo(0, unit, {});
    setOut(null);
    setPhase("wizard");
    window.scrollTo({ top: 0 });
  }

  // ---------------- UI de pasos ----------------
  const q = m.wizard.q[key === "fruit" ? "fruit" : key];
  const isNumeric = key === "age" || key === "height" || key === "weight" || key === "waist";
  const showUnits = key === "height" || key === "weight" || key === "waist";

  const choiceOptions: [string, string][] =
    key === "sex"
      ? [
          ["female", m.wizard.female],
          ["male", m.wizard.male],
        ]
      : key === "family"
        ? [
            ["none", m.wizard.fam_none],
            ["second_degree", m.wizard.fam_second],
            ["first_degree", m.wizard.fam_first],
          ]
        : [
            ["true", m.common.yes],
            ["false", m.common.no],
          ];

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    next();
  }

  if (phase === "processing") {
    return (
      <div className="process" role="status" aria-live="polite">
        <div className="loader" aria-hidden="true" />
        <h2>{m.common.loading}</h2>
        <p className="muted">{m.common.loading_sub}</p>
      </div>
    );
  }

  if (phase === "wizard") {
    const errId = "q-error";
    return (
      <div className="shell">
        <div className="progress-label" aria-hidden="true">
          <span>{fmt(m.common.step_of, { i: step + 1, n: STEPS.length })}</span>
          <span>{m.wizard.privacy_note}</span>
        </div>
        <progress max={STEPS.length} value={step + 1} aria-label={fmt(m.common.step_of, { i: step + 1, n: STEPS.length })} />
        <form className="card" onSubmit={onSubmit} noValidate>
          <h2 className="q-title" ref={titleRef} tabIndex={-1}>
            {q.t}
          </h2>
          <p className="q-help" id="q-help">
            {q.h}
          </p>

          {showUnits && (
            <div className="seg" role="group" aria-label="Units">
              {(["metric", "imperial"] as Unit[]).map((u) => (
                <button key={u} type="button" aria-pressed={unit === u} onClick={() => switchUnit(u)}>
                  {m.wizard.units[u]}
                </button>
              ))}
            </div>
          )}

          {isNumeric && key === "age" && (
            <div className="field">
              <label className="sr-only" htmlFor="f-age">
                {q.t}
              </label>
              <input
                id="f-age"
                className="input"
                inputMode="numeric"
                autoComplete="off"
                value={fields.age ?? ""}
                onChange={(e) => setFields({ ...fields, age: e.target.value })}
                aria-invalid={!!error}
                aria-describedby={`q-help ${error ? errId : ""}`}
              />
            </div>
          )}
          {key === "height" && unit === "metric" && (
            <div className="field">
              <label className="sr-only" htmlFor="f-cm">
                {q.t}
              </label>
              <div className="unitbox">
                <input id="f-cm" className="input" inputMode="decimal" autoComplete="off" value={fields.cm ?? ""} onChange={(e) => setFields({ ...fields, cm: e.target.value })} aria-invalid={!!error} aria-describedby={`q-help ${error ? errId : ""}`} />
                <span className="unit">cm</span>
              </div>
            </div>
          )}
          {key === "height" && unit === "imperial" && (
            <div className="row2 field">
              <div className="unitbox">
                <label className="sr-only" htmlFor="f-ft">
                  {m.wizard.feet}
                </label>
                <input id="f-ft" className="input" inputMode="numeric" value={fields.ft ?? ""} onChange={(e) => setFields({ ...fields, ft: e.target.value })} aria-invalid={!!error} aria-describedby={`q-help ${error ? errId : ""}`} />
                <span className="unit">{m.wizard.feet}</span>
              </div>
              <div className="unitbox">
                <label className="sr-only" htmlFor="f-in">
                  {m.wizard.inches}
                </label>
                <input id="f-in" className="input" inputMode="decimal" value={fields.inch ?? ""} onChange={(e) => setFields({ ...fields, inch: e.target.value })} aria-invalid={!!error} aria-describedby={`q-help ${error ? errId : ""}`} />
                <span className="unit">{m.wizard.inches}</span>
              </div>
            </div>
          )}
          {(key === "weight" || key === "waist") && (
            <div className="field">
              <label className="sr-only" htmlFor="f-w">
                {q.t}
              </label>
              <div className="unitbox">
                <input id="f-w" className="input" inputMode="decimal" autoComplete="off" value={fields.w ?? ""} onChange={(e) => setFields({ ...fields, w: e.target.value })} aria-invalid={!!error} aria-describedby={`q-help ${error ? errId : ""}`} />
                <span className="unit">{key === "weight" ? (unit === "metric" ? "kg" : "lb") : unit === "metric" ? "cm" : m.wizard.inches}</span>
              </div>
            </div>
          )}

          {!isNumeric && (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }} aria-describedby={`q-help ${error ? errId : ""}`}>
              <legend className="sr-only">{q.t}</legend>
              <div className="choices">
                {choiceOptions.map(([val, label]) => (
                  <div className="choice" key={`${key}-${val}`}>
                    <input id={`c-${key}-${val}`} type="radio" name={`c-${key}`} value={val} checked={choice === val} onChange={() => { setChoice(val); setError(null); }} />
                    <label htmlFor={`c-${key}-${val}`}>
                      <span className="dot" aria-hidden="true" />
                      <span>{label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {key === "age" && (
            <div className="note" style={{ marginTop: 6 }}>
              <label htmlFor="f-country" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                {m.wizard.country_label}
              </label>
              <select id="f-country" className="select" style={{ minHeight: 48, fontSize: "1rem" }} value={country} onChange={(e) => isCountry(e.target.value) && setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {m.wizard.countries[c]}
                  </option>
                ))}
              </select>
              <p className="muted" style={{ margin: "8px 0 0", fontSize: "0.88rem" }}>
                {m.wizard.country_help}
              </p>
            </div>
          )}

          <div id={errId} role="alert" aria-live="assertive">
            {error && <div className="error">{error}</div>}
            {calcError && <div className="error">{m.err.server_b}</div>}
          </div>

          <div className="actions">
            <button className="linkbtn" type="button" onClick={back} style={{ visibility: step === 0 ? "hidden" : "visible" }}>
              {m.common.back}
            </button>
            <button className="btn" type="submit">
              {m.common.continue}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---------------- Resultado / gate / éxito ----------------
  if (!out) return null;
  const profile = countryProfile(out.country_code);
  const top = topComponent(out.components);
  const bandName = m.result.bands[out.risk_band as BandId];
  const markerPct = ((out.score + 0.5) / SCALE_TOTAL) * 100;
  const followCls = out.lab_followup_recommended ? "warn" : "ok";

  if (phase === "gate" || phase === "success") {
    return (
      <Gate
        lang={lang}
        m={m}
        offer={offer}
        phase={phase}
        country={country}
        inputs={inputsForApi}
        onBack={() => setPhase("result")}
        onSuccess={() => setPhase("success")}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="shell wide">
      <div className="card" data-testid="result-card">
        <div className="eyebrow">{m.result.eyebrow}</div>
        <div className="score-row">
          <div>
            <div className="score-num" data-testid="score">
              {out.score}
              <small>/26</small>
            </div>
            <div className="band-pill" data-testid="band">
              {m.result.band_label}: <strong>{bandName}</strong>
            </div>
          </div>
          <div>
            <h2 ref={resultRef} tabIndex={-1} style={{ outline: "none" }}>
              {fmt(m.result.title, { score: out.score })}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {m.safety.not_probability}
            </p>
          </div>
        </div>

        <div className="scale" role="img" aria-label={`${m.result.chart_label}: ${out.score}/26 · ${bandName}`}>
          <div className="scale-bar">
            {BAND_WIDTHS.map((w, i) => (
              <span key={i} style={{ width: `${(w / SCALE_TOTAL) * 100}%`, background: `var(--band-${i + 1})` }} />
            ))}
            <div className="marker" style={{ left: `${markerPct}%` }}>
              <b>{out.score}</b>
            </div>
          </div>
          <div className="scale-labels" aria-hidden="true">
            {PARAMS.bands.map((b, i) => (
              <span key={b.band} style={{ width: `${(BAND_WIDTHS[i] / SCALE_TOTAL) * 100}%` }}>
                {m.result.bands[b.band]}
              </span>
            ))}
          </div>
        </div>

        <div className="chips">
          <span className={`chip ${profile.status === "verificado" ? "ok" : "warn"}`} title={profile.status === "verificado" ? m.result.status_verified_help : m.result.status_prelim_help}>
            {fmt(m.result.threshold, { country: m.wizard.countries[out.country_code as CountryCode], t: out.followup_threshold })} ·{" "}
            <strong>{profile.status === "verificado" ? m.result.status_verified : m.result.status_prelim}</strong>
          </span>
        </div>
        <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 6px" }}>
          {profile.status === "verificado" ? m.result.status_verified_help : m.result.status_prelim_help}
        </p>
        <div className="ctrl-country">
          <label htmlFor="r-country" className="muted" style={{ fontSize: "0.9rem" }}>
            {m.result.change_country}
          </label>
          <select id="r-country" className="select" value={country} onChange={(e) => isCountry(e.target.value) && onCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {m.wizard.countries[c]}
              </option>
            ))}
          </select>
        </div>

        <div className={`callout ${followCls}`} role="status" data-testid="followup">
          <strong>{out.lab_followup_recommended ? m.result.follow_yes_t : m.result.follow_no_t}</strong>
          <span>{out.lab_followup_recommended ? m.result.follow_yes : m.result.follow_no}</span>
        </div>

        <div className="insight">
          <div className="icon" aria-hidden="true" style={{ margin: 0 }}>
            <IconCheck />
          </div>
          <div>
            <strong>{m.result.insight_t}</strong>
            <p style={{ margin: 0 }} className="muted">
              {top ? fmt(m.result.insight, { name: m.result.comp[top], pts: out.components[top] }) : m.result.insight_none}
            </p>
          </div>
        </div>
        <p className="safety">{m.safety.long}</p>
      </div>

      <section className="offer" aria-labelledby="offer-title">
        <div>
          <div className="eyebrow">{m.gate.eyebrow}</div>
          <h2 id="offer-title">{m.offer.title}</h2>
          <p className="muted">{offer.mode === "paid" ? fmt(m.offer.sub_paid, { price: offer.priceLabel }) : m.offer.sub_free}</p>
          <div className="locked-grid" aria-hidden="true">
            {m.offer.locked.map((t) => (
              <div className="locked-card" key={t}>
                <span className="lock-chip">
                  <IconLock />
                </span>
                <strong>{t}</strong>
                <div className="blur-line m" />
                <div className="blur-line s" />
              </div>
            ))}
          </div>
        </div>
        <div className="offer-cta">
          {offer.mode === "paid" && (
            <p className="price">
              {offer.priceLabel} <small>{m.compare.one_time}</small>
            </p>
          )}
          <button className="btn lg" type="button" onClick={() => setPhase("gate")} data-testid="open-gate">
            <IconMail /> {offer.mode === "paid" ? m.offer.cta_paid : m.offer.cta_free}
          </button>
          <a className="linkbtn" href={`/api/sample?lang=${lang}`} target="_blank" rel="noopener" style={{ textAlign: "center", paddingTop: 10 }}>
            {m.offer.sample}
          </a>
          <p className="muted" style={{ fontSize: "0.88rem", margin: 0 }}>
            {m.offer.includes}
          </p>
        </div>
      </section>

      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="linkbtn" type="button" onClick={restart}>
          {m.common.new_calc}
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------------------------
// Gate de email + éxito
// -----------------------------------------------------------------------------------------------
function Gate(props: {
  lang: Locale;
  m: Messages;
  offer: OfferConfig;
  phase: "gate" | "success";
  country: CountryCode;
  inputs: Omit<EngineInputs, "country_code"> | null;
  onBack: () => void;
  onSuccess: () => void;
  onRestart: () => void;
}) {
  const { lang, m, offer, phase, country, inputs } = props;
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [ownerCopy, setOwnerCopy] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; ref?: string } | null>(null);
  const [done, setDone] = useState<{ email: string; unlockUrl?: string } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, [phase]);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
      setError({ msg: m.gate.err_email });
      return;
    }
    if (!consent) {
      setError({ msg: m.gate.err_consent });
      return;
    }
    if (!inputs) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, country_code: country, inputs, email: em, consent_report_delivery: true, consent_owner_copy: ownerCopy, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { unlock_url?: string; error?: string; ref?: string };
      if (res.ok) {
        setDone({ email: em, unlockUrl: data.unlock_url });
        props.onSuccess();
        return;
      }
      const msg =
        res.status === 429 ? m.gate.err_rate : data.error === "invalid_email" ? m.gate.err_email : res.status === 503 && data.ref?.startsWith("email_not_configured") ? m.gate.err_config : m.gate.err_generic;
      setError({ msg, ref: data.ref ?? data.error });
    } catch {
      setError({ msg: m.gate.err_generic, ref: "network_error" });
    } finally {
      setBusy(false);
    }
  }

  if (phase === "success" && done) {
    return (
      <div className="gate">
        <div className="card" role="status" data-testid="success">
          <div className="success-ico">
            <IconMail size={30} />
          </div>
          <h2 ref={titleRef} tabIndex={-1} style={{ outline: "none" }}>
            {m.success.title}
          </h2>
          <p>{fmt(offer.mode === "paid" ? m.success.body_paid : m.success.body_free, { email: maskEmail(done.email) })}</p>
          <p className="muted">{m.success.spam}</p>
          {done.unlockUrl && (
            <a className="btn lg" href={done.unlockUrl} data-testid="unlock-link">
              {fmt(m.success.unlock_price, { price: offer.priceLabel })}
            </a>
          )}
          <div style={{ marginTop: 14 }}>
            <button className="linkbtn" type="button" onClick={props.onRestart}>
              {m.common.new_calc}
            </button>
          </div>
          <p className="safety">{m.safety.long}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gate">
      <form className="card" onSubmit={submit} noValidate>
        <div className="eyebrow">{m.gate.eyebrow}</div>
        <h2 ref={titleRef} tabIndex={-1} style={{ outline: "none" }}>
          {offer.mode === "paid" ? m.gate.title_paid : m.gate.title_free}
        </h2>
        <p className="muted">{offer.mode === "paid" ? m.gate.body_paid : m.gate.body_free}</p>
        <div className="field">
          <label className="lbl" htmlFor="g-email">
            {m.gate.email_label}
          </label>
          <input id="g-email" className="input" type="email" inputMode="email" autoComplete="email" placeholder={m.gate.email_ph} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "g-error" : undefined} />
        </div>
        <div className="hp" aria-hidden="true">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{m.gate.consent}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={ownerCopy} onChange={(e) => setOwnerCopy(e.target.checked)} />
          <span className="muted">{m.gate.consent_owner}</span>
        </label>
        <p className="privacy">
          {m.gate.privacy}{" "}
          <Link href={`/${lang}/legal/privacidad`}>{m.nav.privacy}</Link>
        </p>
        <div id="g-error" role="alert" aria-live="assertive">
          {error && (
            <div className="error">
              {error.msg}
              {error.ref && (
                <div className="ref" style={{ color: "inherit", opacity: 0.85 }}>
                  {m.gate.ref}: ref: {error.ref}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="actions">
          <button className="linkbtn" type="button" onClick={props.onBack}>
            {m.common.back}
          </button>
          <button className="btn" type="submit" disabled={busy} data-testid="submit-email">
            {busy ? m.gate.sending : m.gate.cta}
          </button>
        </div>
      </form>
    </div>
  );
}
