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
    name: '', cost: '0', price: '0', markup: '0', units: '', setupCharge: '0', laborCharge: '0', otherCharge: '0',
    formula: 'NONE', productionRate: '0', rateUnit: 'UNIT', per: 'UNIT',
  });

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
    <PricingPageShell title="Create Machine Rate" description="Create a machine rate record for admin pricing." backHref="/admin/pricing/machine-rates" backLabel="Back to Machine Rates">
      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Name
            <input className="field mt-1" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          </label>
          <label className="text-sm font-medium text-slate-700">Units (Identifier)
            <input className="field mt-1" value={form.units} onChange={(e) => setForm((s) => ({ ...s, units: e.target.value }))} required />
          </label>
          {[
            ['cost', 'Cost'], ['price', 'Price'], ['markup', 'Markup'], ['setupCharge', 'Setup Charge'], ['laborCharge', 'Labor Charge'],
            ['otherCharge', 'Other Charge'], ['productionRate', 'Production Rate'],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-medium text-slate-700">{label}
              <input className="field mt-1" type="number" min="0" step="0.0001" value={form[key as keyof typeof form]} onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))} required />
            </label>
          ))}
          <label className="text-sm font-medium text-slate-700">Formula
            <select className="field mt-1" value={form.formula} onChange={(e) => setForm((s) => ({ ...s, formula: e.target.value }))}>
              {PRICING_FORMULA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
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

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating…' : 'Create Machine Rate'}</button>
          <Link href="/admin/pricing/machine-rates" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </PricingPageShell>
  );
}
