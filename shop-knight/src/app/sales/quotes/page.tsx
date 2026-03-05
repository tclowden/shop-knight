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
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Quotes</h1>
      <p className="text-sm text-zinc-400">All quotes in the system.</p>
      <Nav />

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <div className="rounded border border-zinc-800 p-3"><p className="text-xs text-zinc-400">Total</p><p className="text-xl font-semibold">{items.length}</p></div>
        <div className="rounded border border-zinc-800 p-3 md:col-span-3"><p className="text-xs text-zinc-400">Visible</p><p className="text-xl font-semibold">{visibleItems.length}</p></div>
      </div>

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 md:max-w-2xl md:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search quotes..."
            className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
          />
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            {states.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All States' : s}</option>)}
          </select>
        </div>
        <Link href="/sales/quotes/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-center">
          + New Quote
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3">Quote #</th>
              <th className="p-3">Title</th>
              <th className="p-3">State</th>
              <th className="p-3">Opportunity</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((qRow) => (
              <tr key={qRow.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="p-3"><Link href={`/sales/quotes/${qRow.id}`} className="text-blue-400">{qRow.quoteNumber}</Link></td>
                <td className="p-3">{qRow.title || '—'}</td>
                <td className="p-3"><StatusChip value={qRow.workflowState || qRow.status} /></td>
                <td className="p-3">{qRow.opportunity}</td>
                <td className="p-3">{qRow.customer}</td>
                <td className="p-3">{qRow.totalPriceWithTaxInDollars ?? '—'}</td>
                <td className="p-3">{new Date(qRow.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={7}>No quotes found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
