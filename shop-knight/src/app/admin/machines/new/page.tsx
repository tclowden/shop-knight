"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

export default function NewMachinePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [costPerMinute, setCostPerMinute] = useState('0.0000');
  const [setupMinutes, setSetupMinutes] = useState('');
  const [hourlyCapacity, setHourlyCapacity] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createMachine(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');

    try {
      setSaving(true);
      const res = await fetch('/api/admin/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, costPerMinute, setupMinutes, hourlyCapacity, notes }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Failed to create machine');
        return;
      }

      router.push('/admin/machines');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Machine</h1>
          <p className="text-sm text-slate-500">Set up a machine with baseline costing details for production planning.</p>
        </div>
        <Link href="/admin/machines" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to Machines
        </Link>
      </div>

      <Nav />

      <form onSubmit={createMachine} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Machine Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., HP Latex 800W" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Machine Cost Per Minute
            <input value={costPerMinute} onChange={(e) => setCostPerMinute(e.target.value)} type="number" min="0" step="0.0001" placeholder="0.0000" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Setup Minutes (optional)
            <input value={setupMinutes} onChange={(e) => setSetupMinutes(e.target.value)} type="number" min="0" step="1" placeholder="e.g., 15" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Hourly Capacity (optional)
            <input value={hourlyCapacity} onChange={(e) => setHourlyCapacity(e.target.value)} type="number" min="0" step="1" placeholder="units per hour" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Notes (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Material limits, operator notes, color profile notes, etc." className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Creating…' : 'Create Machine'}
          </button>
          <Link href="/admin/machines" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
