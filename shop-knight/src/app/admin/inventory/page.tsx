"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Item = {
  id: string;
  itemNumber: string;
  name: string;
  category: string | null;
  location: string | null;
  totalQty: number;
  active: boolean;
};

export default function InventoryAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/admin/inventory-items?archived=${showArchived ? 'only' : 'active'}`);
      if (!res.ok) return;
      setItems(await res.json());
    };
    run();
  }, [showArchived]);

  async function toggleArchive(id: string) {
    const res = await fetch(`/api/admin/inventory-items/${id}`, {
      method: showArchived ? 'POST' : 'DELETE',
      headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
      body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
    });
    if (res.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Inventory Admin</h1>
          <p className="text-sm text-slate-500">Manage inventory items and on-hand quantities.</p>
        </div>
        {!showArchived ? (
          <Link href="/admin/inventory/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
            Create Inventory Item
          </Link>
        ) : null}
      </div>

      <Nav />

      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setShowArchived((p) => !p)} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Item #</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">On Hand Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{i.itemNumber}</td>
                <td className="px-4 py-4">{i.name}</td>
                <td className="px-4 py-4">{i.category || '—'}</td>
                <td className="px-4 py-4">{i.location || '—'}</td>
                <td className="px-4 py-4">{i.totalQty}</td>
                <td className="px-4 py-4 text-right">
                  <button type="button" onClick={() => toggleArchive(i.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                    {showArchived ? 'Restore' : 'Archive'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No inventory items yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
