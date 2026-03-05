"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

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
  const [items, setItems] = useState<Opportunity[]>([]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  async function load() {
    const res = await fetch('/api/opportunities');
    setItems(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Opportunities</h1>
      <p className="text-sm text-zinc-400">All opportunities in the system.</p>
      <Nav />

      <div className="mb-4 flex justify-end">
        <Link href="/sales/opportunities/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium">
          + New Opportunity
        </Link>
      </div>

      <div className="space-y-3">
        {sortedItems.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded border border-zinc-800 p-4 hover:bg-zinc-900">
            <p className="font-medium">{opp.name}</p>
            <p className="text-sm text-zinc-400">
              {opp.customer} • {opp.stage}
              {opp.priority ? ` • ${opp.priority}` : ''}
              {opp.estimatedValue ? ` • $${opp.estimatedValue}` : ''}
              {opp.dueDate ? ` • Due ${new Date(opp.dueDate).toLocaleDateString()}` : ''}
              {opp.salesRepName ? ` • Sales Rep: ${opp.salesRepName}` : ''}
              {opp.projectManagerName ? ` • PM: ${opp.projectManagerName}` : ''}
            </p>
          </Link>
        ))}
        {sortedItems.length === 0 ? <p className="text-sm text-zinc-400">No opportunities yet.</p> : null}
      </div>
    </main>
  );
}
