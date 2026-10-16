import paramsJson from "./params.v2.json";
import { roundHalfEven } from "./round";
import type {
  BandId,
  Components,
  EngineOutput,
  FamilyHistory,
  ModelVariant,
  Sex,
  ThresholdStatus,
} from "./types";

/**
 * Motor GlucoPredict v2.0 — port TypeScript de model/engine_reference.py.
 * Funciones puras, sin I/O. La paridad con spec/test_vectors.json es un gate bloqueante.
 */

export interface CountryProfile {
  name: string;
  variant: ModelVariant;
  followup_threshold: number;
  status: ThresholdStatus;
  note: string;
  source_url: string;
}
interface BandRow {
  min: number;
  max: number;
  band: BandId;
  reference_10y_pct: number;
  source_url: string;
}
export interface ModelParams {
  model_version: string;
  checksum_sha256: string;
  parameters: Record<string, number>;
  bands: BandRow[];
  countries: Record<string, CountryProfile>;
}

export const PARAMS = paramsJson as unknown as ModelParams;
export const MODEL_VERSION = PARAMS.model_version;
export const DISCLAIMER_ES =
  "Herramienta de cribado/riesgo; no diagnostica diabetes ni prediabetes. La confirmación requiere prueba clínica y profesional de salud.";

export class EngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineValidationError";
  }
}

const REQUIRED_KEYS = [
  "age",
  "waist_threshold_sex",
  "body_measurements",
  "physical_activity_30m_daily",
  "fruit_veg_daily",
  "antihypertensive_medication",
  "history_high_glucose",
  "family_history",
] as const;

function p(name: string): number {
  const v = PARAMS.parameters[name];
  if (typeof v !== "number") throw new Error(`Parámetro del modelo ausente: ${name}`);
  return v;
}

function strictBool(value: unknown, name: string): boolean {
  if (typeof value === "boolean") return value;
  throw new EngineValidationError(`${name} debe ser booleano`);
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EngineValidationError(`${name} debe ser número finito`);
  }
  return value;
}

interface ValidatedInputs {
  country_code: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  waist_cm: number;
  activity: boolean;
  fruitVeg: boolean;
  bpMed: boolean;
  highGlucose: boolean;
  family: FamilyHistory;
}

/** Validación estricta: sin coerción de strings/0/1 (inputs.schema.json, D21). */
export function validateInputs(raw: unknown): ValidatedInputs {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new EngineValidationError("inputs debe ser un objeto");
  }
  const inputs = raw as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter((k) => !(k in inputs));
  if (missing.length > 0) throw new EngineValidationError(`Faltan inputs: ${missing.join(", ")}`);

  const country = String(inputs.country_code ?? "DEFAULT_LATAM").toUpperCase();
  const age = inputs.age;
  if (typeof age !== "number" || !Number.isInteger(age)) {
    throw new EngineValidationError("age debe ser entero");
  }
  if (age < 18 || age > 80) throw new EngineValidationError("age fuera de rango de producto (18–80)");

  const sex = String(inputs.waist_threshold_sex).toLowerCase();
  if (sex !== "female" && sex !== "male") {
    throw new EngineValidationError("waist_threshold_sex debe ser female o male");
  }
  const bm = inputs.body_measurements;
  if (typeof bm !== "object" || bm === null || Array.isArray(bm)) {
    throw new EngineValidationError("body_measurements debe ser objeto");
  }
  const m = bm as Record<string, unknown>;
  const height_cm = finiteNumber(m.height_cm, "height_cm");
  const weight_kg = finiteNumber(m.weight_kg, "weight_kg");
  const waist_cm = finiteNumber(m.waist_cm, "waist_cm");
  if (height_cm < 120 || height_cm > 220) throw new EngineValidationError("height_cm fuera de rango 120–220");
  if (weight_kg < 35 || weight_kg > 250) throw new EngineValidationError("weight_kg fuera de rango 35–250");
  if (waist_cm < 50 || waist_cm > 180) throw new EngineValidationError("waist_cm fuera de rango 50–180");

  const fh = String(inputs.family_history).toLowerCase();
  if (fh !== "none" && fh !== "second_degree" && fh !== "first_degree") {
    throw new EngineValidationError("family_history inválido");
  }
  return {
    country_code: country,
    age,
    sex,
    height_cm,
    weight_kg,
    waist_cm,
    activity: strictBool(inputs.physical_activity_30m_daily, "physical_activity_30m_daily"),
    fruitVeg: strictBool(inputs.fruit_veg_daily, "fruit_veg_daily"),
    bpMed: strictBool(inputs.antihypertensive_medication, "antihypertensive_medication"),
    highGlucose: strictBool(inputs.history_high_glucose, "history_high_glucose"),
    family: fh,
  };
}

export function resolveCountry(code: string | undefined): { code: string; profile: CountryProfile } {
  const upper = (code ?? "DEFAULT_LATAM").toUpperCase();
  const effective = upper in PARAMS.countries ? upper : "DEFAULT_LATAM";
  const profile = PARAMS.countries[effective];
  if (!profile) throw new Error("No existe perfil país ni DEFAULT_LATAM");
  return { code: effective, profile };
}

export function agePoints(age: number): number {
  if (age < p("age_cut_1")) return p("age_pts_0");
  if (age < p("age_cut_2")) return p("age_pts_1");
  if (age < p("age_cut_3")) return p("age_pts_2");
  return p("age_pts_3");
}

export function bmiPoints(bmiForScoring: number): number {
  if (bmiForScoring < p("bmi_cut_1")) return p("bmi_pts_0");
  if (bmiForScoring < p("bmi_cut_2")) return p("bmi_pts_1");
  return p("bmi_pts_2");
}

export function waistPoints(variant: ModelVariant, sex: Sex, waist: number): number {
  if (variant === "LA_FINDRISC") {
    const cut = sex === "male" ? p("la_waist_m_cut") : p("la_waist_f_cut");
    return waist >= cut ? p("la_waist_pts_high") : p("la_waist_pts_low");
  }
  const [c1, c2] =
    sex === "male" ? [p("fi_waist_m_cut1"), p("fi_waist_m_cut2")] : [p("fi_waist_f_cut1"), p("fi_waist_f_cut2")];
  if (waist < c1) return p("fi_waist_pts_0");
  if (waist < c2) return p("fi_waist_pts_1");
  return p("fi_waist_pts_2");
}

export function bandFor(score: number): BandRow {
  const row = PARAMS.bands.find((b) => b.min <= score && score <= b.max);
  if (!row) throw new Error("No hay banda para score");
  return row;
}

export function calculate(rawInputs: unknown): EngineOutput {
  const x = validateInputs(rawInputs);
  const { code: country, profile } = resolveCountry(x.country_code);
  const variant = profile.variant;
  const threshold = profile.followup_threshold;

  const bmi = x.weight_kg / (x.height_cm / 100) ** 2;
  const bmiForScoring = roundHalfEven(bmi, 6); // evita errores de frontera por coma flotante

  const components: Components = {
    age: agePoints(x.age),
    bmi: bmiPoints(bmiForScoring),
    waist: waistPoints(variant, x.sex, x.waist_cm),
    physical_activity: x.activity ? 0 : p("inactive_pts"),
    fruit_veg: x.fruitVeg ? 0 : p("not_daily_fv_pts"),
    antihypertensive: x.bpMed ? p("antihypertensive_pts") : 0,
    history_high_glucose: x.highGlucose ? p("high_glucose_history_pts") : 0,
    family_history:
      x.family === "none" ? 0 : x.family === "second_degree" ? p("family_second_degree_pts") : p("family_first_degree_pts"),
  };
  const score = Object.values(components).reduce((a, b) => a + b, 0);
  if (score < 0 || score > p("score_max")) throw new Error("Score fuera del rango parametrizado");
  const band = bandFor(score);

  // Escenario contrafactual: solo palancas modificables del score (sin causalidad).
  const mod: Components = { ...components, physical_activity: 0, fruit_veg: 0, waist: 0 };
  let targetBmi: number | null = null;
  if (bmiForScoring >= p("bmi_cut_2")) targetBmi = p("bmi_cut_2") - 0.01;
  else if (bmiForScoring >= p("bmi_cut_1")) targetBmi = p("bmi_cut_1") - 0.01;
  let approxWeight: number | null = null;
  if (targetBmi !== null) {
    approxWeight = targetBmi * (x.height_cm / 100) ** 2;
    if (targetBmi < p("bmi_cut_1")) mod.bmi = p("bmi_pts_0");
    else if (targetBmi < p("bmi_cut_2")) mod.bmi = p("bmi_pts_1");
  }
  const bestCase = Object.values(mod).reduce((a, b) => a + b, 0);

  return {
    model_version: MODEL_VERSION,
    model_variant: variant,
    country_code: country,
    bmi: roundHalfEven(bmi, 2),
    score,
    risk_band: band.band,
    reference_10y_pct: band.reference_10y_pct,
    reference_scope: "historical_FINDRISC_population_reference_not_personal_probability",
    followup_threshold: threshold,
    lab_followup_recommended: score >= threshold,
    components,
    modifiable_scenario: {
      best_case_score_under_score_rules: bestCase,
      removable_points: score - bestCase,
      next_bmi_threshold: targetBmi === null ? null : roundHalfEven(targetBmi, 2),
      approx_weight_kg_at_next_bmi_threshold: approxWeight === null ? null : roundHalfEven(approxWeight, 1),
      causal_claim: false,
    },
    disclaimer: DISCLAIMER_ES,
  };
}

export function countryProfile(code: string | undefined): CountryProfile & { code: string } {
  const { code: c, profile } = resolveCountry(code);
  return { ...profile, code: c };
}
