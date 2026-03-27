type Vars = Record<string, number>;

export type PricingEffectType = 'NONE' | 'ADD' | 'MULTIPLY' | 'OVERRIDE' | 'FORMULA_VAR';

export type OptionPricingEffect = {
  label?: string;
  priceEffectType?: PricingEffectType;
  priceEffectValue?: number | string | null;
  formulaVarName?: string | null;
};

export type OptionPricingResult = {
  unitPrice: number;
  vars: Vars;
  applied: Array<{ type: PricingEffectType; value: number; formulaVarName?: string | null }>;
};

function parseBooleanString(value: string): number | null {
  const lowered = value.trim().toLowerCase();
  if (['true', 'yes', 'y', 'on'].includes(lowered)) return 1;
  if (['false', 'no', 'n', 'off'].includes(lowered)) return 0;
  return null;
}

function parseNumberFromOptionLabel(value: string): number | null {
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

export function applyOptionPricingEffects(basePrice: number, effects: OptionPricingEffect[] | null | undefined, baseVars?: Vars): OptionPricingResult {
  const vars: Vars = { ...(baseVars || {}) };
  const safeBase = toNumber(basePrice);
  const safeEffects = Array.isArray(effects) ? effects : [];

  let addTotal = 0;
  let multiplyTotal = 1;
  let overrideValue: number | null = null;
  const applied: OptionPricingResult['applied'] = [];

  for (const effect of safeEffects) {
    const type = effect.priceEffectType || 'NONE';
    const value = toNumber(effect.priceEffectValue);

    if (type === 'ADD') {
      addTotal += value;
      applied.push({ type, value });
    } else if (type === 'MULTIPLY') {
      multiplyTotal *= value || 1;
      applied.push({ type, value });
    } else if (type === 'OVERRIDE') {
      overrideValue = value;
      applied.push({ type, value });
    } else if (type === 'FORMULA_VAR') {
      const key = String(effect.formulaVarName || '').trim();
      if (key && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        vars[key] = value;
        applied.push({ type, value, formulaVarName: key });
      }
    }
  }

  let unitPrice = safeBase;
  if (overrideValue !== null) {
    unitPrice = overrideValue;
  } else {
    unitPrice = (safeBase + addTotal) * multiplyTotal;
  }

  return { unitPrice: Number(unitPrice.toFixed(2)), vars, applied };
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

export type PriceBreakdownItem = {
  label: string;
  amount: number;
};

export function computePriceBreakdown(basePrice: number, formula: string | null | undefined, vars: Vars): PriceBreakdownItem[] {
  const normalized = (formula || '').replace(/\s+/g, ' ').trim().toLowerCase();

  if (
    normalized === '((baseprice + substrate) * width * height) + machine' ||
    normalized === '(baseprice + substrate) * width * height + machine'
  ) {
    const width = toNumber(vars.width);
    const height = toNumber(vars.height);
    const machine = toNumber(vars.machine);
    const substrate = toNumber(vars.substrate);
    const area = width * height;

    return [
      { label: 'Base × Width × Height', amount: Number((toNumber(basePrice) * area).toFixed(2)) },
      { label: 'Substrate (per sq unit) × Area', amount: Number((substrate * area).toFixed(2)) },
      { label: 'Machine Add-on', amount: Number(machine.toFixed(2)) },
    ];
  }

  return [{ label: 'Calculated Unit Price', amount: computeUnitPrice(basePrice, formula, vars) }];
}
