"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { buildPricingVars, computeUnitPrice } from '@/lib/pricing';

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

type ProductAttribute = { id: string; code: string; name: string; inputType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'; defaultValue: string | null; options: string[] | null };
type Product = { id: string; sku: string; name: string; category?: string | null; salePrice: string | number; pricingFormula?: string | null; attributes?: ProductAttribute[] };

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [orderNumber, setOrderNumber] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [sourceQuoteId, setSourceQuoteId] = useState('');
  const [lineProductId, setLineProductId] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [lineUnitPrice, setLineUnitPrice] = useState('0.00');
  const [lineAttributeValues, setLineAttributeValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load() {
    const [oppRes, quoteRes, productRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/quotes'),
      fetch('/api/admin/products'),
    ]);

    const oppItems = await oppRes.json();
    const quoteItems = await quoteRes.json();
    const productItems = await productRes.json();

    setOpportunities(oppItems);
    setQuotes(quoteItems);
    setProducts(productItems);
    if (oppItems.length > 0) setOpportunityId(oppItems[0].id);
  }

  function recalcLinePrice(productId: string, qty: string, attrs: Record<string, string>) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const basePrice = Number(p.salePrice || 0);
    const vars = buildPricingVars(Number(qty || 1), basePrice, attrs);
    setLineUnitPrice(String(computeUnitPrice(basePrice, p.pricingFormula, vars)));
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
        initialLine: lineDescription
          ? {
              productId: lineProductId || null,
              description: lineDescription,
              qty: Number(lineQty || 1),
              unitPrice: Number(lineUnitPrice || 0),
              attributeValues: lineAttributeValues,
            }
          : null,
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

        <div className="rounded border border-zinc-700 p-3">
          <h2 className="mb-2 font-medium">Initial Line Item (optional)</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <select
              value={lineProductId}
              onChange={(e) => {
                const productId = e.target.value;
                setLineProductId(productId);
                const p = products.find((x) => x.id === productId);
                if (p) {
                  setLineDescription(p.name);
                  const defaults = Object.fromEntries((p.attributes || []).map((a) => [a.code, a.defaultValue || '']));
                  setLineAttributeValues(defaults);
                  recalcLinePrice(productId, lineQty, defaults);
                }
              }}
              className="rounded border border-zinc-700 bg-white p-2 text-zinc-900"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}{p.category ? ` (${p.category})` : ''}</option>
              ))}
            </select>
            <input value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} placeholder="Description" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            <input value={lineQty} onChange={(e) => { const q = e.target.value; setLineQty(q); recalcLinePrice(lineProductId, q, lineAttributeValues); }} type="number" min="1" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            <input value={lineUnitPrice} onChange={(e) => setLineUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </div>
          {(() => {
            const selected = products.find((p) => p.id === lineProductId);
            if (!selected?.attributes?.length) return null;
            return (
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                {selected.attributes.map((attr) => (
                  <label key={attr.id} className="text-xs text-zinc-300">
                    {attr.name}
                    {attr.inputType === 'SELECT' ? (
                      <select
                        value={lineAttributeValues[attr.code] || ''}
                        onChange={(e) => {
                          const next = { ...lineAttributeValues, [attr.code]: e.target.value };
                          setLineAttributeValues(next);
                          recalcLinePrice(lineProductId, lineQty, next);
                        }}
                        className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                      >
                        <option value="">Select</option>
                        {(attr.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        value={lineAttributeValues[attr.code] || ''}
                        onChange={(e) => {
                          const next = { ...lineAttributeValues, [attr.code]: e.target.value };
                          setLineAttributeValues(next);
                          recalcLinePrice(lineProductId, lineQty, next);
                        }}
                        type={attr.inputType === 'NUMBER' ? 'number' : 'text'}
                        className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                      />
                    )}
                  </label>
                ))}
              </div>
            );
          })()}
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button className="rounded bg-blue-600 px-4 py-2">Create Sales Order</button>
      </form>
    </main>
  );
}
