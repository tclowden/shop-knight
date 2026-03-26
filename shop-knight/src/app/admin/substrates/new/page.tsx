"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

export default function NewSubstratePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [addOnPrice, setAddOnPrice] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createSubstrate(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');

    try {
      setSaving(true);
      const res = await fetch('/api/admin/substrates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, addOnPrice, notes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Failed to create substrate');
        return;
      }

      router.push('/admin/substrates');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Substrate</h1>
          <p className="text-sm text-slate-500">Add a substrate option with an add-on price used by product pricing.</p>
        </div>
        <Link href="/admin/substrates" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to Substrates
        </Link>
      </div>

      <Nav />

      <form onSubmit={createSubstrate} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Substrate Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Blockout Fabric" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Add-on Price
            <input value={addOnPrice} onChange={(e) => setAddOnPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Notes (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Material notes, supplier details, finishing notes, etc." className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Substrate'}
          </button>
          <Link href="/admin/substrates" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
