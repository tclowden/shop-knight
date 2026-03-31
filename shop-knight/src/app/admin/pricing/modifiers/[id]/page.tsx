"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PricingPageShell } from '@/components/admin-pricing';
import { MODIFIER_TYPE_OPTIONS, MODIFIER_UNIT_OPTIONS } from '@/lib/admin-pricing-options';

const initialForm = {
  name: '', systemLookupName: '', type: 'NUMERIC', units: 'UNIT', showInternally: true, showCustomer: false, defaultValue: '',
};

export default function EditModifierPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    params.then(async ({ id: modifierId }) => {
      setId(modifierId);
      const res = await fetch(`/api/admin/pricing/modifiers/${modifierId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Failed to load modifier');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setForm({
        name: String(data?.name || ''),
        systemLookupName: String(data?.systemLookupName || ''),
        type: String(data?.type || 'NUMERIC'),
        units: String(data?.units || 'UNIT'),
        showInternally: Boolean(data?.showInternally),
        showCustomer: Boolean(data?.showCustomer),
        defaultValue: String(data?.defaultValue || ''),
      });
      setLoading(false);
    });
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !id) return;
    setError('');
    setSaving(true);

    const res = await fetch(`/api/admin/pricing/modifiers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === 'string' ? data.error : 'Failed to update modifier');
      setSaving(false);
      return;
    }

    router.push('/admin/pricing/modifiers');
    router.refresh();
  }

  return (
    <PricingPageShell title="Edit Modifier" description="Update this modifier record." backHref="/admin/pricing/modifiers" backLabel="Back to Modifiers">
      <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? <p className="text-sm text-slate-500">Loading modifier…</p> : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Name
                <input className="field mt-1" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
              </label>
              <label className="text-sm font-medium text-slate-700">System Lookup Name
                <input className="field mt-1" value={form.systemLookupName} onChange={(e) => setForm((s) => ({ ...s, systemLookupName: e.target.value }))} required />
              </label>
              <label className="text-sm font-medium text-slate-700">Type
                <select className="field mt-1" value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}>
                  {MODIFIER_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Units
                <select className="field mt-1" value={form.units} onChange={(e) => setForm((s) => ({ ...s, units: e.target.value }))}>
                  {MODIFIER_UNIT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Default Value
                <input className="field mt-1" value={form.defaultValue} onChange={(e) => setForm((s) => ({ ...s, defaultValue: e.target.value }))} required />
              </label>
              <div className="grid grid-cols-1 gap-2 content-start">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-6">
                  <input type="checkbox" checked={form.showInternally} onChange={(e) => setForm((s) => ({ ...s, showInternally: e.target.checked }))} />
                  Show Internally
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={form.showCustomer} onChange={(e) => setForm((s) => ({ ...s, showCustomer: e.target.checked }))} />
                  Show Customer
                </label>
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

            <div className="mt-4 flex items-center gap-2">
              <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : 'Save Modifier'}</button>
              <Link href="/admin/pricing/modifiers" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
            </div>
          </>
        )}
      </form>
    </PricingPageShell>
  );
}
