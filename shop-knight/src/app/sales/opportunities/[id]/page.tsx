"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Quote = { id: string; quoteNumber: string; status: string };

type SalesOrder = { id: string; orderNumber: string; sourceQuoteId: string };

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

  async function load(opportunityId: string) {
    const qRes = await fetch(`/api/opportunities/${opportunityId}/quotes`);
    setQuotes(await qRes.json());

    const soRes = await fetch('/api/sales-orders');
    const allSos = await soRes.json();
    setSalesOrders(allSos.filter((s: SalesOrder & { opportunityId: string }) => s.opportunityId === opportunityId));
  }

  async function addQuote() {
    await fetch(`/api/opportunities/${id}/quotes`, { method: 'POST' });
    load(id);
  }

  async function convertQuote(quoteId: string) {
    await fetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
    load(id);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Opportunity {id}</h1>
      <p className="text-sm text-zinc-400">Functional shell: create quotes and convert to sales orders.</p>
      <Nav />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded border border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Quotes</h2>
            <button onClick={addQuote} className="rounded bg-blue-600 px-3 py-1 text-sm">+ New Quote</button>
          </div>
          <div className="space-y-2">
            {quotes.map((q) => (
              <div key={q.id} className="rounded border border-zinc-700 p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{q.quoteNumber} • {q.status}</span>
                  <button onClick={() => convertQuote(q.id)} className="rounded border border-zinc-600 px-2 py-1 text-xs">Convert → SO</button>
                </div>
              </div>
            ))}
            {quotes.length === 0 && <p className="text-sm text-zinc-400">No quotes yet.</p>}
          </div>
        </article>

        <article className="rounded border border-zinc-800 p-4">
          <h2 className="mb-3 font-medium">Sales Orders</h2>
          <div className="space-y-2">
            {salesOrders.map((so) => (
              <div key={so.id} className="rounded border border-zinc-700 p-2 text-sm">
                {so.orderNumber} (from {so.sourceQuoteId})
              </div>
            ))}
            {salesOrders.length === 0 && <p className="text-sm text-zinc-400">No sales orders yet.</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
