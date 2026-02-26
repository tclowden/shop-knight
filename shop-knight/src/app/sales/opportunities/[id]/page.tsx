"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Quote = { id: string; quoteNumber: string; status: string };
type SalesOrder = { id: string; orderNumber: string; sourceQuoteId: string };
type SalesOrderLine = { id: string; description: string; qty: number; unitPrice: number; productId?: string | null };
type Product = { id: string; sku: string; name: string; salePrice: string | number };
type PoLine = {
  id: string;
  description: string;
  qty: number;
  unitCost: number;
  vendor: { name: string };
  purchaseOrder: { poNumber: string };
};

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [lines, setLines] = useState<SalesOrderLine[]>([]);
  const [poLines, setPoLines] = useState<PoLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [lineDescription, setLineDescription] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('100');
  const [lineProductId, setLineProductId] = useState('');

  const [vendorName, setVendorName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDescription, setPoDescription] = useState('');
  const [poQty, setPoQty] = useState('1');
  const [poCost, setPoCost] = useState('50');

  const primarySo = useMemo(() => salesOrders[0], [salesOrders]);
  const primaryLine = useMemo(() => lines[0], [lines]);

  async function load(opportunityId: string) {
    const productsRes = await fetch('/api/admin/products');
    setProducts(await productsRes.json());

    const qRes = await fetch(`/api/opportunities/${opportunityId}/quotes`);
    setQuotes(await qRes.json());

    const soRes = await fetch(`/api/sales-orders?opportunityId=${opportunityId}`);
    const soData = await soRes.json();
    setSalesOrders(soData);

    if (soData[0]?.id) {
      const lineRes = await fetch(`/api/sales-orders/${soData[0].id}/lines`);
      const lineData = await lineRes.json();
      setLines(lineData);

      if (lineData[0]?.id) {
        const poRes = await fetch(`/api/sales-order-lines/${lineData[0].id}/po-lines`);
        setPoLines(await poRes.json());
      } else {
        setPoLines([]);
      }
    } else {
      setLines([]);
      setPoLines([]);
    }
  }

  async function addQuote() {
    await fetch(`/api/opportunities/${id}/quotes`, { method: 'POST' });
    load(id);
  }

  async function convertQuote(quoteId: string) {
    await fetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
    load(id);
  }

  async function addSoLine(e: React.FormEvent) {
    e.preventDefault();
    if (!primarySo) return;

    await fetch(`/api/sales-orders/${primarySo.id}/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: lineDescription,
        qty: Number(lineQty),
        unitPrice: Number(linePrice),
        productId: lineProductId || null,
      }),
    });

    setLineDescription('');
    setLineQty('1');
    setLinePrice('100');
    setLineProductId('');
    load(id);
  }

  async function attachPoLine(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryLine) return;

    await fetch(`/api/sales-order-lines/${primaryLine.id}/po-lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorName,
        poNumber,
        description: poDescription,
        qty: Number(poQty),
        unitCost: Number(poCost),
      }),
    });

    setVendorName('');
    setPoNumber('');
    setPoDescription('');
    setPoQty('1');
    setPoCost('50');
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
      <p className="text-sm text-zinc-400">Working flow: quotes → sales orders → sales order lines → linked PO lines.</p>
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

        <article className="rounded border border-zinc-800 p-4">
          <h2 className="mb-3 font-medium">Sales Order Lines {primarySo ? `(for ${primarySo.orderNumber})` : ''}</h2>
          {primarySo ? (
            <>
              <form onSubmit={addSoLine} className="mb-3 grid gap-2">
                <select
                  value={lineProductId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    setLineProductId(productId);
                    const p = products.find((x) => x.id === productId);
                    if (p) {
                      setLineDescription(p.name);
                      setLinePrice(String(p.salePrice));
                    }
                  }}
                  className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900"
                >
                  <option value="">Select product (optional)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                  ))}
                </select>
                <input value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} placeholder="Line description" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                <div className="grid grid-cols-2 gap-2">
                  <input value={lineQty} onChange={(e) => setLineQty(e.target.value)} type="number" min="1" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                  <input value={linePrice} onChange={(e) => setLinePrice(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                </div>
                <button className="rounded bg-blue-600 px-3 py-2 text-sm">Add SO Line</button>
              </form>
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.id} className="rounded border border-zinc-700 p-2 text-sm">
                    {line.description} • qty {line.qty} • ${line.unitPrice}
                  </div>
                ))}
                {lines.length === 0 && <p className="text-sm text-zinc-400">No lines yet.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Create a sales order first by converting a quote.</p>
          )}
        </article>

        <article className="rounded border border-zinc-800 p-4">
          <h2 className="mb-3 font-medium">PO Lines linked to first SO line</h2>
          {primaryLine ? (
            <>
              <form onSubmit={attachPoLine} className="mb-3 grid gap-2">
                <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor name" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO number" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                <input value={poDescription} onChange={(e) => setPoDescription(e.target.value)} placeholder="PO line description" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                <div className="grid grid-cols-2 gap-2">
                  <input value={poQty} onChange={(e) => setPoQty(e.target.value)} type="number" min="1" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                  <input value={poCost} onChange={(e) => setPoCost(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900" required />
                </div>
                <button className="rounded bg-blue-600 px-3 py-2 text-sm">Attach PO Line</button>
              </form>
              <div className="space-y-2">
                {poLines.map((line) => (
                  <div key={line.id} className="rounded border border-zinc-700 p-2 text-sm">
                    {line.purchaseOrder.poNumber} • {line.vendor.name} • {line.description} • qty {line.qty} • ${line.unitCost}
                  </div>
                ))}
                {poLines.length === 0 && <p className="text-sm text-zinc-400">No linked PO lines yet.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">Create at least one sales order line first.</p>
          )}
        </article>
      </section>
    </main>
  );
}
