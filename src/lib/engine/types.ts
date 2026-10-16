export type Sex = "female" | "male";
export type FamilyHistory = "none" | "second_degree" | "first_degree";
export type ModelVariant = "LA_FINDRISC" | "FINDRISC";
export type ThresholdStatus = "verificado" | "preliminar";
export type BandId = "bajo" | "ligeramente_elevado" | "moderado" | "alto" | "muy_alto";

export const COMPONENT_KEYS = [
  "age",
  "bmi",
  "waist",
  "physical_activity",
  "fruit_veg",
  "antihypertensive",
  "history_high_glucose",
  "family_history",
] as const;
export type ComponentKey = (typeof COMPONENT_KEYS)[number];
export type Components = Record<ComponentKey, number>;

/** Frontera del motor: solo unidades métricas, tipos estrictos (inputs.schema.json). */
export interface EngineInputs {
  country_code?: string;
  age: number;
  waist_threshold_sex: Sex;
  body_measurements: { height_cm: number; weight_kg: number; waist_cm: number };
  physical_activity_30m_daily: boolean;
  fruit_veg_daily: boolean;
  antihypertensive_medication: boolean;
  history_high_glucose: boolean;
  family_history: FamilyHistory;
}

export interface ModifiableScenario {
  best_case_score_under_score_rules: number;
  removable_points: number;
  next_bmi_threshold: number | null;
  approx_weight_kg_at_next_bmi_threshold: number | null;
  causal_claim: false;
}

export interface EngineOutput {
  model_version: string;
  model_variant: ModelVariant;
  country_code: string;
  bmi: number;
  score: number;
  risk_band: BandId;
  reference_10y_pct: number;
  reference_scope: "historical_FINDRISC_population_reference_not_personal_probability";
  followup_threshold: number;
  lab_followup_recommended: boolean;
  components: Components;
  modifiable_scenario: ModifiableScenario;
  disclaimer: string;
}
