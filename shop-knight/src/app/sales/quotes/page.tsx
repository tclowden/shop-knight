"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Quote = {
  id: string;
  quoteNumber: string;
  title: string | null;
  status: string;
  workflowState: string | null;
  opportunity: string;
  customer: string;
  totalPriceWithTaxInDollars: string | number | null;
  createdAt: string;
};

export default function QuotesPage() {
  const [items, setItems] = useState<Quote[]>([]);

  async function load() {
    const res = await fetch('/api/quotes');
    setItems(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Quotes</h1>
      <p className="text-sm text-zinc-400">All quotes in the system.</p>
      <Nav />

      <div className="mb-4 flex justify-end">
        <Link href="/sales/quotes/new" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium">
          + New Quote
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3">Quote #</th>
              <th className="p-3">Title</th>
              <th className="p-3">State</th>
              <th className="p-3">Opportunity</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => (
              <tr key={q.id} className="border-t border-zinc-800">
                <td className="p-3">{q.quoteNumber}</td>
                <td className="p-3">{q.title || '—'}</td>
                <td className="p-3">{q.workflowState || q.status}</td>
                <td className="p-3">{q.opportunity}</td>
                <td className="p-3">{q.customer}</td>
                <td className="p-3">{q.totalPriceWithTaxInDollars ?? '—'}</td>
                <td className="p-3">{new Date(q.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={7}>No quotes yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
