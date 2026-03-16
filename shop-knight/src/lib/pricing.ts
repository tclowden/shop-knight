type Vars = Record<string, number>;

function parseBooleanString(value: string): number | null {
  const lowered = value.trim().toLowerCase();
  if (['true', 'yes', 'y', 'on'].includes(lowered)) return 1;
  if (['false', 'no', 'n', 'off'].includes(lowered)) return 0;
  return null;
}

function parseNumberFromOptionLabel(value: string): number | null {
  // Allows option values like: "Standard|0", "Rush|25", "Substrate|1.35|0.72", "Premium (+1.2)", "2.5"
  const parts = value.split('|').map((p) => p.trim());
  if (parts.length >= 2) {
    for (let i = 1; i < parts.length; i += 1) {
      const n = Number(parts[i]);
      if (Number.isFinite(n)) return n;
    }
  }

  const piped = value.split('|').pop()?.trim() || '';
  const pipedNumber = Number(piped);
  if (Number.isFinite(pipedNumber)) return pipedNumber;

  const parenMatch = value.match(/\(([-+]?\d+(?:\.\d+)?)\)\s*$/);
  if (parenMatch) {
    const parsed = Number(parenMatch[1]);
    if (Number.isFinite(parsed)) return parsed;
  }

  const n = Number(value);
  if (Number.isFinite(n)) return n;
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'boolean') return value ? 1 : 0;

  if (typeof value === 'string') {
    const boolNumber = parseBooleanString(value);
    if (boolNumber !== null) return boolNumber;

    const optionNumber = parseNumberFromOptionLabel(value);
    if (optionNumber !== null) return optionNumber;

    return 0;
  }

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
