type Vars = Record<string, number>;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeUnitPrice(basePrice: number, formula: string | null | undefined, vars: Vars) {
  if (!formula || !formula.trim()) return Number(basePrice.toFixed(2));

  const safe = formula.trim();
  if (!/^[\d\s+\-*/().,_a-zA-Z<>!=?:&|]+$/.test(safe)) return Number(basePrice.toFixed(2));

  const keys = Object.keys(vars).filter((k) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
  const values = keys.map((k) => toNumber(vars[k]));

  try {
    const fn = new Function(...keys, `"use strict"; return (${safe});`) as (...args: number[]) => number;
    const result = fn(...values);
    if (!Number.isFinite(result)) return Number(basePrice.toFixed(2));
    return Number(result.toFixed(2));
  } catch {
    return Number(basePrice.toFixed(2));
  }
}

export function buildPricingVars(
  qty: number,
  basePrice: number,
  attributeValues: Record<string, unknown> | null | undefined
) {
  const vars: Vars = { qty: toNumber(qty), basePrice: toNumber(basePrice) };
  if (attributeValues) {
    Object.entries(attributeValues).forEach(([key, value]) => {
      vars[key] = toNumber(value);
    });
  }
  return vars;
}
