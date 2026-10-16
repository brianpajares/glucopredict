/** Conversión imperial → métrico (ux_spec B6). El motor solo recibe cm/kg. */
export const INCH_TO_CM = 2.54;
export const LB_TO_KG = 0.45359237;

export function inchesToCm(inches: number): number {
  return inches * INCH_TO_CM;
}
export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * INCH_TO_CM;
}
export function poundsToKg(pounds: number): number {
  return pounds * LB_TO_KG;
}

/** BMI derivado fuera de 14–60 dispara revisión de unidades (components.md). */
export function bmiLooksImplausible(heightCm: number, weightKg: number): boolean {
  const bmi = weightKg / (heightCm / 100) ** 2;
  return bmi < 14 || bmi > 60;
}

/** Normaliza decimal con coma local ("72,5") a número. Devuelve NaN si no es válido. */
export function parseLocaleNumber(raw: string): number {
  const cleaned = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}
