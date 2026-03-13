"use client";

import { useEffect, useState } from 'react';

type LoadListItem = { id: string; item: string; qty: number };
type LoadList = {
  id: string;
  name: string;
  createdAt: string;
  items: LoadListItem[];
  salesOrder: { orderNumber: string; title?: string | null; opportunity?: { name: string; customer: { name: string } } | null };
};

export default function LoadListPrintPage({ params }: { params: Promise<{ id: string; loadListId: string }> }) {
  const [orderId, setOrderId] = useState('');
  const [loadListId, setLoadListId] = useState('');
  const [data, setData] = useState<LoadList | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(async (p) => {
      setOrderId(p.id);
      setLoadListId(p.loadListId);
      const res = await fetch(`/api/sales-orders/${p.id}/load-list/${p.loadListId}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error || 'Failed to load load list');
        return;
      }
      setData(await res.json());
    });
  }, [params]);

  if (error) return <main className="p-6 text-rose-700">{error}</main>;
  if (!data) return <main className="p-6 text-slate-600">Loading load list…</main>;

  return (
    <main className="mx-auto max-w-4xl bg-white p-6 text-slate-900 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href={`/sales/orders/${orderId}`} className="rounded border border-slate-300 px-3 py-2 text-sm">Back to Sales Order</a>
        <button onClick={() => window.print()} className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Print / Save PDF</button>
      </div>

      <h1 className="text-2xl font-semibold">{data.name}</h1>
      <p className="text-sm text-slate-600">Sales Order #{data.salesOrder.orderNumber}</p>
      <p className="text-sm text-slate-600">Customer: {data.salesOrder.opportunity?.customer?.name || '—'}</p>
      <p className="text-sm text-slate-600">Created: {new Date(data.createdAt).toLocaleString()}</p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-300 px-3 py-2 text-left">Item</th>
            <th className="border border-slate-300 px-3 py-2 text-left">Qty</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.id}>
              <td className="border border-slate-300 px-3 py-2">{item.item}</td>
              <td className="border border-slate-300 px-3 py-2">{item.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.items.length === 0 ? <p className="mt-3 text-sm text-slate-500">No items.</p> : null}

      <section className="mt-8 space-y-4">
        <div>
          <p className="mb-1 text-sm font-semibold">Packed By (Name / Signature)</p>
          <div className="h-8 border-b border-slate-400" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-1 text-sm font-semibold">Date</p>
            <div className="h-8 border-b border-slate-400" />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Checked By</p>
            <div className="h-8 border-b border-slate-400" />
          </div>
        </div>
      </section>

      <p className="mt-6 text-xs text-slate-500">Load List ID: {loadListId}</p>
    </main>
  );
}
