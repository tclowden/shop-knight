"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type Product = { id: string; sku: string; name: string; salePrice: string | number };
type Line = { id: string; description: string; qty: number; unitPrice: string | number; productId?: string | null; sortOrder?: number; parentLineId?: string | null; collapsed?: boolean };
type SalesOrder = {
  id: string;
  orderNumber: string;
  title?: string | null;
  status?: { name: string } | null;
  primaryCustomerContact?: string | null;
  customerInvoiceContact?: string | null;
  billingAddress?: string | null;
  billingAttentionTo?: string | null;
  shippingAddress?: string | null;
  shippingAttentionTo?: string | null;
  installAddress?: string | null;
  shippingMethod?: string | null;
  shippingTracking?: string | null;
  salesOrderDate?: string | null;
  dueDate?: string | null;
  installDate?: string | null;
  shippingDate?: string | null;
  paymentTerms?: string | null;
  downPaymentType?: string | null;
  downPaymentValue?: string | number | null;
  salesRep?: { name: string } | null;
  projectManager?: { name: string } | null;
  designer?: { name: string } | null;
  opportunity: { name: string; customer: { name: string } };
  lines: Line[];
};

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterText, setFilterText] = useState('');

  const [newProductId, setNewProductId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnitPrice, setNewUnitPrice] = useState('0');

  async function load(orderId: string) {
    const [soRes, pRes] = await Promise.all([fetch(`/api/sales-orders/${orderId}`), fetch('/api/admin/products')]);
    if (soRes.ok) setOrder(await soRes.json());
    if (pRes.ok) setProducts(await pRes.json());
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/sales-orders/${id}/lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId || null, description: newDescription, qty: Number(newQty), unitPrice: Number(newUnitPrice) }),
    });
    setNewProductId(''); setNewDescription(''); setNewQty('1'); setNewUnitPrice('0');
    await load(id);
  }

  async function saveLine(line: Line) {
    await fetch(`/api/sales-order-lines/${line.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(line) });
    await load(id);
  }

  async function deleteLine(lineId: string) {
    await fetch(`/api/sales-order-lines/${lineId}`, { method: 'DELETE' });
    await load(id);
  }

  async function reorderLines(lines: Line[]) {
    await fetch(`/api/sales-orders/${id}/lines/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines.map((l, i) => ({ id: l.id, sortOrder: i + 1, parentLineId: l.parentLineId || null })) }),
    });
    await load(id);
  }

  async function moveLine(lineId: string, dir: -1 | 1) {
    const lines = [...(order?.lines || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const idx = lines.findIndex((l) => l.id === lineId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= lines.length) return;
    [lines[idx], lines[target]] = [lines[target], lines[idx]];
    await reorderLines(lines);
  }

  async function dragMoveLine(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const lines = [...(order?.lines || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const from = lines.findIndex((l) => l.id === sourceId);
    const to = lines.findIndex((l) => l.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = lines.splice(from, 1);
    lines.splice(to, 0, moved);
    await reorderLines(lines);
  }

  async function toggleCollapse(line: Line) { await saveLine({ ...line, collapsed: !line.collapsed }); }
  async function makeChild(childId: string, parentId: string | null) {
    const line = (order?.lines || []).find((l) => l.id === childId); if (!line) return;
    await saveLine({ ...line, parentLineId: parentId });
  }

  const roots = useMemo(() => (order?.lines || []).filter((l) => !l.parentLineId), [order?.lines]);
  const childrenMap = useMemo(() => {
    const map = new Map<string, Line[]>();
    (order?.lines || []).forEach((l) => { if (!l.parentLineId) return; const arr = map.get(l.parentLineId) || []; arr.push(l); map.set(l.parentLineId, arr); });
    for (const [k, v] of map) map.set(k, v.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)));
    return map;
  }, [order?.lines]);

  const visibleLines = useMemo(() => {
    const out: Array<{ line: Line; depth: number }> = [];
    const sortedRoots = [...roots].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    for (const r of sortedRoots) { out.push({ line: r, depth: 0 }); if (!r.collapsed) (childrenMap.get(r.id) || []).forEach((c) => out.push({ line: c, depth: 1 })); }
    return out.filter(({ line }) => line.description.toLowerCase().includes(filterText.trim().toLowerCase()));
  }, [roots, childrenMap, filterText]);

  const lineOwnTotals = useMemo(() => {
    const map = new Map<string, number>();
    (order?.lines || []).forEach((l) => map.set(l.id, Number(l.qty) * Number(l.unitPrice || 0)));
    return map;
  }, [order?.lines]);

  const lineDisplayTotals = useMemo(() => {
    const map = new Map<string, number>();
    (order?.lines || []).forEach((l) => {
      const kids = childrenMap.get(l.id) || [];
      if (kids.length > 0) map.set(l.id, kids.reduce((sum, k) => sum + (lineOwnTotals.get(k.id) || 0), 0));
      else map.set(l.id, lineOwnTotals.get(l.id) || 0);
    });
    return map;
  }, [order?.lines, childrenMap, lineOwnTotals]);

  const total = useMemo(() => (order?.lines || []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice || 0), 0), [order?.lines]);

  useEffect(() => { params.then((p) => { setId(p.id); load(p.id); }); }, [params]);
  if (!order) return <main className="mx-auto max-w-6xl p-8">Loading sales order…</main>;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Order {order.orderNumber}</h1>
      <p className="text-sm text-zinc-400">{order.opportunity.name} • {order.opportunity.customer.name}</p>
      <Nav />

      <div className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 text-sm md:grid-cols-2">
        <p><span className="text-zinc-400">Title:</span> {order.title || '—'}</p>
        <p><span className="text-zinc-400">Status:</span> {order.status?.name || '—'}</p>
        <p><span className="text-zinc-400">Primary Customer Contact:</span> {order.primaryCustomerContact || '—'}</p>
        <p><span className="text-zinc-400">Customer Invoice Contact:</span> {order.customerInvoiceContact || '—'}</p>
        <p><span className="text-zinc-400">Sales Order Date:</span> {order.salesOrderDate ? new Date(order.salesOrderDate).toLocaleDateString() : '—'}</p>
        <p><span className="text-zinc-400">Due Date:</span> {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '—'}</p>
        <p><span className="text-zinc-400">Install Date:</span> {order.installDate ? new Date(order.installDate).toLocaleDateString() : '—'}</p>
        <p><span className="text-zinc-400">Shipping Date:</span> {order.shippingDate ? new Date(order.shippingDate).toLocaleDateString() : '—'}</p>
        <p><span className="text-zinc-400">Shipping Method:</span> {order.shippingMethod || '—'}</p>
        <p><span className="text-zinc-400">Shipping Tracking:</span> {order.shippingTracking || '—'}</p>
        <p><span className="text-zinc-400">Payment Terms:</span> {order.paymentTerms || '—'}</p>
        <p><span className="text-zinc-400">Down Payment:</span> {order.downPaymentValue ? `${order.downPaymentValue} ${order.downPaymentType === 'PERCENT' ? '%' : '$'}` : '—'}</p>
        <p><span className="text-zinc-400">Sales Rep:</span> {order.salesRep?.name || '—'}</p>
        <p><span className="text-zinc-400">Project Manager:</span> {order.projectManager?.name || '—'}</p>
        <p><span className="text-zinc-400">Designer:</span> {order.designer?.name || '—'}</p>
        <p><span className="text-zinc-400">Billing Attention To:</span> {order.billingAttentionTo || '—'}</p>
        <p><span className="text-zinc-400">Shipping Attention To:</span> {order.shippingAttentionTo || '—'}</p>
        <p className="md:col-span-2"><span className="text-zinc-400">Billing Address:</span> {order.billingAddress || '—'}</p>
        <p className="md:col-span-2"><span className="text-zinc-400">Shipping Address:</span> {order.shippingAddress || '—'}</p>
        <p className="md:col-span-2"><span className="text-zinc-400">Install Address:</span> {order.installAddress || '—'}</p>
      </div>

      <form onSubmit={addLine} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <select value={newProductId} onChange={(e) => { const pid = e.target.value; setNewProductId(pid); const p = products.find((x) => x.id === pid); if (p) { setNewDescription(p.name); setNewUnitPrice(String(p.salePrice)); } }} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900"><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select>
        <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="1" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <button className="rounded bg-blue-600 px-3 py-2">+ Add Line</button>
      </form>

      <div className="mb-3"><input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter lines..." className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Drag</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3">Unit Price</th><th className="p-3">Line Total</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{visibleLines.map(({ line, depth }) => <SalesOrderLineRow key={`${line.id}-${line.description}-${line.qty}-${line.unitPrice}-${line.parentLineId ?? ''}-${line.collapsed ? '1' : '0'}`} line={line} depth={depth} roots={roots} displayTotal={lineDisplayTotals.get(line.id) || 0} hasChildren={(childrenMap.get(line.id) || []).length > 0} onSave={saveLine} onDelete={deleteLine} onMove={moveLine} onDragMove={dragMoveLine} onToggleCollapse={toggleCollapse} onMakeChild={makeChild} />)}</tbody>
        </table>
      </div>

      <div className="sticky bottom-2 mt-4 ml-auto w-full max-w-sm rounded border border-zinc-800 bg-zinc-950/90 p-3 text-sm backdrop-blur"><p className="flex justify-between text-base font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></p></div>

      <ModuleNotesTasks entityType="SALES_ORDER" entityId={id} />
    </main>
  );
}

function SalesOrderLineRow({ line, depth, roots, displayTotal, hasChildren, onSave, onDelete, onMove, onDragMove, onToggleCollapse, onMakeChild }: { line: Line; depth: number; roots: Line[]; displayTotal: number; hasChildren: boolean; onSave: (line: Line) => void; onDelete: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onDragMove: (sourceId: string, targetId: string) => void; onToggleCollapse: (line: Line) => void; onMakeChild: (id: string, parentId: string | null) => void }) {
  const [draft, setDraft] = useState<Line>(line);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => onSave(draft), 700);
    return () => clearTimeout(t);
  }, [draft, dirty, onSave]);
  return (
    <tr className="border-t border-zinc-800" onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const sourceId = e.dataTransfer.getData('text/plain'); if (sourceId) onDragMove(sourceId, line.id); }}>
      <td className="p-3 align-top">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', line.id);
          }}
          className="inline-flex cursor-grab select-none rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
          title="Drag to reorder"
        >
          ⋮⋮
        </span>
      </td>
      <td className="p-3"><div style={{ paddingLeft: `${depth * 22}px` }} className="flex items-center gap-2">{depth === 0 ? <button onClick={() => onToggleCollapse(line)} className="rounded border border-zinc-600 px-1 text-xs">{line.collapsed ? '+' : '-'}</button> : <span className="text-zinc-500">↳</span>}<input value={draft.description} onChange={(e) => { setDirty(true); setDraft({ ...draft, description: e.target.value }); }} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></div></td>
      <td className="p-3"><input value={draft.qty} onChange={(e) => { setDirty(true); setDraft({ ...draft, qty: Number(e.target.value) }); }} type="number" min="1" className="w-24 rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3"><input value={draft.unitPrice} onChange={(e) => { setDirty(true); setDraft({ ...draft, unitPrice: Number(e.target.value) }); }} type="number" min="0" step="0.01" className="w-28 rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3">${displayTotal.toFixed(2)}{hasChildren ? ' (rollup)' : ''}</td>
      <td className="p-3 space-x-1"><button onClick={() => onSave(draft)} className="rounded border border-zinc-600 px-2 py-1">Save now</button><button onClick={() => onDelete(line.id)} className="rounded border border-red-700 px-2 py-1 text-red-400">Delete</button><button onClick={() => onMove(line.id, -1)} className="rounded border border-zinc-700 px-2 py-1">↑</button><button onClick={() => onMove(line.id, 1)} className="rounded border border-zinc-700 px-2 py-1">↓</button><select value={line.parentLineId || ''} onChange={(e) => onMakeChild(line.id, e.target.value || null)} className="rounded border border-zinc-700 bg-white p-1 text-zinc-900"><option value="">Top level</option>{roots.filter((r) => r.id !== line.id).map((r) => <option key={r.id} value={r.id}>{r.description}</option>)}</select></td>
    </tr>
  );
}
