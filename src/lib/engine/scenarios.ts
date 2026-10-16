import { PARAMS } from "./engine";
import type { EngineOutput } from "./types";

export type ScenarioId = "activity" | "fruit_veg" | "waist" | "bmi" | "combined";

export interface RuleScenario {
  id: ScenarioId;
  from_score: number;
  to_score: number;
  /** Puntos que cambian en la regla (matemática del score, no efecto causal). */
  delta: number;
  causal_claim: false;
}

/**
 * Escenarios matemáticos por palanca (informe: modifiable_scenarios). Solo se incluyen palancas
 * que cambian el score. `combined` coincide con `modifiable_scenario` del motor (best case).
 */
export function buildScenarios(out: EngineOutput): RuleScenario[] {
  const c = out.components;
  const list: RuleScenario[] = [];
  const push = (id: ScenarioId, removed: number) => {
    if (removed <= 0) return;
    list.push({ id, from_score: out.score, to_score: out.score - removed, delta: removed, causal_claim: false });
  };
  push("activity", c.physical_activity);
  push("fruit_veg", c.fruit_veg);
  push("waist", c.waist);
  const bmiTarget = out.modifiable_scenario.next_bmi_threshold;
  if (bmiTarget !== null) {
    const lowerPts = bmiTarget < PARAMS.parameters.bmi_cut_1 ? PARAMS.parameters.bmi_pts_0 : PARAMS.parameters.bmi_pts_1;
    push("bmi", c.bmi - lowerPts);
  }
  const best = out.modifiable_scenario.best_case_score_under_score_rules;
  if (out.score - best > 0) {
    list.push({ id: "combined", from_score: out.score, to_score: best, delta: out.score - best, causal_claim: false });
  }
  return list;
}
