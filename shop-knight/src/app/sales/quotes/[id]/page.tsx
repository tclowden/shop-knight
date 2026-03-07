"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { StatusChip } from '@/components/status-chip';
import { useUnsavedGuard } from '@/components/use-unsaved-guard';
import { useToast } from '@/components/toast-provider';

type Product = { id: string; sku: string; name: string; category?: string | null; salePrice: string | number };
type User = { id: string; name: string; type: string };
type OpportunityOption = { id: string; name: string; customer: string };
type Proof = {
  id: string;
  version: number;
  fileName: string;
  mimeType: string;
  status: 'PENDING' | 'APPROVED' | 'REVISIONS_REQUESTED';
  approvalNotes?: string | null;
  createdAt: string;
};
type Line = {
  id: string;
  description: string;
  qty: number;
  unitPrice: string | number;
  taxRate?: string | number | null;
  taxable?: boolean;
  productId?: string | null;
  sortOrder?: number;
  parentLineId?: string | null;
  collapsed?: boolean;
};

type Quote = {
  id: string;
  opportunityId?: string;
  quoteNumber: string;
  status?: string | null;
  workflowState?: string | null;
  opportunity: { name: string; customer: { name: string } };
  customerContactRole?: string | null;
  billingAddress?: string | null;
  billingAttentionTo?: string | null;
  shippingAddress?: string | null;
  shippingAttentionTo?: string | null;
  installAddress?: string | null;
  quoteDate?: string | null;
  dueDate?: string | null;
  expiryDate?: string | null;
  salesRepId?: string | null;
  projectManagerId?: string | null;
  salesRep?: { name: string } | null;
  projectManager?: { name: string } | null;
  lines: Line[];
};

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { push } = useToast();
  const [id, setId] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([]);
  const [filterText, setFilterText] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertedSalesOrderId, setConvertedSalesOrderId] = useState('');

  const [selectedProofLineId, setSelectedProofLineId] = useState('');
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofEmail, setProofEmail] = useState('');
  const [sendingProofId, setSendingProofId] = useState('');

  const [newProductId, setNewProductId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnitPrice, setNewUnitPrice] = useState('0');
  const [newTaxable, setNewTaxable] = useState(true);
  const [newUnitCost, setNewUnitCost] = useState('0.00');
  const [newGpmPercent, setNewGpmPercent] = useState('35');

  const [customerContactRole, setCustomerContactRole] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingAttentionTo, setBillingAttentionTo] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAttentionTo, setShippingAttentionTo] = useState('');
  const [installAddress, setInstallAddress] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [opportunityId, setOpportunityId] = useState('');

  async function load(quoteId: string) {
    const [qRes, pRes, usersRes, oppRes] = await Promise.all([fetch(`/api/quotes/${quoteId}`), fetch('/api/admin/products'), fetch('/api/users'), fetch('/api/opportunities')]);
    if (qRes.ok) {
      const q = await qRes.json();
      setQuote(q);
      setCustomerContactRole(q.customerContactRole || '');
      setBillingAddress(q.billingAddress || '');
      setBillingAttentionTo(q.billingAttentionTo || '');
      setShippingAddress(q.shippingAddress || '');
      setShippingAttentionTo(q.shippingAttentionTo || '');
      setInstallAddress(q.installAddress || '');
      setQuoteDate(q.quoteDate ? String(q.quoteDate).slice(0, 10) : '');
      setDueDate(q.dueDate ? String(q.dueDate).slice(0, 10) : '');
      setExpiryDate(q.expiryDate ? String(q.expiryDate).slice(0, 10) : '');
      setSalesRepId(q.salesRepId || '');
      setProjectManagerId(q.projectManagerId || '');
      setOpportunityId(q.opportunityId || '');
    }
    if (pRes.ok) setProducts(await pRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (oppRes.ok) setOpportunities(await oppRes.json());
  }

  async function loadProofs(lineId: string) {
    if (!lineId) {
      setProofs([]);
      return;
    }
    const res = await fetch(`/api/proofs?lineType=QUOTE_LINE&lineId=${lineId}`);
    if (!res.ok) return;
    setProofs(await res.json());
  }

  async function uploadProof() {
    if (!selectedProofLineId || !proofFile) return;
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const payload = result.includes(',') ? result.split(',')[1] : result;
        resolve(payload);
      };
      reader.onerror = reject;
      reader.readAsDataURL(proofFile);
    });

    const res = await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineType: 'QUOTE_LINE',
        lineId: selectedProofLineId,
        fileName: proofFile.name,
        mimeType: proofFile.type || 'application/octet-stream',
        base64Data,
      }),
    });

    if (!res.ok) {
      push('Failed to upload proof', 'error');
      return;
    }

    setProofFile(null);
    push('Proof uploaded', 'success');
    await loadProofs(selectedProofLineId);
  }

  async function sendProofApproval(proofId: string) {
    if (!proofEmail.trim()) {
      push('Enter recipient email first', 'error');
      return;
    }

    setSendingProofId(proofId);
    const res = await fetch(`/api/proofs/${proofId}/send-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: proofEmail.trim() }),
    });
    setSendingProofId('');

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || 'Failed to send proof approval', 'error');
      return;
    }

    push('Proof approval email sent', 'success');
    await loadProofs(selectedProofLineId);
  }

  async function convertToSalesOrder() {
    setConverting(true);
    const res = await fetch(`/api/quotes/${id}/convert`, { method: 'POST' });
    if (!res.ok) {
      push('Failed to convert quote to sales order', 'error');
      setConverting(false);
      return;
    }

    const so = await res.json();
    setConvertedSalesOrderId(so?.id || '');
    push('Quote converted to sales order', 'success');
    await load(id);
    setConverting(false);
  }

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    setSavingHeader(true);
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerContactRole,
        billingAddress,
        billingAttentionTo,
        shippingAddress,
        shippingAttentionTo,
        installAddress,
        quoteDate: quoteDate || null,
        dueDate: dueDate || null,
        expiryDate: expiryDate || null,
        salesRepId: salesRepId || null,
        projectManagerId: projectManagerId || null,
        opportunityId: opportunityId || null,
      }),
    });
    if (res.ok) push('Quote saved', 'success');
    else push('Failed to save quote', 'error');
    await load(id);
    setSavingHeader(false);
    setEditingHeader(false);
  }

  function calculateUnitPriceFromCostGpm(unitCost: string, gpmPercent: string) {
    const cost = Number(unitCost || 0);
    const gpm = Number(gpmPercent || 0) / 100;
    if (!Number.isFinite(cost) || !Number.isFinite(gpm) || gpm >= 1) return '0.00';
    return (cost / (1 - gpm)).toFixed(2);
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/quotes/${id}/lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId || null, description: newDescription, qty: Number(newQty), unitPrice: Number(newUnitPrice), taxable: newTaxable, taxRate: newTaxable ? 0.075 : 0 }),
    });
    setNewProductId(''); setNewDescription(''); setNewQty('1'); setNewUnitPrice('0'); setNewTaxable(true); setNewUnitCost('0.00'); setNewGpmPercent('35');
    await load(id);
  }

  async function saveLine(line: Line) {
    await fetch(`/api/quote-lines/${line.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(line) });
    await load(id);
  }

  async function deleteLine(lineId: string) {
    await fetch(`/api/quote-lines/${lineId}`, { method: 'DELETE' });
    await load(id);
  }

  async function reorderLines(lines: Line[]) {
    await fetch(`/api/quotes/${id}/lines/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines.map((l, i) => ({ id: l.id, sortOrder: i + 1, parentLineId: l.parentLineId || null })) }),
    });
    await load(id);
  }

  async function moveLine(lineId: string, dir: -1 | 1) {
    const lines = [...(quote?.lines || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const idx = lines.findIndex((l) => l.id === lineId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= lines.length) return;
    [lines[idx], lines[target]] = [lines[target], lines[idx]];
    await reorderLines(lines);
  }

  async function dragMoveLine(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const lines = [...(quote?.lines || [])].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    const from = lines.findIndex((l) => l.id === sourceId);
    const to = lines.findIndex((l) => l.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = lines.splice(from, 1);
    lines.splice(to, 0, moved);
    await reorderLines(lines);
  }

  async function toggleCollapse(line: Line) {
    await saveLine({ ...line, collapsed: !line.collapsed });
  }

  async function makeChild(childId: string, parentId: string | null) {
    const line = (quote?.lines || []).find((l) => l.id === childId);
    if (!line) return;
    await saveLine({ ...line, parentLineId: parentId });
  }

  const roots = useMemo(() => (quote?.lines || []).filter((l) => !l.parentLineId), [quote?.lines]);
  const childrenMap = useMemo(() => {
    const map = new Map<string, Line[]>();
    (quote?.lines || []).forEach((l) => {
      if (!l.parentLineId) return;
      const arr = map.get(l.parentLineId) || [];
      arr.push(l);
      map.set(l.parentLineId, arr);
    });
    for (const [k, v] of map) map.set(k, v.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)));
    return map;
  }, [quote?.lines]);

  const visibleLines = useMemo(() => {
    const out: Array<{ line: Line; depth: number }> = [];
    const sortedRoots = [...roots].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    for (const r of sortedRoots) {
      out.push({ line: r, depth: 0 });
      if (!r.collapsed) {
        (childrenMap.get(r.id) || []).forEach((c) => out.push({ line: c, depth: 1 }));
      }
    }
    return out.filter(({ line }) => line.description.toLowerCase().includes(filterText.trim().toLowerCase()));
  }, [roots, childrenMap, filterText]);

  const lineOwnTotals = useMemo(() => {
    const map = new Map<string, number>();
    (quote?.lines || []).forEach((l) => {
      map.set(l.id, Number(l.qty) * Number(l.unitPrice || 0) * (1 + Number(l.taxRate ?? 0)));
    });
    return map;
  }, [quote?.lines]);

  const lineDisplayTotals = useMemo(() => {
    const map = new Map<string, number>();
    (quote?.lines || []).forEach((l) => {
      const kids = childrenMap.get(l.id) || [];
      if (kids.length > 0) {
        map.set(l.id, kids.reduce((sum, k) => sum + (lineOwnTotals.get(k.id) || 0), 0));
      } else {
        map.set(l.id, lineOwnTotals.get(l.id) || 0);
      }
    });
    return map;
  }, [quote?.lines, childrenMap, lineOwnTotals]);

  const subtotal = useMemo(() => (quote?.lines || []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice || 0), 0), [quote?.lines]);
  const taxTotal = useMemo(() => (quote?.lines || []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unitPrice || 0) * Number(l.taxRate ?? 0), 0), [quote?.lines]);

  const headerDirty = useMemo(() => {
    if (!quote || !editingHeader) return false;
    return (
      customerContactRole !== (quote.customerContactRole || '') ||
      billingAddress !== (quote.billingAddress || '') ||
      billingAttentionTo !== (quote.billingAttentionTo || '') ||
      shippingAddress !== (quote.shippingAddress || '') ||
      shippingAttentionTo !== (quote.shippingAttentionTo || '') ||
      installAddress !== (quote.installAddress || '') ||
      quoteDate !== (quote.quoteDate ? String(quote.quoteDate).slice(0, 10) : '') ||
      dueDate !== (quote.dueDate ? String(quote.dueDate).slice(0, 10) : '') ||
      expiryDate !== (quote.expiryDate ? String(quote.expiryDate).slice(0, 10) : '') ||
      salesRepId !== (quote.salesRepId || '') ||
      projectManagerId !== (quote.projectManagerId || '') ||
      opportunityId !== (quote.opportunityId || '')
    );
  }, [quote, editingHeader, customerContactRole, billingAddress, billingAttentionTo, shippingAddress, shippingAttentionTo, installAddress, quoteDate, dueDate, expiryDate, salesRepId, projectManagerId, opportunityId]);

  useUnsavedGuard(headerDirty);

  useEffect(() => {
    if (!quote?.lines?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedProofLineId('');
      setProofs([]);
      return;
    }
    setSelectedProofLineId((prev) => prev || quote.lines[0].id);
  }, [quote?.lines]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProofs(selectedProofLineId);
  }, [selectedProofLineId]);

  useEffect(() => { params.then((p) => { setId(p.id); load(p.id); }); }, [params]);
  if (!quote) return <main className="mx-auto max-w-6xl p-8">Loading quote…</main>;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Quote {quote.quoteNumber}</h1>
      <p className="text-sm text-zinc-400">{quote.opportunity.name} • {quote.opportunity.customer.name}</p>
      <Nav />

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <button
          onClick={convertToSalesOrder}
          disabled={converting}
          className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {converting ? 'Converting…' : 'Convert to Sales Order'}
        </button>
        {convertedSalesOrderId ? (
          <Link href={`/sales/orders/${convertedSalesOrderId}`} className="text-sm font-medium text-sky-700">
            Open Sales Order →
          </Link>
        ) : null}
      </section>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded border border-zinc-800 p-3"><p className="text-xs text-zinc-400">State</p><div className="mt-1"><StatusChip value={quote.workflowState || quote.status} /></div></div>
        <div className="rounded border border-zinc-800 p-3"><p className="text-xs text-zinc-400">Lines</p><p className="text-xl font-semibold">{quote.lines.length}</p></div>
        <div className="rounded border border-zinc-800 p-3"><p className="text-xs text-zinc-400">Subtotal</p><p className="text-xl font-semibold">${subtotal.toFixed(0)}</p></div>
        <div className="rounded border border-zinc-800 p-3"><p className="text-xs text-zinc-400">Total</p><p className="text-xl font-semibold">${(subtotal + taxTotal).toFixed(0)}</p></div>
      </div>

      <div className="mb-4 rounded border border-zinc-800 p-3 text-sm">
        {!editingHeader ? (
          <>
            <div className="mb-3 flex justify-end"><button onClick={() => setEditingHeader(true)} className="rounded border border-zinc-600 px-3 py-1">Edit</button></div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <p><span className="text-zinc-400">Opportunity:</span> {quote.opportunity.name}</p>
              <p><span className="text-zinc-400">Customer Contact Role:</span> {quote.customerContactRole || '—'}</p>
              <p><span className="text-zinc-400">Sales Rep:</span> {quote.salesRep?.name || '—'}</p>
              <p><span className="text-zinc-400">Project Manager:</span> {quote.projectManager?.name || '—'}</p>
              <p><span className="text-zinc-400">Quote Date:</span> {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString() : '—'}</p>
              <p><span className="text-zinc-400">Due Date:</span> {quote.dueDate ? new Date(quote.dueDate).toLocaleDateString() : '—'}</p>
              <p><span className="text-zinc-400">Expiration Date:</span> {quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString() : '—'}</p>
              <p><span className="text-zinc-400">Billing Attention To:</span> {quote.billingAttentionTo || '—'}</p>
              <p><span className="text-zinc-400">Shipping Attention To:</span> {quote.shippingAttentionTo || '—'}</p>
              <p className="md:col-span-2"><span className="text-zinc-400">Billing Address:</span> {quote.billingAddress || '—'}</p>
              <p className="md:col-span-2"><span className="text-zinc-400">Shipping Address:</span> {quote.shippingAddress || '—'}</p>
              <p className="md:col-span-2"><span className="text-zinc-400">Install Address:</span> {quote.installAddress || '—'}</p>
            </div>
          </>
        ) : (
          <form onSubmit={saveHeader} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Opportunity</span><select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"><option value="">Select opportunity</option>{opportunities.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.customer}</option>)}</select></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Customer Contact Role</span><input value={customerContactRole} onChange={(e) => setCustomerContactRole(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Sales Rep</span><select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"><option value="">Unassigned</option>{users.filter((u) => u.type === 'SALES_REP' || u.type === 'SALES' || u.type === 'ADMIN').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Project Manager</span><select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"><option value="">Unassigned</option>{users.filter((u) => u.type === 'PROJECT_MANAGER' || u.type === 'ADMIN').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Quote Date</span><input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Due Date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Expiration Date</span><input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Billing Attention To</span><input value={billingAttentionTo} onChange={(e) => setBillingAttentionTo(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></label>
            <label className="text-sm"><span className="mb-1 block text-zinc-300">Shipping Attention To</span><input value={shippingAttentionTo} onChange={(e) => setShippingAttentionTo(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></label>
            <div className="md:col-span-2"><AddressAutocomplete label="Billing Address" value={billingAddress} onChange={setBillingAddress} /></div>
            <div className="md:col-span-2"><AddressAutocomplete label="Shipping Address" value={shippingAddress} onChange={setShippingAddress} /></div>
            <div className="md:col-span-2"><AddressAutocomplete label="Install Address" value={installAddress} onChange={setInstallAddress} /></div>
            <div className="sticky bottom-2 md:col-span-2 flex gap-2 rounded bg-zinc-950/90 p-2 backdrop-blur"><button disabled={savingHeader} className="rounded bg-blue-600 px-4 py-2 disabled:opacity-60">{savingHeader ? 'Saving…' : 'Save Quote Header'}</button><button type="button" onClick={() => { setEditingHeader(false); load(id); }} className="rounded border border-zinc-600 px-4 py-2">Cancel</button></div>
          </form>
        )}
      </div>

      <form onSubmit={addLine} className="mb-4 space-y-2 rounded border border-zinc-800 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <label className="text-xs text-zinc-300">Product
            <select value={newProductId} onChange={(e) => { const pid = e.target.value; setNewProductId(pid); const p = products.find((x) => x.id === pid); if (p) { setNewDescription(p.name); setNewUnitPrice(String(p.salePrice)); } }} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"><option value="">Custom / no product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select>
          </label>
          <label className="text-xs text-zinc-300">Description
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <label className="text-xs text-zinc-300">Quantity
            <input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <label className="text-xs text-zinc-300">Unit Price
            <input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <label className="text-xs text-zinc-300">Taxable
            <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900"><input type="checkbox" checked={newTaxable} onChange={(e) => setNewTaxable(e.target.checked)} /></span>
          </label>
          <div className="flex items-end"><button className="w-full rounded bg-blue-600 px-3 py-2">+ Add Line</button></div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="text-xs text-zinc-300">Unit Cost
            <input value={newUnitCost} onChange={(e) => { const v = e.target.value; setNewUnitCost(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(v, newGpmPercent)); }} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-xs text-zinc-300">GPM %
            <input value={newGpmPercent} onChange={(e) => { const v = e.target.value; setNewGpmPercent(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(newUnitCost, v)); }} type="number" min="0" max="99.99" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-xs text-zinc-300">Extended Price
            <input value={(Number(newQty || 0) * Number(newUnitPrice || 0)).toFixed(2)} disabled className="mt-1 w-full rounded border border-zinc-700 bg-zinc-100 p-2 text-zinc-700" />
          </label>
        </div>
      </form>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Proofs & Customer Approval</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Line Item</span>
            <select value={selectedProofLineId} onChange={(e) => setSelectedProofLineId(e.target.value)} className="field">
              <option value="">Select line</option>
              {quote.lines.map((line) => <option key={line.id} value={line.id}>{line.description}</option>)}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Upload Proof File</span>
            <div className="flex gap-2">
              <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="field" />
              <button type="button" onClick={uploadProof} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Upload</button>
            </div>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-slate-600">Customer Email</span>
            <input value={proofEmail} onChange={(e) => setProofEmail(e.target.value)} placeholder="customer@email.com" className="field" />
          </label>
        </div>

        <div className="mt-3 space-y-2">
          {proofs.map((proof) => (
            <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <p className="font-medium">v{proof.version} • {proof.fileName}</p>
                <p className="text-xs text-slate-500">Status: {proof.status}{proof.approvalNotes ? ` • Notes: ${proof.approvalNotes}` : ''}</p>
                <a href={`/api/proofs/file/${proof.id}`} target="_blank" rel="noreferrer" className="text-xs text-sky-700">Open proof</a>
              </div>
              <button type="button" onClick={() => sendProofApproval(proof.id)} disabled={sendingProofId === proof.id} className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium hover:bg-slate-100 disabled:opacity-50">{sendingProofId === proof.id ? 'Sending…' : 'Send for Approval'}</button>
            </div>
          ))}
          {selectedProofLineId && proofs.length === 0 ? <p className="text-sm text-slate-500">No proofs uploaded for this line yet.</p> : null}
        </div>
      </section>

      <div className="mb-3"><input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter lines..." className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Drag</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3">Unit Price</th><th className="p-3">Taxable</th><th className="p-3">Total</th><th className="p-3">Actions</th></tr></thead>
          <tbody>
            {visibleLines.map(({ line, depth }) => (
              <QuoteLineRow
                key={`${line.id}-${line.description}-${line.qty}-${line.unitPrice}-${line.taxRate ?? ''}-${line.parentLineId ?? ''}-${line.collapsed ? '1' : '0'}`}
                line={line}
                depth={depth}
                roots={roots}
                displayTotal={lineDisplayTotals.get(line.id) || 0}
                hasChildren={(childrenMap.get(line.id) || []).length > 0}
                onSave={saveLine}
                onDelete={deleteLine}
                onMove={moveLine}
                onDragMove={dragMoveLine}
                onToggleCollapse={toggleCollapse}
                onMakeChild={makeChild}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-1rem))] rounded border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-lg">
        <p className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></p>
        <p className="mt-1 flex justify-between"><span>Tax</span><span>${taxTotal.toFixed(2)}</span></p>
        <p className="mt-2 flex justify-between text-base font-semibold"><span>Total</span><span>${(subtotal + taxTotal).toFixed(2)}</span></p>
      </div>

      <ModuleNotesTasks entityType="QUOTE" entityId={id} />
    </main>
  );
}

function QuoteLineRow({ line, depth, roots, displayTotal, hasChildren, onSave, onDelete, onMove, onDragMove, onToggleCollapse, onMakeChild }: { line: Line; depth: number; roots: Line[]; displayTotal: number; hasChildren: boolean; onSave: (line: Line) => void; onDelete: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onDragMove: (sourceId: string, targetId: string) => void; onToggleCollapse: (line: Line) => void; onMakeChild: (id: string, parentId: string | null) => void }) {
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
      <td className="p-3">
        <div style={{ paddingLeft: `${depth * 22}px` }} className="flex items-center gap-2">
          {depth === 0 ? <button onClick={() => onToggleCollapse(line)} className="rounded border border-zinc-600 px-1 text-xs">{line.collapsed ? '+' : '-'}</button> : <span className="text-zinc-500">↳</span>}
          <input value={draft.description} onChange={(e) => { setDirty(true); setDraft({ ...draft, description: e.target.value }); }} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </div>
      </td>
      <td className="p-3"><input value={draft.qty} onChange={(e) => { setDirty(true); setDraft({ ...draft, qty: Number(e.target.value) }); }} type="number" min="1" className="w-24 rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3"><input value={draft.unitPrice} onChange={(e) => { setDirty(true); setDraft({ ...draft, unitPrice: Number(e.target.value) }); }} type="number" min="0" step="0.01" className="w-28 rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></td>
      <td className="p-3"><label className="flex items-center gap-2"><input type="checkbox" checked={Number(draft.taxRate ?? 0) > 0} onChange={(e) => { setDirty(true); setDraft({ ...draft, taxRate: e.target.checked ? 0.075 : 0 }); }} /><span className="text-xs">Taxable</span></label></td>
      <td className="p-3">${displayTotal.toFixed(2)}{hasChildren ? ' (rollup)' : ''}</td>
      <td className="p-3 space-x-1">
        <button onClick={() => onSave(draft)} className="rounded border border-zinc-600 px-2 py-1">Save now</button>
        <button onClick={() => onDelete(line.id)} className="rounded border border-red-700 px-2 py-1 text-red-400">Delete</button>
        <button onClick={() => onMove(line.id, -1)} className="rounded border border-zinc-700 px-2 py-1">↑</button>
        <button onClick={() => onMove(line.id, 1)} className="rounded border border-zinc-700 px-2 py-1">↓</button>
        <select value={line.parentLineId || ''} onChange={(e) => onMakeChild(line.id, e.target.value || null)} className="rounded border border-zinc-700 bg-white p-1 text-zinc-900">
          <option value="">Top level</option>
          {roots.filter((r) => r.id !== line.id).map((r) => <option key={r.id} value={r.id}>{r.description}</option>)}
        </select>
      </td>
    </tr>
  );
}
