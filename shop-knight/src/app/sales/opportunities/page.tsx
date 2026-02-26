"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  source?: string | null;
  priority?: string | null;
  estimatedValue?: string | number | null;
};

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [source, setSource] = useState('Referral');
  const [priority, setPriority] = useState('Medium');
  const [estimatedValue, setEstimatedValue] = useState('0');
  const [probability, setProbability] = useState('0.50');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');

  async function load() {
    const res = await fetch('/api/opportunities');
    setItems(await res.json());
  }

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        customer,
        source,
        priority,
        estimatedValue,
        probability,
        expectedCloseDate: expectedCloseDate || null,
      }),
    });
    setName('');
    setCustomer('');
    setEstimatedValue('0');
    setProbability('0.50');
    setExpectedCloseDate('');
    load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Opportunities</h1>
      <p className="text-sm text-zinc-400">Top-level sales hierarchy container with key opportunity fields.</p>
      <Nav />

      <form onSubmit={createOpportunity} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opportunity name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
        <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option>Referral</option>
          <option>Website</option>
          <option>Repeat Customer</option>
          <option>Outbound</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <input value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} type="number" min="0" step="0.01" placeholder="Estimated value" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={probability} onChange={(e) => setProbability(e.target.value)} type="number" min="0" max="1" step="0.01" placeholder="Close probability (0-1)" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} type="date" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <button className="rounded bg-blue-600 px-3 py-2">Create Opportunity</button>
      </form>

      <div className="space-y-3">
        {items.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded border border-zinc-800 p-4 hover:bg-zinc-900">
            <p className="font-medium">{opp.name}</p>
            <p className="text-sm text-zinc-400">
              {opp.customer} • {opp.stage}
              {opp.priority ? ` • ${opp.priority}` : ''}
              {opp.estimatedValue ? ` • $${opp.estimatedValue}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
