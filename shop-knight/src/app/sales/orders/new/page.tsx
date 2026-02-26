"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Opportunity = {
  id: string;
  name: string;
  customer: string;
};

type Quote = {
  id: string;
  quoteNumber: string;
  opportunity: string;
  customer: string;
};

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const [orderNumber, setOrderNumber] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [sourceQuoteId, setSourceQuoteId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [oppRes, quoteRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/quotes'),
    ]);

    const oppItems = await oppRes.json();
    const quoteItems = await quoteRes.json();

    setOpportunities(oppItems);
    setQuotes(quoteItems);
    if (oppItems.length > 0) setOpportunityId(oppItems[0].id);
  }

  async function createOrder(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/sales-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber,
        opportunityId,
        sourceQuoteId: sourceQuoteId || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create sales order');
      return;
    }

    router.push('/sales/orders');
    router.refresh();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">New Sales Order</h1>
      <p className="text-sm text-zinc-400">Create a sales order and attach it to an opportunity.</p>
      <Nav />

      <form onSubmit={createOrder} className="space-y-3 rounded border border-zinc-800 p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-300">Order Number</span>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="SO-1001"
            className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-300">Opportunity</span>
          <select
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
            required
          >
            {opportunities.map((opp) => (
              <option key={opp.id} value={opp.id}>
                {opp.name} — {opp.customer}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-300">Source Quote (optional)</span>
          <select
            value={sourceQuoteId}
            onChange={(e) => setSourceQuoteId(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
          >
            <option value="">None</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quoteNumber} — {q.opportunity} ({q.customer})
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button className="rounded bg-blue-600 px-4 py-2">Create Sales Order</button>
      </form>
    </main>
  );
}
