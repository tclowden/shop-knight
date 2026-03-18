"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Target = { id: string; label: string; sourceType: 'SALES_ORDER' | 'QUOTE' | 'JOB' };
type Entry = {
  id: string;
  sourceType: string;
  clockInAt: string;
  clockOutAt: string | null;
  minutesWorked: number | null;
  status: string;
  salesOrder?: { orderNumber: string; title?: string | null } | null;
  quote?: { quoteNumber: string; title?: string | null } | null;
  job?: { name: string } | null;
};

export default function TimePortalPage() {
  const [query, setQuery] = useState('');
  const [targets, setTargets] = useState<Target[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadTargets() {
    const res = await fetch(`/api/time/portal-targets?q=${encodeURIComponent(query)}`);
    const data = await res.json().catch(() => ({}));
    const normalized: Target[] = [
      ...(Array.isArray(data.salesOrders) ? data.salesOrders.map((x: any) => ({ id: x.id, label: `SO ${x.orderNumber}${x.title ? ` — ${x.title}` : ''}`, sourceType: 'SALES_ORDER' as const })) : []),
      ...(Array.isArray(data.quotes) ? data.quotes.map((x: any) => ({ id: x.id, label: `Quote ${x.quoteNumber}${x.title ? ` — ${x.title}` : ''}`, sourceType: 'QUOTE' as const })) : []),
      ...(Array.isArray(data.jobs) ? data.jobs.map((x: any) => ({ id: x.id, label: `Job ${x.name}`, sourceType: 'JOB' as const })) : []),
    ];
    setTargets(normalized);
  }

  async function loadEntries() {
    const res = await fetch('/api/time?scope=mine');
    const data = await res.json().catch(() => []);
    setEntries(Array.isArray(data) ? data : []);
  }

  async function clockIn(target: Target) {
    setBusy(true);
    await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock_in', sourceType: target.sourceType, sourceId: target.id }),
    });
    setBusy(false);
    await loadEntries();
  }

  async function clockOut() {
    setBusy(true);
    await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock_out' }),
    });
    setBusy(false);
    await loadEntries();
  }

  const openEntry = useMemo(() => entries.find((e) => !e.clockOutAt), [entries]);

  useEffect(() => { loadTargets(); }, [query]);
  useEffect(() => { loadEntries(); }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Time Portal</h1>
      <p className="mt-1 text-sm text-slate-500">Clock in to Sales Orders, Quotes, and Jobs.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search SO, Quote, Job..." className="field min-w-80" />
          <button type="button" onClick={clockOut} disabled={!openEntry || busy} className="inline-flex h-11 items-center rounded-lg border border-rose-300 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50">Clock Out</button>
        </div>
        {openEntry ? <p className="mt-2 text-sm text-amber-700">You are currently clocked in. Clock out before starting a new record.</p> : null}

        <div className="mt-3 space-y-2">
          {targets.map((target) => (
            <div key={`${target.sourceType}-${target.id}`} className="flex items-center justify-between rounded border border-slate-200 p-2">
              <p className="text-sm">{target.label}</p>
              <button type="button" onClick={() => clockIn(target)} disabled={Boolean(openEntry) || busy} className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Clock In to this record</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3">Record</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{entry.salesOrder?.orderNumber || entry.quote?.quoteNumber || entry.job?.name || entry.sourceType}</td>
                <td className="px-4 py-3">{new Date(entry.clockInAt).toLocaleString()}</td>
                <td className="px-4 py-3">{entry.clockOutAt ? new Date(entry.clockOutAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">{entry.minutesWorked ? (entry.minutesWorked / 60).toFixed(2) : '—'}</td>
                <td className="px-4 py-3">{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
