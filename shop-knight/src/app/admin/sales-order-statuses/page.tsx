"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Status = { id: string; name: string; active: boolean; sortOrder: number };

export default function SalesOrderStatusesPage() {
  const [items, setItems] = useState<Status[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/admin/sales-order-statuses');
    if (!res.ok) return;
    setItems(await res.json());
  }

  async function createStatus(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/sales-order-statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create status');
      return;
    }

    setName('');
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Sales Order Statuses</h1>
      <p className="text-sm text-slate-500">Manage available statuses for Sales Orders.</p>
      <Nav />

      <form onSubmit={createStatus} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Status name" className="field" required />
        <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 md:col-span-1">Create Status</button>
      </form>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Sort</th><th className="px-4 py-3 font-semibold">Active</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{s.name}</td>
                <td className="px-4 py-4">{s.sortOrder}</td>
                <td className="px-4 py-4">{s.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
