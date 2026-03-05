"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

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

      <div className="mb-4 flex justify-end">
        <Link href="/sales/orders/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium">
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
            {items.map((so) => (
              <tr key={so.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                <td className="p-3"><Link href={`/sales/orders/${so.id}`} className="text-blue-400">{so.orderNumber}</Link></td>
                <td className="p-3">{so.title || '—'}</td>
                <td className="p-3">{so.status || '—'}</td>
                <td className="p-3">{so.opportunity}</td>
                <td className="p-3">{so.customer}</td>
                <td className="p-3">{so.sourceQuoteId || '—'}</td>
                <td className="p-3">{new Date(so.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={7}>No sales orders yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
