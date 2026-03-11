"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
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
  const { data: session } = useSession();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.roles?.includes('ADMIN') || session?.user?.roles?.includes('SUPER_ADMIN');

  const stages = useMemo(() => ['ALL', ...Array.from(new Set(items.map((i) => i.stage))).sort()], [items]);

  const visibleItems = useMemo(() => {
    const text = q.trim().toLowerCase();
    return [...items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((opp) => {
        if (stageFilter !== 'ALL' && opp.stage !== stageFilter) return false;
        if (!text) return true;
        return [opp.name, opp.customer, opp.stage, opp.salesRepName || '', opp.projectManagerName || '', opp.priority || '']
          .join(' ')
          .toLowerCase()
          .includes(text);
      });
  }, [items, q, stageFilter]);

  async function load() {
    const res = await fetch('/api/opportunities');
    setItems(await res.json());
  }

  async function handleArchive(opportunityId: string) {
    if (!isAdmin || archivingId) return;
    const ok = window.confirm('Archive this opportunity?');
    if (!ok) return;

    try {
      setArchivingId(opportunityId);
      const res = await fetch(`/api/opportunities/${opportunityId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to archive opportunity');
      }
      setItems((prev) => prev.filter((item) => item.id !== opportunityId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive opportunity';
      window.alert(message);
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Opportunity</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Value</th>
              <th className="px-4 py-3 font-semibold">Due</th>
              <th className="px-4 py-3 font-semibold">Sales Rep</th>
              <th className="px-4 py-3 font-semibold">PM</th>
              {isAdmin ? <th className="px-4 py-3 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((opp) => (
              <tr key={opp.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">
                  <Link href={`/sales/opportunities/${opp.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">
                    {opp.name}
                  </Link>
                </td>
                <td className="px-4 py-4">{opp.customer}</td>
                <td className="px-4 py-4"><StatusChip value={opp.stage} /></td>
                <td className="px-4 py-4">{opp.priority || '—'}</td>
                <td className="px-4 py-4">{opp.estimatedValue ? `$${opp.estimatedValue}` : '—'}</td>
                <td className="px-4 py-4 text-slate-500">{opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-4">{opp.salesRepName || '—'}</td>
                <td className="px-4 py-4">{opp.projectManagerName || '—'}</td>
                {isAdmin ? (
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleArchive(opp.id)}
                      disabled={archivingId === opp.id}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {archivingId === opp.id ? 'Archiving…' : 'Archive'}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={isAdmin ? 9 : 8}>No opportunities found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
