"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { StatusChip } from '@/components/status-chip';

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  source?: string | null;
  priority?: string | null;
  estimatedValue?: string | number | null;
  dueDate?: string | null;
  salesRepName?: string | null;
  projectManagerName?: string | null;
};

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');

  const stages = useMemo(() => ['ALL', ...Array.from(new Set(items.map((i) => i.stage))).sort()], [items]);

  const visibleItems = useMemo(() => {
    const text = q.trim().toLowerCase();
    return [...items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((opp) => {
        if (stageFilter !== 'ALL' && opp.stage !== stageFilter) return false;
        if (!text) return true;
        return [opp.name, opp.customer, opp.stage, opp.salesRepName || '', opp.projectManagerName || '']
          .join(' ')
          .toLowerCase()
          .includes(text);
      });
  }, [items, q, stageFilter]);

  async function load() {
    const res = await fetch('/api/opportunities');
    setItems(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Opportunities</h1>
      <p className="text-sm text-zinc-400">All opportunities in the system.</p>
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
            placeholder="Search opportunities..."
            className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
          />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            {stages.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Stages' : s}</option>)}
          </select>
        </div>
        <Link href="/sales/opportunities/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-center">
          + New Opportunity
        </Link>
      </div>

      <div className="space-y-3">
        {visibleItems.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded border border-zinc-800 p-4 hover:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{opp.name}</p>
              <StatusChip value={opp.stage} />
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {opp.customer}
              {opp.priority ? ` • Priority: ${opp.priority}` : ''}
              {opp.estimatedValue ? ` • $${opp.estimatedValue}` : ''}
              {opp.dueDate ? ` • Due ${new Date(opp.dueDate).toLocaleDateString()}` : ''}
              {opp.salesRepName ? ` • Sales Rep: ${opp.salesRepName}` : ''}
              {opp.projectManagerName ? ` • PM: ${opp.projectManagerName}` : ''}
            </p>
          </Link>
        ))}
        {visibleItems.length === 0 ? <p className="text-sm text-zinc-400">No opportunities found.</p> : null}
      </div>
    </main>
  );
}
