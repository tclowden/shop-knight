"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Opportunity = { id: string; name: string; customer: string };

type LineItem = {
  name: string;
  description: string;
  quantity: string;
  priceInDollars: string;
  taxRate: string;
};

export default function NewQuotePage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [opportunityId, setOpportunityId] = useState('');
  const [txnNumber, setTxnNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [txnDate, setTxnDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { name: '', description: '', quantity: '1', priceInDollars: '0.00', taxRate: '0.075' },
  ]);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/opportunities');
    const data = await res.json();
    setOpportunities(data);
    if (data.length > 0) setOpportunityId(data[0].id);
  }

  function updateLine(index: number, key: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  }

  function addLine() {
    setLineItems((prev) => [...prev, { name: '', description: '', quantity: '1', priceInDollars: '0.00', taxRate: '0.075' }]);
  }

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setError('');

    const normalized = lineItems.map((l) => {
      const qty = Number(l.quantity || 0);
      const price = Number(l.priceInDollars || 0);
      const taxRate = Number(l.taxRate || 0);
      const totalPriceInDollars = qty * price;
      const totalTaxInDollars = totalPriceInDollars * taxRate;
      return {
        name: l.name,
        description: l.description || l.name,
        quantity: qty,
        priceInDollars: price,
        totalPriceInDollars,
        totalTaxInDollars,
        taxRate,
        taxable: true,
      };
    });

    const subtotal = normalized.reduce((sum, l) => sum + Number(l.totalPriceInDollars || 0), 0);
    const tax = normalized.reduce((sum, l) => sum + Number(l.totalTaxInDollars || 0), 0);

    const payload = {
      active: true,
      title,
      description,
      txnDate: txnDate || null,
      txnNumber,
      totalPriceInDollars: subtotal.toFixed(2),
      totalTaxInDollars: tax.toFixed(2),
      totalPriceWithTaxInDollars: (subtotal + tax).toFixed(2),
      workflowState: 'draft',
      expiryDate: expiryDate || null,
      customerPoNumber: customerPoNumber || null,
      opportunityId,
      lineItems: normalized,
    };

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create quote');
      return;
    }

    router.push('/sales/quotes');
    router.refresh();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">New Quote</h1>
      <p className="text-sm text-zinc-400">Quote fields now follow your current system structure.</p>
      <Nav />

      <form onSubmit={submitQuote} className="space-y-4 rounded border border-zinc-800 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Opportunity</span>
            <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>{o.name} — {o.customer}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Quote Number (txnNumber)</span>
            <input value={txnNumber} onChange={(e) => setTxnNumber(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" placeholder="1003" required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" placeholder="My quote" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Customer PO Number</span>
            <input value={customerPoNumber} onChange={(e) => setCustomerPoNumber(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" placeholder="12345" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Txn Date</span>
            <input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Expiry Date</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-300">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" rows={3} />
        </label>

        <div className="rounded border border-zinc-700 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-medium">Line Items</h2>
            <button type="button" onClick={addLine} className="rounded border border-zinc-600 px-2 py-1 text-xs">+ Add line</button>
          </div>
          <div className="space-y-2">
            {lineItems.map((line, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-5">
                <input value={line.name} onChange={(e) => updateLine(i, 'name', e.target.value)} placeholder="Line item name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
                <input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Description" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
                <input value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} type="number" min="1" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
                <input value={line.priceInDollars} onChange={(e) => updateLine(i, 'priceInDollars', e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
                <input value={line.taxRate} onChange={(e) => updateLine(i, 'taxRate', e.target.value)} type="number" min="0" step="0.0001" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button className="rounded bg-blue-600 px-4 py-2">Create Quote</button>
      </form>
    </main>
  );
}
