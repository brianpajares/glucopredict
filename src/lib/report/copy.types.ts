import type { BandId, ComponentKey } from "@/lib/engine/types";

export interface ComponentCopy {
  name: string;
  /** Qué evalúa la regla. */
  what: string;
  /** Cómo se mide / se responde correctamente. */
  how: string;
  /** Qué es y qué no es modificable (lenguaje no culpabilizante). */
  lever: string;
}

export interface PlanPhase {
  weeks: string;
  title: string;
  goal: string;
  tasks: string[];
}

export interface ReportCopy {
  app: string;
  doc_title: string;
  footer_note: string;
  page_of: string; // "Página {i} de {n}"
  generated: string; // "Generado el {date}"
  model_line: string; // "Modelo {variant} v{version}"
  preview: {
    header: string;
    watermark: string;
    locked_tag: string;
    card_title: string;
    card_body: string;
    button: string;
    footer: string;
  };
  band: Record<BandId, string>;
  yes: string;
  no: string;
  sex: { female: string; male: string };
  family: { none: string; second_degree: string; first_degree: string };
  status: { verificado: string; preliminar: string };
  units: { years: string; points: string; point: string; of: string };

  p1: {
    title: string;
    score_label: string;
    band_label: string;
    bmi_label: string;
    threshold_label: string;
    follow_yes: string;
    follow_no: string;
    top_factor: string; // "El factor con más puntos en tu regla es {name} ({pts} pts)."
    no_points: string;
    not_probability: string;
    inside_title: string;
    inside: string[]; // index
    verification: string;
    next_title: string;
    next_yes: string[];
    next_no: string[];
  };
  p2: {
    title: string;
    how_title: string;
    how: string[];
    glance_title: string;
    data_title: string;
    data_note: string;
    rows: { age: string; sex: string; height: string; weight: string; waist: string; bmi: string; activity: string; fruit: string; bp: string; glucose: string; family: string; country: string };
    safety: string;
  };
  p3: {
    title: string;
    intro: string;
    table_head: [string, string, string, string];
    max_label: string;
    note: string;
    ranking_title: string;
    ranking_none: string;
  };
  comps: { title_a: string; title_b: string; scoring_title: string; your_title: string; your_value: string; your_points: string };
  comp: Record<ComponentKey, ComponentCopy>;
  scoring_labels: {
    lt: string; // "menos de {a}"
    range: string; // "{a} a {b}"
    gte: string; // "{a} o más"
    bmi_formula: string;
    la_waist: string; // "Variante LA-FINDRISC: menos de {c} cm = 0; {c} cm o más = 4 ({sex})"
    fi_waist: string;
    no_yes: string; // "Sí = {a} · No = {b}"
  };
  p6: {
    title: string;
    banner: string;
    intro: string;
    table_head: [string, string, string, string];
    names: { activity: string; fruit_veg: string; waist: string; bmi: string; combined: string };
    changes: { activity: string; fruit_veg: string; waist: string; bmi: string; combined: string };
    none_title: string;
    none_body: string;
    weight_note: string; // "{w} kg"
    reading_title: string;
    reading: string[];
  };
  p7: {
    title: string;
    country_title: string;
    country_line: string; // "Perfil activo: {country} · modelo {variant} · umbral de seguimiento ≥{t} · estado {status}"
    pe_note: string;
    prelim_note: string;
    bands_title: string;
    bands_head: [string, string, string];
    bands_caption: string;
    ref_label: string;
    limits_title: string;
    limits: string[];
  };
  p8: {
    title: string;
    intro: string;
    tests_title: string;
    tests: { name: string; what: string; prep: string }[];
    ranges_title: string;
    ranges_head: [string, string, string, string];
    ranges_rows: string[][];
    ranges_note: string;
    signs_title: string;
    signs: string[];
    urgent_title: string;
    urgent: string;
  };
  plan: {
    title_a: string;
    title_b: string;
    intro: string;
    focus_title: string;
    focus_none: string;
    focus_lines: { activity: string; fruit_veg: string; waist: string; bmi: string; followup: string };
    keep: { activity: string; fruit_veg: string };
    phases: PlanPhase[];
    safety: string;
  };
  tracker: {
    title: string;
    intro: string;
    head: string[]; // Semana, Min. actividad/día, Días fruta/verdura, Cintura (cm), Peso (kg), Notas
    footer: string;
  };
  doctor: {
    title: string;
    intro: string;
    summary_title: string;
    questions_title: string;
    questions: string[];
    bring_title: string;
    bring: string[];
    note: string;
  };
  faq: {
    title: string;
    faq_title: string;
    faqs: { q: string; a: string }[];
    glossary_title: string;
    glossary: { term: string; def: string }[];
  };
  method: {
    title: string;
    formula_title: string;
    formula: string[];
    table_title: string;
    assumptions_title: string;
    assumptions: string[];
    version_title: string;
    version_rows: { engine: string; params: string; variant: string; rounding: string; rounding_val: string };
  };
  sources: {
    title: string;
    sources_title: string;
    sources: { label: string; url: string }[];
    license_note: string;
    privacy_title: string;
    privacy: string[];
    verify_title: string;
    verify: string;
    disclaimer_title: string;
    disclaimer: string;
  };
}
