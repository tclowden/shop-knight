"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

export default function NewExpenseReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createReport(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');

    try {
      setSaving(true);
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, employeeName, periodStart, periodEnd, notes }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Failed to create expense report');
        return;
      }

      router.push(`/expenses/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Expense Report</h1>
          <p className="text-sm text-slate-500">Start a draft report, then add expense lines and submit for approval.</p>
        </div>
        <Link href="/expenses" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Expenses</Link>
      </div>

      <Nav />

      <form onSubmit={createReport} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Report Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="field mt-1" placeholder="March client travel + meals" required />
          </label>
          <label className="text-sm font-medium text-slate-700">Employee Name
            <input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="field mt-1" placeholder="Employee name" required />
          </label>
          <label className="text-sm font-medium text-slate-700">Period Start
            <input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} type="date" className="field mt-1" />
          </label>
          <label className="text-sm font-medium text-slate-700">Period End
            <input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} type="date" className="field mt-1" />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" placeholder="Any context for approvers" />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating…' : 'Create Report'}</button>
          <Link href="/expenses" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
