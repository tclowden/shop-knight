"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/nav';
import { StatusChip } from '@/components/status-chip';

type SalesOrder = {
  id: string;
  orderNumber: string;
  title?: string | null;
  status?: string | null;
  opportunity: string;
  customer: string;
  sourceQuoteId: string | null;
  createdAt: string;
};

export default function SalesOrdersPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<SalesOrder[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.roles?.includes('ADMIN') || session?.user?.roles?.includes('SUPER_ADMIN');

  const statuses = useMemo(() => ['ALL', ...Array.from(new Set(items.map((i) => i.status || 'Unknown'))).sort()], [items]);

  const visibleItems = useMemo(() => {
    const text = q.trim().toLowerCase();
    return items.filter((row) => {
      const status = row.status || 'Unknown';
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      if (!text) return true;
      return [row.orderNumber, row.title || '', status, row.opportunity, row.customer]
        .join(' ')
        .toLowerCase()
        .includes(text);
    });
  }, [items, q, statusFilter]);


  async function handleArchive(salesOrderId: string) {
    if (!isAdmin || archivingId) return;
    const ok = window.confirm(showArchived ? 'Restore this sales order?' : 'Archive this sales order?');
    if (!ok) return;

    try {
      setArchivingId(salesOrderId);
      const res = await fetch(`/api/sales-orders/${salesOrderId}`, {
        method: showArchived ? 'POST' : 'DELETE',
        headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
        body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to ${showArchived ? 'restore' : 'archive'} sales order`);
      }
      setItems((prev) => prev.filter((item) => item.id !== salesOrderId));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${showArchived ? 'restore' : 'archive'} sales order`;
      window.alert(message);
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/sales-orders?archived=${showArchived ? 'only' : 'active'}`);
      setItems(await res.json());
    };
    run();
  }, [showArchived]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <div className="mb-3">
        <h1 className="text-3xl font-semibold tracking-tight">Sales Orders</h1>
        <p className="mt-1 text-sm text-slate-500">All sales orders in the system.</p>
      </div>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sales orders..."
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus:border-sky-400 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-slate-900 focus:border-sky-400 focus:outline-none"
            >
              {statuses.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
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
              <Link
                href="/sales/orders/new"
                className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                + Add New Sales Order
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Order #</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Opportunity</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Source Quote ID</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              {isAdmin ? <th className="px-4 py-3 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((so) => (
              <tr key={so.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">
                  <Link href={`/sales/orders/${so.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">
                    {so.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-4">{so.title || '—'}</td>
                <td className="px-4 py-4"><StatusChip value={so.status || 'Unknown'} /></td>
                <td className="px-4 py-4 text-slate-600">{so.opportunity}</td>
                <td className="px-4 py-4 text-slate-600">{so.customer}</td>
                <td className="px-4 py-4 text-slate-500">{so.sourceQuoteId || '—'}</td>
                <td className="px-4 py-4 text-slate-500">{new Date(so.createdAt).toLocaleDateString()}</td>
                {isAdmin ? (
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleArchive(so.id)}
                      disabled={archivingId === so.id}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {archivingId === so.id ? (showArchived ? 'Restoring…' : 'Archiving…') : (showArchived ? 'Restore' : 'Archive')}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={isAdmin ? 8 : 7}>No sales orders found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
