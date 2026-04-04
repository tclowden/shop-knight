"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingPageShell } from '@/components/admin-pricing';
import { PRICING_FORMULA_OPTIONS, PRICING_RATE_PER_OPTIONS, PRICING_RATE_UNIT_OPTIONS } from '@/lib/admin-pricing-options';

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFieldValue(value: number) {
  return value.toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export default function NewLaborRatePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', cost: '0', price: '0', markup: '0', setupCharge: '0', machineCharge: '0', otherCharge: '0',
    formula: 'NONE', productionRate: '0', units: 'UNIT', per: 'UNIT',
  });

  function updateFromCostAndPrice(costRaw: string, priceRaw: string) {
    const cost = parseNumber(costRaw);
    const price = parseNumber(priceRaw);
    const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;
    return { markup: toFieldValue(markup) };
  }

  function updateFromCostAndMarkup(costRaw: string, markupRaw: string) {
    const cost = parseNumber(costRaw);
    const markup = parseNumber(markupRaw);
    const price = cost * (1 + markup / 100);
    return { price: toFieldValue(price) };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);

    const res = await fetch('/api/admin/pricing/labor-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === 'string' ? data.error : 'Failed to create labor rate');
      setSaving(false);
      return;
    }

    router.push('/admin/pricing/labor-rates');
    router.refresh();
  }

  return (
    <PricingPageShell title="Create Labor Rate" description="Create a labor rate record for admin pricing." backHref="/admin/pricing/labor-rates" backLabel="Back to Labor Rates">
      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Name
            <input className="field mt-1" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          </label>
          {[
            ['cost', 'Cost'], ['price', 'Price'], ['markup', 'Markup'], ['setupCharge', 'Setup Charge'], ['machineCharge', 'Machine Charge'],
            ['otherCharge', 'Other Charge'], ['productionRate', 'Production Rate'],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-medium text-slate-700">{label}
              <input
                className="field mt-1"
                type="number"
                min="0"
                step="0.0001"
                value={form[key as keyof typeof form]}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setForm((s) => {
                    if (key === 'cost') {
                      return {
                        ...s,
                        cost: nextValue,
                        ...updateFromCostAndPrice(nextValue, s.price),
                      };
                    }
                    if (key === 'price') {
                      return {
                        ...s,
                        price: nextValue,
                        ...updateFromCostAndPrice(s.cost, nextValue),
                      };
                    }
                    if (key === 'markup') {
                      return {
                        ...s,
                        markup: nextValue,
                        ...updateFromCostAndMarkup(s.cost, nextValue),
                      };
                    }
                    return { ...s, [key]: nextValue };
                  });
                }}
                required
              />
            </label>
          ))}
          <label className="text-sm font-medium text-slate-700">Formula
            <select className="field mt-1" value={form.formula} onChange={(e) => setForm((s) => ({ ...s, formula: e.target.value }))}>
              {PRICING_FORMULA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Units
            <select className="field mt-1" value={form.units} onChange={(e) => setForm((s) => ({ ...s, units: e.target.value }))}>
              {PRICING_RATE_UNIT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Per
            <select className="field mt-1" value={form.per} onChange={(e) => setForm((s) => ({ ...s, per: e.target.value }))}>
              {PRICING_RATE_PER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating…' : 'Create Labor Rate'}</button>
          <Link href="/admin/pricing/labor-rates" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </PricingPageShell>
  );
}
