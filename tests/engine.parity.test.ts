import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/engine/engine";
import { buildScenarios } from "@/lib/engine/scenarios";
import { feetInchesToCm, inchesToCm, poundsToKg } from "@/lib/engine/units";

/** Gate bloqueante: paridad con spec/test_vectors.json (29 válidos + 9 inválidos). */
interface Vector {
  id: string;
  inputs: unknown;
  expected: Record<string, unknown>;
}
interface ErrorVector {
  id: string;
  inputs: unknown;
  expected_error: { type: string; contains: string };
}
const vectors = JSON.parse(readFileSync(join(process.cwd(), "spec", "test_vectors.json"), "utf-8")) as {
  count: number;
  error_count: number;
  vectors: Vector[];
  error_vectors: ErrorVector[];
};

describe("paridad del motor TypeScript con spec/test_vectors.json", () => {
  it("declara 29 vectores válidos y 9 inválidos", () => {
    expect(vectors.vectors).toHaveLength(29);
    expect(vectors.error_vectors).toHaveLength(9);
  });

  for (const v of vectors.vectors) {
    it(`válido: ${v.id}`, () => {
      expect(calculate(v.inputs)).toEqual(v.expected);
    });
  }

  for (const v of vectors.error_vectors) {
    it(`inválido: ${v.id}`, () => {
      expect(() => calculate(v.inputs)).toThrowError(v.expected_error.contains);
    });
  }
});

describe("conversión imperial canónica (AT-03)", () => {
  it("in→cm, lb→kg", () => {
    expect(feetInchesToCm(5, 8)).toBeCloseTo(172.72, 6);
    expect(inchesToCm(36)).toBeCloseTo(91.44, 6);
    expect(poundsToKg(180)).toBeCloseTo(81.6466266, 6);
  });
});

describe("escenarios por palanca", () => {
  it("la suma de palancas individuales respeta el best case del motor", () => {
    for (const v of vectors.vectors) {
      const out = calculate(v.inputs);
      const scenarios = buildScenarios(out);
      const combined = scenarios.find((s) => s.id === "combined");
      const singles = scenarios.filter((s) => s.id !== "combined");
      const sum = singles.reduce((a, s) => a + s.delta, 0);
      expect(sum).toBe(out.modifiable_scenario.removable_points);
      if (out.modifiable_scenario.removable_points > 0) {
        expect(combined?.to_score).toBe(out.modifiable_scenario.best_case_score_under_score_rules);
      } else {
        expect(combined).toBeUndefined();
      }
      expect(scenarios.every((s) => s.causal_claim === false)).toBe(true);
    }
  });
});
