/**
 * Redondeo half-even sobre la expansión decimal exacta del double.
 * Replica `round(x, n)` de Python (referencia del motor) para paridad bit a bit.
 */
export function roundHalfEven(value: number, digits: number): number {
  if (!Number.isFinite(value)) return value;
  const negative = value < 0;
  const exact = Math.abs(value).toFixed(Math.min(100, digits + 30));
  const [intPart, fracPart = ""] = exact.split(".");
  const keep = fracPart.slice(0, digits);
  const rest = fracPart.slice(digits);
  let digitsStr = intPart + keep;
  const firstRest = rest.charCodeAt(0) - 48;
  const restIsExactHalf = firstRest === 5 && /^50*$/.test(rest);
  const lastDigit = digitsStr.length ? digitsStr.charCodeAt(digitsStr.length - 1) - 48 : 0;
  let roundUp = false;
  if (firstRest > 5) roundUp = true;
  else if (firstRest === 5) roundUp = restIsExactHalf ? lastDigit % 2 === 1 : true;
  if (roundUp) {
    const bumped = (BigInt(digitsStr) + BigInt(1)).toString().padStart(digitsStr.length, "0");
    digitsStr = bumped;
  }
  const scaled = digits > 0 ? `${digitsStr.slice(0, digitsStr.length - digits)}.${digitsStr.slice(digitsStr.length - digits)}` : digitsStr;
  const out = Number(scaled);
  return negative ? -out : out;
}
