"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { StatusChip } from '@/components/status-chip';

type Quote = {
  id: string;
  quoteNumber: string;
  title: string | null;
  status: string;
  workflowState: string | null;
  opportunity: string;
  customer: string;
  totalPriceWithTaxInDollars: string | number | null;
  createdAt: string;
};

export default function QuotesPage() {
  const [items, setItems] = useState<Quote[]>([]);
  const [q, setQ] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');

  const states = useMemo(
    () => ['ALL', ...Array.from(new Set(items.map((i) => i.workflowState || i.status))).sort()],
    [items]
  );

  const visibleItems = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter((row) => {
      const state = row.workflowState || row.status;
      if (stateFilter !== 'ALL' && state !== stateFilter) return false;
      if (!text) return true;
      return [row.quoteNumber, row.title || '', row.opportunity, row.customer, state]
        .join(' ')
        .toLowerCase()
        .includes(text);
    });
  }, [items, q, stateFilter]);

  async function load() {
    const res = await fetch('/api/quotes');
    setItems(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Quotes</h1>
      <p className="text-sm text-slate-500">All quotes in the system.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:max-w-2xl md:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search quotes..."
              className="field"
            />
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="field min-w-48">
              {states.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All States' : s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{visibleItems.length}</span> of {items.length}</div>
            <Link href="/sales/quotes/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
              + New Quote
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Quote #</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">State</th>
              <th className="px-4 py-3 font-semibold">Opportunity</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((qRow) => (
              <tr key={qRow.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/sales/quotes/${qRow.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">{qRow.quoteNumber}</Link></td>
                <td className="px-4 py-4">{qRow.title || '—'}</td>
                <td className="px-4 py-4"><StatusChip value={qRow.workflowState || qRow.status} /></td>
                <td className="px-4 py-4">{qRow.opportunity}</td>
                <td className="px-4 py-4">{qRow.customer}</td>
                <td className="px-4 py-4">{qRow.totalPriceWithTaxInDollars ?? '—'}</td>
                <td className="px-4 py-4 text-slate-500">{new Date(qRow.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No quotes found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
