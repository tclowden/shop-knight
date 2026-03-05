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
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">Sales Order Statuses</h1>
      <p className="text-sm text-zinc-400">Manage available statuses for Sales Orders.</p>
      <Nav />

      <form onSubmit={createStatus} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Status name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <button className="rounded bg-blue-600 px-3 py-2 md:col-span-1">Create Status</button>
      </form>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Name</th><th className="p-3">Sort</th><th className="p-3">Active</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.sortOrder}</td>
                <td className="p-3">{s.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
