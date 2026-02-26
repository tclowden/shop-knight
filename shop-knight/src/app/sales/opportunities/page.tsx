"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  stage: string;
};

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');

  async function load() {
    const res = await fetch('/api/opportunities');
    setItems(await res.json());
  }

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, customer }),
    });
    setName('');
    setCustomer('');
    load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Sales Opportunities</h1>
      <p className="text-sm text-zinc-400">Top-level sales hierarchy container.</p>
      <Nav />

      <form onSubmit={createOpportunity} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opportunity name" className="rounded border border-zinc-700 bg-zinc-900 p-2" required />
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer" className="rounded border border-zinc-700 bg-zinc-900 p-2" required />
        <button className="rounded bg-blue-600 px-3 py-2">Create Opportunity</button>
      </form>

      <div className="space-y-3">
        {items.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded border border-zinc-800 p-4 hover:bg-zinc-900">
            <p className="font-medium">{opp.name}</p>
            <p className="text-sm text-zinc-400">{opp.customer} • {opp.stage}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
