"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Product = { id: string; sku: string; name: string; salePrice: string | number };
type Line = { id: string; description: string; qty: number; unitPrice: string | number; productId?: string | null };
type SalesOrder = {
  id: string;
  orderNumber: string;
  opportunity: { name: string; customer: { name: string } };
  lines: Line[];
};

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [newProductId, setNewProductId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnitPrice, setNewUnitPrice] = useState('0');

  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'description' | 'qty' | 'unitPrice' | 'lineTotal'>('description');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  async function load(orderId: string) {
    const [soRes, pRes] = await Promise.all([fetch(`/api/sales-orders/${orderId}`), fetch('/api/admin/products')]);
    if (soRes.ok) setOrder(await soRes.json());
    if (pRes.ok) setProducts(await pRes.json());
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/sales-orders/${id}/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId || null, description: newDescription, qty: Number(newQty), unitPrice: Number(newUnitPrice) }),
    });
    setNewProductId(''); setNewDescription(''); setNewQty('1'); setNewUnitPrice('0');
    await load(id);
  }

  async function saveLine(line: Line) {
    await fetch(`/api/sales-order-lines/${line.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(line),
    });
    await load(id);
  }

  async function deleteLine(lineId: string) {
    await fetch(`/api/sales-order-lines/${lineId}`, { method: 'DELETE' });
    await load(id);
  }

  const visibleLines = useMemo(() => {
    const lines = [...(order?.lines || [])].filter((l) =>
      l.description.toLowerCase().includes(filterText.trim().toLowerCase())
    );
    lines.sort((a, b) => {
      const aLineTotal = Number(a.qty) * Number(a.unitPrice || 0);
      const bLineTotal = Number(b.qty) * Number(b.unitPrice || 0);
      let cmp = 0;
      if (sortBy === 'description') cmp = a.description.localeCompare(b.description);
      if (sortBy === 'qty') cmp = Number(a.qty) - Number(b.qty);
      if (sortBy === 'unitPrice') cmp = Number(a.unitPrice || 0) - Number(b.unitPrice || 0);
      if (sortBy === 'lineTotal') cmp = aLineTotal - bLineTotal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return lines;
  }, [order?.lines, filterText, sortBy, sortDir]);

  const total = useMemo(() => (order?.lines || []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice || 0), 0), [order?.lines]);

  useEffect(() => { params.then((p) => { setId(p.id); load(p.id); }); }, [params]);
  if (!order) return <main className="mx-auto max-w-6xl p-8">Loading sales order…</main>;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Order {order.orderNumber}</h1>
      <p className="text-sm text-zinc-400">{order.opportunity.name} • {order.opportunity.customer.name}</p>
      <Nav />

      <form onSubmit={addLine} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <select value={newProductId} onChange={(e) => { const pid = e.target.value; setNewProductId(pid); const p = products.find((x) => x.id === pid); if (p) { setNewDescription(p.name); setNewUnitPrice(String(p.salePrice)); } }} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="">Select product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
        </select>
        <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="1" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <button className="rounded bg-blue-600 px-3 py-2">+ Add Line</button>
      </form>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter lines..." className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'description' | 'qty' | 'unitPrice' | 'lineTotal')} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="description">Sort: Description</option>
          <option value="qty">Sort: Qty</option>
          <option value="unitPrice">Sort: Unit Price</option>
          <option value="lineTotal">Sort: Line Total</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3">Unit Price</th><th className="p-3">Line Total</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{visibleLines.map((line) => <SalesOrderLineRow key={line.id} line={line} onSave={saveLine} onDelete={deleteLine} />)}</tbody>
        </table>
      </div>

      <div className="mt-4 ml-auto w-full max-w-sm rounded border border-zinc-800 p-3 text-sm">
        <p className="flex justify-between text-base font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></p>
      </div>
    </main>
  );
}

function SalesOrderLineRow({ line, onSave, onDelete }: { line: Line; onSave: (line: Line) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState<Line>(line);
  useEffect(() => {
    setDraft(line);
  }, [line]);
  const lineTotal = Number(draft.qty || 0) * Number(draft.unitPrice || 0);
  return (
    <tr className="border-t border-zinc-800">
      <td className="p-3"><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3"><input value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })} type="number" min="1" className="w-24 rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3"><input value={draft.unitPrice} onChange={(e) => setDraft({ ...draft, unitPrice: Number(e.target.value) })} type="number" min="0" step="0.01" className="w-28 rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3">${lineTotal.toFixed(2)}</td>
      <td className="p-3 space-x-2"><button onClick={() => onSave(draft)} className="rounded border border-zinc-600 px-2 py-1">Save</button><button onClick={() => onDelete(line.id)} className="rounded border border-red-700 px-2 py-1 text-red-400">Delete</button></td>
    </tr>
  );
}
