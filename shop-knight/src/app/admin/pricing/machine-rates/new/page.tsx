"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingPageShell } from '@/components/admin-pricing';
import { PRICING_FORMULA_OPTIONS, PRICING_RATE_PER_OPTIONS, PRICING_RATE_UNIT_OPTIONS } from '@/lib/admin-pricing-options';

export default function NewMachineRatePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    cost: '0',
    price: '0',
    markup: '0',
    units: 'HR',
    setupCharge: '0',
    laborCharge: '0',
    otherCharge: '0',
    formula: 'NONE',
    productionRate: '0',
    rateUnit: 'UNIT',
    per: 'UNIT',
  });

  const toNumber = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (value: number) => value.toFixed(4);

  const onCostChange = (value: string) => {
    const cost = toNumber(value);
    const markup = toNumber(form.markup);
    setForm((s) => ({ ...s, cost: value, price: fmt(cost * markup) }));
  };

  const onMarkupChange = (value: string) => {
    const cost = toNumber(form.cost);
    const markup = toNumber(value);
    setForm((s) => ({ ...s, markup: value, price: fmt(cost * markup) }));
  };

  const onPriceChange = (value: string) => {
    const cost = toNumber(form.cost);
    const price = toNumber(value);
    const markup = cost > 0 ? price / cost : 0;
    setForm((s) => ({ ...s, price: value, markup: fmt(markup) }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);

    const res = await fetch('/api/admin/pricing/machine-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === 'string' ? data.error : 'Failed to create machine rate');
      setSaving(false);
      return;
    }

    router.push('/admin/pricing/machine-rates');
    router.refresh();
  }

  return (
    <PricingPageShell title="Create Machine Rate" description="Machine rate layout aligned with costs and calculations sections." backHref="/admin/pricing/machine-rates" backLabel="Back to Machine Rates">
      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{form.name || 'New Machine Rate'}</h2>
          <label className="mt-4 block text-sm font-medium text-slate-700">Name
            <input className="field mt-1" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Costs</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Cost $
              <input className="field mt-1" type="number" min="0" step="0.0001" value={form.cost} onChange={(e) => onCostChange(e.target.value)} required />
            </label>
            <label className="text-sm font-medium text-slate-700">Price $
              <input className="field mt-1" type="number" min="0" step="0.0001" value={form.price} onChange={(e) => onPriceChange(e.target.value)} required />
            </label>
            <label className="text-sm font-medium text-slate-700">Markup (X)
              <input className="field mt-1" type="number" min="0" step="0.0001" value={form.markup} onChange={(e) => onMarkupChange(e.target.value)} required />
            </label>
            <label className="text-sm font-medium text-slate-700">Units
              <select className="field mt-1" value={form.units} onChange={(e) => setForm((s) => ({ ...s, units: e.target.value }))}>
                {PRICING_RATE_PER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            {[
              ['setupCharge', 'Setup Charge'], ['laborCharge', 'Labor Charge'], ['otherCharge', 'Other Charge'],
            ].map(([key, label]) => (
              <label key={key} className="text-sm font-medium text-slate-700">{label}
                <input className="field mt-1" type="number" min="0" step="0.0001" value={form[key as keyof typeof form]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} required />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Calculations</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Formula
              <select className="field mt-1" value={form.formula} onChange={(e) => setForm((s) => ({ ...s, formula: e.target.value }))}>
                {PRICING_FORMULA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Production Rate
              <input className="field mt-1" type="number" min="0" step="0.0001" value={form.productionRate} onChange={(e) => setForm((s) => ({ ...s, productionRate: e.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-slate-700">Units
              <select className="field mt-1" value={form.rateUnit} onChange={(e) => setForm((s) => ({ ...s, rateUnit: e.target.value }))}>
                {PRICING_RATE_UNIT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Per
              <select className="field mt-1" value={form.per} onChange={(e) => setForm((s) => ({ ...s, per: e.target.value }))}>
                {PRICING_RATE_PER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
          </div>
        </section>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating…' : 'Create Machine Rate'}</button>
          <Link href="/admin/pricing/machine-rates" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </PricingPageShell>
  );
}
