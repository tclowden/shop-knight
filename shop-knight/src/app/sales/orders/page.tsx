"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  const [items, setItems] = useState<SalesOrder[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  async function load() {
    const res = await fetch('/api/sales-orders');
    setItems(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Sales Orders</h1>
      <p className="text-sm text-zinc-400">All sales orders in the system.</p>
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
            placeholder="Search sales orders..."
            className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            {statuses.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
        </div>
        <Link href="/sales/orders/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-center">
          + New Sales Order
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Title</th>
              <th className="p-3">Status</th>
              <th className="p-3">Opportunity</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Source Quote ID</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((so) => (
              <tr key={so.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="p-3"><Link href={`/sales/orders/${so.id}`} className="text-blue-400">{so.orderNumber}</Link></td>
                <td className="p-3">{so.title || '—'}</td>
                <td className="p-3"><StatusChip value={so.status || 'Unknown'} /></td>
                <td className="p-3">{so.opportunity}</td>
                <td className="p-3">{so.customer}</td>
                <td className="p-3">{so.sourceQuoteId || '—'}</td>
                <td className="p-3">{new Date(so.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {visibleItems.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={7}>No sales orders found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
