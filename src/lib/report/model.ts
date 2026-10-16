import { INTL_LOCALE, fmt, type Locale } from "@/lib/i18n/config";
import { PARAMS, countryProfile } from "@/lib/engine/engine";
import { orderedComponents, topComponent } from "@/lib/engine/insights";
import { buildScenarios } from "@/lib/engine/scenarios";
import { COMPONENT_KEYS, type ComponentKey, type EngineInputs, type EngineOutput } from "@/lib/engine/types";
import { reportCopy } from "./copy";

/** Modelo de documento neutro (sin PDF): lo consumen el renderer completo y el de vista previa. */
export type Block =
  | { t: "h2"; text: string }
  | { t: "p"; text: string; free?: boolean; muted?: boolean; small?: boolean }
  | { t: "bullets"; items: string[]; free?: boolean }
  | { t: "kv"; rows: [string, string][]; free?: boolean }
  | { t: "table"; head: string[]; rows: string[][]; widths: number[]; highlightRow?: number; lockFirstCol?: boolean; grid?: boolean; minRowH?: number }
  | { t: "bars"; rows: { label: string; value: number; max: number }[] }
  | { t: "scorebar"; score: number }
  | { t: "kpis"; items: { label: string; value: string; locked?: boolean }[]; free?: boolean }
  | { t: "callout"; tone: "info" | "warn" | "ok"; text: string; free?: boolean }
  | { t: "checklist"; items: string[] }
  | { t: "qa"; items: { q: string; a: string }[] }
  | { t: "link"; label: string; url: string }
  | { t: "spacer"; h: number }
  | { t: "keep"; h: number };

export interface Page {
  id: string;
  title: string;
  blocks: Block[];
}

export interface ReportContext {
  locale: Locale;
  inputs: EngineInputs;
  out: EngineOutput;
  verification: string;
  generatedAt: Date;
  privacyUrl: string;
}

export interface ReportDocument {
  locale: Locale;
  title: string;
  pages: Page[];
  meta: { verification: string; modelLine: string; generated: string; score: number };
}

const MAX_POINTS: Record<ComponentKey, number> = {
  age: PARAMS.parameters.age_pts_3,
  bmi: PARAMS.parameters.bmi_pts_2,
  waist: Math.max(PARAMS.parameters.la_waist_pts_high, PARAMS.parameters.fi_waist_pts_2),
  physical_activity: PARAMS.parameters.inactive_pts,
  fruit_veg: PARAMS.parameters.not_daily_fv_pts,
  antihypertensive: PARAMS.parameters.antihypertensive_pts,
  history_high_glucose: PARAMS.parameters.high_glucose_history_pts,
  family_history: PARAMS.parameters.family_first_degree_pts,
};
export { MAX_POINTS };

export function formatNumber(value: number, digits: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function scoringText(key: ComponentKey, ctx: ReportContext): string {
  const c = reportCopy(ctx.locale);
  const P = PARAMS.parameters;
  const s = c.scoring_labels;
  const n = (v: number) => String(v);
  switch (key) {
    case "age":
      return [
        `${fmt(s.lt, { a: n(P.age_cut_1) })}: ${P.age_pts_0}`,
        `${fmt(s.range, { a: n(P.age_cut_1), b: n(P.age_cut_2) })}: ${P.age_pts_1}`,
        `${fmt(s.range, { a: n(P.age_cut_2), b: n(P.age_cut_3) })}: ${P.age_pts_2}`,
        `${fmt(s.gte, { a: n(P.age_cut_3) })}: ${P.age_pts_3}`,
      ].join(" · ");
    case "bmi":
      return [
        s.bmi_formula,
        `${fmt(s.lt, { a: n(P.bmi_cut_1) })}: ${P.bmi_pts_0}`,
        `${fmt(s.range, { a: n(P.bmi_cut_1), b: n(P.bmi_cut_2) })}: ${P.bmi_pts_1}`,
        `${fmt(s.gte, { a: n(P.bmi_cut_2) })}: ${P.bmi_pts_2}`,
      ].join(" · ");
    case "waist": {
      const sex = c.sex[ctx.inputs.waist_threshold_sex];
      const male = ctx.inputs.waist_threshold_sex === "male";
      if (ctx.out.model_variant === "LA_FINDRISC") {
        return fmt(s.la_waist, {
          sex,
          c: n(male ? P.la_waist_m_cut : P.la_waist_f_cut),
          lo: n(P.la_waist_pts_low),
          hi: n(P.la_waist_pts_high),
        });
      }
      return fmt(s.fi_waist, {
        sex,
        c1: n(male ? P.fi_waist_m_cut1 : P.fi_waist_f_cut1),
        c2: n(male ? P.fi_waist_m_cut2 : P.fi_waist_f_cut2),
        p0: n(P.fi_waist_pts_0),
        p1: n(P.fi_waist_pts_1),
        p2: n(P.fi_waist_pts_2),
      });
    }
    case "physical_activity":
      return fmt(s.no_yes, { a: "0", b: n(P.inactive_pts) });
    case "fruit_veg":
      return fmt(s.no_yes, { a: "0", b: n(P.not_daily_fv_pts) });
    case "antihypertensive":
      return fmt(s.no_yes, { a: n(P.antihypertensive_pts), b: "0" });
    case "history_high_glucose":
      return fmt(s.no_yes, { a: n(P.high_glucose_history_pts), b: "0" });
    case "family_history":
      return `${c.family.none}: 0 | ${c.family.second_degree}: ${P.family_second_degree_pts} | ${c.family.first_degree}: ${P.family_first_degree_pts}`;
  }
}

function dataText(key: ComponentKey, ctx: ReportContext): string {
  const c = reportCopy(ctx.locale);
  const i = ctx.inputs;
  const yn = (v: boolean) => (v ? c.yes : c.no);
  switch (key) {
    case "age":
      return `${i.age} ${c.units.years}`;
    case "bmi":
      return formatNumber(ctx.out.bmi, 2, ctx.locale);
    case "waist":
      return `${formatNumber(i.body_measurements.waist_cm, 1, ctx.locale)} cm`;
    case "physical_activity":
      return yn(i.physical_activity_30m_daily);
    case "fruit_veg":
      return yn(i.fruit_veg_daily);
    case "antihypertensive":
      return yn(i.antihypertensive_medication);
    case "history_high_glucose":
      return yn(i.history_high_glucose);
    case "family_history":
      return c.family[i.family_history];
  }
}

function pointsText(pts: number, locale: Locale): string {
  const c = reportCopy(locale);
  return `${pts} ${pts === 1 ? c.units.point : c.units.points}`;
}

export function buildReport(ctx: ReportContext): ReportDocument {
  const c = reportCopy(ctx.locale);
  const { out, inputs } = ctx;
  const profile = countryProfile(out.country_code);
  const scenarios = buildScenarios(out);
  const top = topComponent(out.components);
  const num = (v: number, d: number) => formatNumber(v, d, ctx.locale);
  const generated = fmt(c.generated, {
    date: new Intl.DateTimeFormat(INTL_LOCALE[ctx.locale], { dateStyle: "long" }).format(ctx.generatedAt),
  });
  const variantLabel = out.model_variant === "LA_FINDRISC" ? "LA-FINDRISC" : "FINDRISC";
  const modelLine = fmt(c.model_line, { variant: variantLabel, version: out.model_version });
  const pages: Page[] = [];

  // ---- 1. Resumen -------------------------------------------------------------------
  pages.push({
    id: "summary",
    title: c.p1.title,
    blocks: [
      {
        t: "kpis",
        free: true,
        items: [
          { label: c.p1.score_label, value: `${out.score}/26` },
          { label: c.p1.band_label, value: c.band[out.risk_band] },
          { label: c.p1.bmi_label, value: num(out.bmi, 2), locked: true },
          { label: c.p1.threshold_label, value: `≥${out.followup_threshold} · ${c.status[profile.status]}` },
        ],
      },
      { t: "scorebar", score: out.score },
      { t: "callout", tone: out.lab_followup_recommended ? "warn" : "ok", text: out.lab_followup_recommended ? c.p1.follow_yes : c.p1.follow_no, free: true },
      {
        t: "p",
        free: true,
        text: top ? fmt(c.p1.top_factor, { name: c.comp[top].name, pts: out.components[top] }) : c.p1.no_points,
      },
      { t: "p", free: true, muted: true, small: true, text: c.p1.not_probability },
      { t: "h2", text: c.p1.inside_title },
      { t: "bullets", free: true, items: c.p1.inside },
      { t: "h2", text: c.p1.next_title },
      { t: "checklist", items: out.lab_followup_recommended ? c.p1.next_yes : c.p1.next_no },
      { t: "kv", free: true, rows: [[c.p1.verification, ctx.verification]] },
    ],
  });

  // ---- 2. Cómo leer + datos -----------------------------------------------------------
  const r = c.p2.rows;
  pages.push({
    id: "data",
    title: c.p2.title,
    blocks: [
      { t: "h2", text: c.p2.how_title },
      { t: "bullets", items: c.p2.how },
      { t: "h2", text: c.p2.data_title },
      { t: "p", muted: true, small: true, text: c.p2.data_note },
      {
        t: "kv",
        rows: [
          [r.age, `${inputs.age} ${c.units.years}`],
          [r.sex, c.sex[inputs.waist_threshold_sex]],
          [r.height, `${num(inputs.body_measurements.height_cm, 1)} cm`],
          [r.weight, `${num(inputs.body_measurements.weight_kg, 1)} kg`],
          [r.waist, `${num(inputs.body_measurements.waist_cm, 1)} cm`],
          [r.bmi, num(out.bmi, 2)],
          [r.activity, inputs.physical_activity_30m_daily ? c.yes : c.no],
          [r.fruit, inputs.fruit_veg_daily ? c.yes : c.no],
          [r.bp, inputs.antihypertensive_medication ? c.yes : c.no],
          [r.glucose, inputs.history_high_glucose ? c.yes : c.no],
          [r.family, c.family[inputs.family_history]],
          [r.country, `${profile.name} (${out.country_code})`],
        ],
      },
      { t: "callout", tone: "info", text: c.p2.safety },
    ],
  });

  // ---- 3. Componentes -----------------------------------------------------------------
  const ranking = orderedComponents(out.components)
    .filter((k) => out.components[k] > 0)
    .map((k) => `${c.comp[k].name}: ${pointsText(out.components[k], ctx.locale)}`);
  pages.push({
    id: "components",
    title: c.p3.title,
    blocks: [
      { t: "p", text: c.p3.intro },
      { t: "bars", rows: COMPONENT_KEYS.map((k) => ({ label: c.comp[k].name, value: out.components[k], max: MAX_POINTS[k] })) },
      {
        t: "table",
        head: c.p3.table_head,
        widths: [0.4, 0.26, 0.17, 0.17],
        rows: COMPONENT_KEYS.map((k) => [c.comp[k].name, dataText(k, ctx), String(out.components[k]), String(MAX_POINTS[k])]),
      },
      { t: "p", muted: true, small: true, text: `${c.p3.max_label}. ${c.p3.note}` },
      { t: "h2", text: c.p3.ranking_title },
      { t: "bullets", items: ranking.length ? ranking : [c.p3.ranking_none] },
    ],
  });

  // ---- 4-5. Detalle por componente ---------------------------------------------------
  const detail = (keys: ComponentKey[]): Block[] =>
    keys.flatMap<Block>((k) => [
      { t: "keep", h: 200 },
      { t: "h2", text: c.comp[k].name },
      { t: "p", text: c.comp[k].what },
      { t: "p", text: c.comp[k].how },
      { t: "p", muted: true, small: true, text: `${c.comps.scoring_title}: ${scoringText(k, ctx)}` },
      { t: "callout", tone: "info", text: c.comp[k].lever },
      { t: "kv", rows: [[c.comps.your_value, dataText(k, ctx)], [c.comps.your_points, `${pointsText(out.components[k], ctx.locale)} ${c.units.of} ${MAX_POINTS[k]}`]] },
    ]);
  pages.push({ id: "detail", title: c.comps.title_a, blocks: detail([...COMPONENT_KEYS]) });

  // ---- 6. Escenarios ------------------------------------------------------------------
  const scenarioBlocks: Block[] = [
    { t: "callout", tone: "warn", free: true, text: c.p6.banner },
    { t: "p", text: c.p6.intro },
  ];
  if (scenarios.length === 0) {
    scenarioBlocks.push({ t: "h2", text: c.p6.none_title }, { t: "p", text: c.p6.none_body });
  } else {
    scenarioBlocks.push({
      t: "table",
      head: c.p6.table_head,
      widths: [0.3, 0.34, 0.18, 0.18],
      rows: scenarios.map((s) => [c.p6.names[s.id], c.p6.changes[s.id], `${s.from_score} → ${s.to_score}`, `-${s.delta}`]),
    });
  }
  if (out.modifiable_scenario.approx_weight_kg_at_next_bmi_threshold !== null) {
    scenarioBlocks.push({ t: "p", muted: true, small: true, text: fmt(c.p6.weight_note, { w: num(out.modifiable_scenario.approx_weight_kg_at_next_bmi_threshold, 1) }) });
  }
  scenarioBlocks.push({ t: "h2", text: c.p6.reading_title }, { t: "bullets", items: c.p6.reading });
  pages.push({ id: "scenarios", title: c.p6.title, blocks: scenarioBlocks });

  // ---- 7. País y bandas ---------------------------------------------------------------
  const bandIndex = PARAMS.bands.findIndex((b) => b.min <= out.score && out.score <= b.max);
  pages.push({
    id: "country",
    title: c.p7.title,
    blocks: [
      { t: "h2", text: c.p7.country_title },
      {
        t: "p",
        text: fmt(c.p7.country_line, {
          country: `${profile.name} (${out.country_code})`,
          variant: variantLabel,
          t: out.followup_threshold,
          status: c.status[profile.status],
        }),
      },
      { t: "callout", tone: "info", text: out.country_code === "PE" ? c.p7.pe_note : c.p7.prelim_note },
      { t: "h2", text: c.p7.bands_title },
      {
        t: "table",
        head: c.p7.bands_head,
        widths: [0.2, 0.4, 0.4],
        highlightRow: bandIndex,
        lockFirstCol: true,
        rows: PARAMS.bands.map((b) => [`${b.min}–${b.max}`, c.band[b.band], `${b.reference_10y_pct}%*`]),
      },
      { t: "p", muted: true, small: true, text: `${c.p7.bands_caption} ${c.p7.ref_label}` },
      { t: "h2", text: c.p7.limits_title },
      { t: "bullets", items: c.p7.limits },
    ],
  });

  // ---- 8. Siguiente paso --------------------------------------------------------------
  pages.push({
    id: "next-step",
    title: c.p8.title,
    blocks: [
      { t: "p", text: c.p8.intro },
      { t: "h2", text: c.p8.tests_title },
      { t: "table", head: ["", "", ""], widths: [0.3, 0.4, 0.3], rows: c.p8.tests.map((t) => [t.name, t.what, t.prep]) },
      { t: "h2", text: c.p8.ranges_title },
      { t: "table", head: c.p8.ranges_head, widths: [0.22, 0.26, 0.26, 0.26], rows: c.p8.ranges_rows, lockFirstCol: true },
      { t: "p", muted: true, small: true, text: c.p8.ranges_note },
      { t: "h2", text: c.p8.signs_title },
      { t: "bullets", items: c.p8.signs },
      { t: "callout", tone: "warn", text: `${c.p8.urgent_title}: ${c.p8.urgent}` },
    ],
  });

  // ---- 9-10. Plan de 12 semanas --------------------------------------------------------
  const focus: string[] = [];
  const pl = c.plan;
  if (out.lab_followup_recommended) focus.push(pl.focus_lines.followup);
  if (out.components.physical_activity > 0) focus.push(fmt(pl.focus_lines.activity, { pts: out.components.physical_activity }));
  else focus.push(pl.keep.activity);
  if (out.components.fruit_veg > 0) focus.push(fmt(pl.focus_lines.fruit_veg, { pts: out.components.fruit_veg }));
  else focus.push(pl.keep.fruit_veg);
  if (out.components.waist > 0) focus.push(fmt(pl.focus_lines.waist, { pts: out.components.waist }));
  if (out.components.bmi > 0) focus.push(fmt(pl.focus_lines.bmi, { pts: out.components.bmi }));
  const phaseBlocks = (from: number, to: number): Block[] =>
    pl.phases.slice(from, to).flatMap<Block>((ph) => [
      { t: "keep", h: 150 },
      { t: "h2", text: `${ph.weeks} · ${ph.title}` },
      { t: "p", muted: true, small: true, text: ph.goal },
      { t: "checklist", items: ph.tasks },
    ]);
  pages.push({
    id: "plan",
    title: pl.title_a,
    blocks: [
      { t: "p", text: pl.intro },
      { t: "h2", text: pl.focus_title },
      { t: "bullets", items: focus },
      ...phaseBlocks(0, 6),
      { t: "callout", tone: "info", text: pl.safety },
    ],
  });

  // ---- 11. Hoja de seguimiento ---------------------------------------------------------
  pages.push({
    id: "tracker",
    title: c.tracker.title,
    blocks: [
      { t: "p", text: c.tracker.intro },
      {
        t: "table",
        head: c.tracker.head,
        widths: [0.1, 0.2, 0.18, 0.14, 0.14, 0.24],
        lockFirstCol: true,
        grid: true,
        minRowH: 34,
        rows: Array.from({ length: 12 }, (_, w) => [String(w + 1), "", "", "", "", ""]),
      },
      { t: "p", muted: true, small: true, text: c.tracker.footer },
    ],
  });

  // ---- 12. Resumen para consulta -------------------------------------------------------
  pages.push({
    id: "doctor",
    title: c.doctor.title,
    blocks: [
      { t: "p", text: c.doctor.intro },
      { t: "h2", text: c.doctor.summary_title },
      {
        t: "kv",
        rows: [
          [c.p1.score_label, `${out.score}/26 · ${c.band[out.risk_band]}`],
          [c.p1.threshold_label, `≥${out.followup_threshold} (${c.status[profile.status]}) · ${profile.name}`],
          [r.age, `${inputs.age} ${c.units.years} · ${c.sex[inputs.waist_threshold_sex]}`],
          [`${r.height} / ${r.weight}`, `${num(inputs.body_measurements.height_cm, 1)} cm / ${num(inputs.body_measurements.weight_kg, 1)} kg · BMI ${num(out.bmi, 2)}`],
          [r.waist, `${num(inputs.body_measurements.waist_cm, 1)} cm`],
          [r.activity, inputs.physical_activity_30m_daily ? c.yes : c.no],
          [r.fruit, inputs.fruit_veg_daily ? c.yes : c.no],
          [r.bp, inputs.antihypertensive_medication ? c.yes : c.no],
          [r.glucose, inputs.history_high_glucose ? c.yes : c.no],
          [r.family, c.family[inputs.family_history]],
          [c.p1.verification, ctx.verification],
        ],
      },
      { t: "h2", text: c.doctor.questions_title },
      { t: "checklist", items: c.doctor.questions },
      { t: "h2", text: c.doctor.bring_title },
      { t: "checklist", items: c.doctor.bring },
      { t: "p", muted: true, small: true, text: c.doctor.note },
    ],
  });

  // ---- 13. FAQ y glosario ---------------------------------------------------------------
  pages.push({
    id: "faq",
    title: c.faq.title,
    blocks: [
      { t: "h2", text: c.faq.faq_title },
      { t: "qa", items: c.faq.faqs },
      { t: "h2", text: c.faq.glossary_title },
      { t: "table", head: ["", ""], widths: [0.28, 0.72], lockFirstCol: true, rows: c.faq.glossary.map((g) => [g.term, g.def]) },
    ],
  });

  // ---- 14. Metodología -------------------------------------------------------------------
  pages.push({
    id: "method",
    title: c.method.title,
    blocks: [
      { t: "h2", text: c.method.formula_title },
      { t: "bullets", items: c.method.formula },
      { t: "h2", text: c.method.table_title },
      { t: "table", head: ["", ""], widths: [0.3, 0.7], lockFirstCol: true, rows: COMPONENT_KEYS.map((k) => [c.comp[k].name, scoringText(k, ctx)]) },
      { t: "h2", text: c.method.assumptions_title },
      { t: "bullets", items: c.method.assumptions },
      { t: "h2", text: c.method.version_title },
      {
        t: "kv",
        rows: [
          [c.method.version_rows.engine, out.model_version],
          [c.method.version_rows.params, PARAMS.checksum_sha256.slice(0, 16)],
          [c.method.version_rows.variant, variantLabel],
          [c.method.version_rows.rounding, c.method.version_rows.rounding_val],
        ],
      },
    ],
  });

  // ---- 15. Fuentes, privacidad, verificación --------------------------------------------
  pages.push({
    id: "sources",
    title: c.sources.title,
    blocks: [
      { t: "h2", text: c.sources.sources_title },
      ...c.sources.sources.map<Block>((s) => ({ t: "link", label: s.label, url: s.url })),
      { t: "p", muted: true, small: true, text: c.sources.license_note },
      { t: "h2", text: c.sources.privacy_title },
      { t: "bullets", items: c.sources.privacy.map((p) => fmt(p, { privacy_url: ctx.privacyUrl })) },
      { t: "h2", text: c.sources.verify_title },
      { t: "p", text: `${c.sources.verify} ${c.p1.verification}: ${ctx.verification}` },
      { t: "callout", tone: "warn", text: `${c.sources.disclaimer_title}. ${c.sources.disclaimer}` },
    ],
  });

  return { locale: ctx.locale, title: c.doc_title, pages, meta: { verification: ctx.verification, modelLine, generated, score: out.score } };
}
