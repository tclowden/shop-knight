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
  const [showArchived, setShowArchived] = useState(false);
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

  async function handleArchive(opportunityId: string) {
    if (!isAdmin || archivingId) return;
    const ok = window.confirm(showArchived ? 'Restore this opportunity?' : 'Archive this opportunity?');
    if (!ok) return;

    try {
      setArchivingId(opportunityId);
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: showArchived ? 'POST' : 'DELETE',
        headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
        body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to ${showArchived ? 'restore' : 'archive'} opportunity`);
      }
      setItems((prev) => prev.filter((item) => item.id !== opportunityId));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${showArchived ? 'restore' : 'archive'} opportunity`;
      window.alert(message);
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/opportunities?archived=${showArchived ? 'only' : 'active'}`);
      const payload = await res.json().catch(() => null);
      setItems(Array.isArray(payload) ? payload : []);
    };
    run();
  }, [showArchived]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <div className="mb-3">
        <h1 className="text-3xl font-semibold tracking-tight">Sales Opportunities</h1>
        <p className="mt-1 text-sm text-slate-500">All opportunities in the system.</p>
      </div>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search opportunities..."
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus:border-sky-400 focus:outline-none"
            />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-11 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus:border-sky-400 focus:outline-none"
            >
              {stages.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Stages' : s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {showArchived ? 'Show Active' : 'Show Archived'}
            </button>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{visibleItems.length}</span> of {items.length}
            </div>
            {!showArchived ? (
              <Link href="/sales/opportunities/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
                + New Opportunity
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="md:hidden">
          {visibleItems.length === 0 ? <p className="px-4 py-8 text-center text-slate-500">No opportunities found.</p> : null}
          <div className="divide-y divide-slate-100">
            {visibleItems.map((opp) => (
              <article key={opp.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/sales/opportunities/${opp.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    {opp.name}
                  </Link>
                  <StatusChip value={opp.stage} />
                </div>
                <p className="text-sm font-semibold text-slate-800">{opp.customer}</p>
                <p className="text-xs text-slate-600">Priority: {opp.priority || '—'}</p>
                <p className="text-xs text-slate-500">Value: {opp.estimatedValue ? `$${opp.estimatedValue}` : '—'}</p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-500">{opp.dueDate ? new Date(opp.dueDate).toLocaleDateString() : 'No due date'}</p>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleArchive(opp.id)}
                      disabled={archivingId === opp.id}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
                    >
                      {archivingId === opp.id ? (showArchived ? 'Restoring…' : 'Archiving…') : (showArchived ? 'Restore' : 'Archive')}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <table className="hidden w-full text-left text-sm md:table">
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
                <td className="px-4 py-4 text-slate-600">{opp.customer}</td>
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
                      {archivingId === opp.id ? (showArchived ? 'Restoring…' : 'Archiving…') : (showArchived ? 'Restore' : 'Archive')}
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
