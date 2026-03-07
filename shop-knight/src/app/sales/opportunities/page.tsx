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
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Sales Opportunities</h1>
      <p className="text-sm text-slate-500">All opportunities in the system.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:max-w-2xl md:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search opportunities..."
              className="field"
            />
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="field min-w-48">
              {stages.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Stages' : s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Showing <span className="font-semibold text-slate-700">{visibleItems.length}</span> of {items.length}</div>
            <Link href="/sales/opportunities/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
              + New Opportunity
            </Link>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {visibleItems.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-800">{opp.name}</p>
              <StatusChip value={opp.stage} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {opp.customer}
              {opp.priority ? ` • Priority: ${opp.priority}` : ''}
              {opp.estimatedValue ? ` • $${opp.estimatedValue}` : ''}
              {opp.dueDate ? ` • Due ${new Date(opp.dueDate).toLocaleDateString()}` : ''}
              {opp.salesRepName ? ` • Sales Rep: ${opp.salesRepName}` : ''}
              {opp.projectManagerName ? ` • PM: ${opp.projectManagerName}` : ''}
            </p>
          </Link>
        ))}
        {visibleItems.length === 0 ? <p className="text-sm text-slate-500">No opportunities found.</p> : null}
      </div>
    </main>
  );
}
