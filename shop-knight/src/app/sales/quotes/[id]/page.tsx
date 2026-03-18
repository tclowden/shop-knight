"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { StatusChip } from '@/components/status-chip';
import { ClockInButton } from '@/components/clock-in-button';
import { useUnsavedGuard } from '@/components/use-unsaved-guard';
import { useToast } from '@/components/toast-provider';
import { buildPricingVars, computeUnitPrice } from '@/lib/pricing';

type ProductAttribute = { id: string; code: string; name: string; inputType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'; defaultValue: string | null; options: string[] | null; required?: boolean };
type Product = { id: string; sku: string; name: string; category?: string | null; salePrice: string | number; pricingFormula?: string | null; attributes?: ProductAttribute[] };
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
  lastRequest?: {
    id: string;
    recipientEmail: string;
    expiresAt: string;
    respondedAt: string | null;
    decision: string | null;
  } | null;
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
  opportunity: { name: string; customer: { name: string; additionalFeePercent?: string | number | null } };
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
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [bulkParentId, setBulkParentId] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertedSalesOrderId, setConvertedSalesOrderId] = useState('');
  const [batchProofRecipient, setBatchProofRecipient] = useState('');
  const [selectedProofIds, setSelectedProofIds] = useState<string[]>([]);
  const [sendingBatchProofs, setSendingBatchProofs] = useState(false);
  const [showProofPicker, setShowProofPicker] = useState(false);
  const [unsentProofOptions, setUnsentProofOptions] = useState<Array<{ id: string; fileName: string; mimeType: string; lineDescription: string; statusLabel: string }>>([]);


  const [newProductId, setNewProductId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnitPrice, setNewUnitPrice] = useState('0');
  const [newTaxable, setNewTaxable] = useState(true);
  const [newUnitCost, setNewUnitCost] = useState('0.00');
  const [newGpmPercent, setNewGpmPercent] = useState('35');
  const [newAttributeValues, setNewAttributeValues] = useState<Record<string, string>>({});

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

  async function sendBatchProofApproval() {
    if (!batchProofRecipient.trim()) { push('Enter recipient email first', 'error'); return; }
    if (selectedProofIds.length === 0) { push('Select one or more proofs first', 'error'); return; }

    setSendingBatchProofs(true);
    const res = await fetch('/api/proofs/send-approval-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: batchProofRecipient.trim(), proofIds: selectedProofIds }),
    });
    setSendingBatchProofs(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      push(payload?.error || 'Failed to send batch proof email', 'error');
      return;
    }
    push(`Proof approval email sent for ${selectedProofIds.length} proof(s)`, 'success');
    setSelectedProofIds([]);
  }

  async function loadUnsentProofOptions() {
    if (!quote) return;
    const proofsByLine = await Promise.all(
      quote.lines.map(async (line) => {
        const res = await fetch(`/api/proofs?lineType=QUOTE_LINE&lineId=${line.id}`);
        if (!res.ok) return [] as Proof[];
        return (await res.json()) as Proof[];
      })
    );

    const options = proofsByLine.flatMap((proofs, index) => {
      const latest = [...proofs].sort((a, b) => b.version - a.version || +new Date(b.createdAt) - +new Date(a.createdAt))[0];
      if (!latest) return [];
      if (latest.status === 'APPROVED' || latest.lastRequest?.decision === 'APPROVED') return [];

      return [{
        id: latest.id,
        fileName: latest.fileName,
        mimeType: latest.mimeType,
        lineDescription: quote.lines[index]?.description || 'Line item',
        statusLabel: !latest.lastRequest
          ? 'Never Sent'
          : !latest.lastRequest.respondedAt
            ? 'Sent, Pending Approval'
            : latest.lastRequest.decision === 'REVISIONS_REQUESTED'
              ? 'Sent, Rejected'
              : 'Needs Review',
      }];
    });

    setUnsentProofOptions(options);
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
    const baseGpm = Number(gpmPercent || 0);
    const additionalFee = Number(quote?.opportunity?.customer?.additionalFeePercent || 0);
    const effectiveGpm = (baseGpm + additionalFee) / 100;
    if (!Number.isFinite(cost) || !Number.isFinite(effectiveGpm) || effectiveGpm >= 1) return '0.00';
    return (cost / (1 - effectiveGpm)).toFixed(2);
  }

  function applySelectCostToUnitCost(value: string) {
    const parts = String(value || '').split('|').map((p) => p.trim());
    if (parts.length >= 3) {
      const n = Number(parts[2]);
      if (Number.isFinite(n)) setNewUnitCost(n.toFixed(2));
    }
  }

  function recalcNewLinePrice(productId: string, qty: string, attrs: Record<string, string>) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const basePrice = Number(p.salePrice || 0);
    const vars = buildPricingVars(Number(qty || 1), basePrice, attrs);
    setNewUnitPrice(String(computeUnitPrice(basePrice, p.pricingFormula, vars)));
  }

  async function addLine(e: React.FormEvent) {
    e.preventDefault();

    const selected = products.find((p) => p.id === newProductId);
    if (selected?.attributes?.length) {
      const missing = selected.attributes.filter((attr) => {
        if (!attr.required) return false;
        const raw = newAttributeValues[attr.code] || '';
        if (attr.inputType === 'BOOLEAN') return raw.toLowerCase() !== 'true';
        return !String(raw).trim();
      });
      if (missing.length > 0) {
        push(`Please fill required attributes: ${missing.map((m) => m.name).join(', ')}`, 'error');
        return;
      }
    }

    await fetch(`/api/quotes/${id}/lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId || null, description: newDescription, qty: Number(newQty), unitPrice: Number(newUnitPrice), taxable: newTaxable, taxRate: newTaxable ? 0.075 : 0, attributeValues: { ...newAttributeValues, _unitCost: newUnitCost, _gpmPercent: newGpmPercent, _taxable: newTaxable ? 'true' : 'false' } }),
    });
    setNewProductId(''); setNewDescription(''); setNewQty('1'); setNewUnitPrice('0'); setNewTaxable(true); setNewUnitCost('0.00'); setNewGpmPercent('35'); setNewAttributeValues({});
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

  async function bulkMakeChild(parentId: string | null) {
    if (selectedLineIds.length === 0) { push('Select one or more lines first', 'error'); return; }
    const selected = (quote?.lines || []).filter((l) => selectedLineIds.includes(l.id));
    await Promise.all(selected.map((line) => fetch(`/api/quote-lines/${line.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...line, parentLineId: parentId }),
    })));
    setSelectedLineIds([]);
    setBulkParentId('');
    await load(id);
    push('Updated rollup parent for selected lines', 'success');
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

  useEffect(() => { params.then((p) => { setId(p.id); load(p.id); }); }, [params]);
  if (!quote) return <main className="mx-auto max-w-6xl p-8">Loading quote…</main>;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <Nav />
      <h1 className="text-2xl font-semibold">Quote {quote.quoteNumber}</h1>
      <p className="text-sm text-zinc-400">{quote.opportunity.name} • {quote.opportunity.customer.name}</p>

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <ClockInButton sourceType="QUOTE" sourceId={id} />
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
        <details open>
          <summary className="cursor-pointer list-none text-base font-semibold">Quote Info</summary>
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
        </details>
      </div>

      <form onSubmit={addLine} className="mb-4 space-y-2 rounded border border-zinc-800 p-3">
        <details open>
          <summary className="cursor-pointer list-none text-base font-semibold">Line Items</summary>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <label className="text-xs text-zinc-300">Product
            <select value={newProductId} onChange={(e) => { const pid = e.target.value; setNewProductId(pid); const p = products.find((x) => x.id === pid); if (p) { setNewDescription(p.name); const defaults = Object.fromEntries((p.attributes || []).map((a) => [a.code, a.defaultValue || ''])); setNewAttributeValues(defaults); recalcNewLinePrice(pid, newQty, defaults); } else { setNewAttributeValues({}); } }} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"><option value="">Custom / no product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select>
          </label>
          <label className="text-xs text-zinc-300">Description
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <label className="text-xs text-zinc-300">Quantity
            <input value={newQty} onChange={(e) => { const q = e.target.value; setNewQty(q); recalcNewLinePrice(newProductId, q, newAttributeValues); }} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <label className="text-xs text-zinc-300">Unit Cost
            <input value={newUnitCost} onChange={(e) => { const v = e.target.value; setNewUnitCost(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(v, newGpmPercent)); }} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-xs text-zinc-300">Taxable
            <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900"><input type="checkbox" checked={newTaxable} onChange={(e) => setNewTaxable(e.target.checked)} /></span>
          </label>
          <div className="flex items-end"><button className="w-full rounded bg-blue-600 px-3 py-2">+ Add Line</button></div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <label className="text-xs text-zinc-300">Unit Price
            <input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          </label>
          <label className="text-xs text-zinc-300">GPM %
            <input value={newGpmPercent} onChange={(e) => { const v = e.target.value; setNewGpmPercent(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(newUnitCost, v)); }} type="number" min="0" max="99.99" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            <span className="mt-1 block text-[11px] text-zinc-500">+ Fee {Number(quote?.opportunity?.customer?.additionalFeePercent || 0).toFixed(2)}%</span>
          </label>
          <label className="text-xs text-zinc-300">Extended Price
            <input value={(Number(newQty || 0) * Number(newUnitPrice || 0)).toFixed(2)} disabled className="mt-1 w-full rounded border border-zinc-700 bg-zinc-100 p-2 text-zinc-700" />
          </label>
        </div>
        {(() => {
          const selected = products.find((p) => p.id === newProductId);
          if (!selected?.attributes?.length) return null;
          return (
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              {selected.attributes.map((attr) => (
                <label key={attr.id} className="text-xs text-zinc-300">
                  {attr.name}
                  {['width', 'height'].includes(attr.code.toLowerCase()) ? <span className="ml-1 text-[10px] text-zinc-500">(in inches)</span> : null}
                  {attr.inputType === 'SELECT' ? (
                    <select
                      value={newAttributeValues[attr.code] || ''}
                      required={Boolean(attr.required)}
                      onChange={(e) => {
                        const next = { ...newAttributeValues, [attr.code]: e.target.value };
                        setNewAttributeValues(next);
                        applySelectCostToUnitCost(e.target.value);
                        recalcNewLinePrice(newProductId, newQty, next);
                      }}
                      className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                    >
                      <option value="">Select</option>
                      {(attr.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : attr.inputType === 'BOOLEAN' ? (
                    <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900">
                      <input
                        type="checkbox"
                        checked={(newAttributeValues[attr.code] || '').toLowerCase() === 'true'}
                        onChange={(e) => {
                          const next = { ...newAttributeValues, [attr.code]: e.target.checked ? 'true' : 'false' };
                          setNewAttributeValues(next);
                          recalcNewLinePrice(newProductId, newQty, next);
                        }}
                      />
                    </span>
                  ) : (
                    <input
                      value={newAttributeValues[attr.code] || ''}
                      onChange={(e) => {
                        const next = { ...newAttributeValues, [attr.code]: e.target.value };
                        setNewAttributeValues(next);
                        recalcNewLinePrice(newProductId, newQty, next);
                      }}
                      type={attr.inputType === 'NUMBER' ? 'number' : 'text'}
                      className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                      required={Boolean(attr.required)}
                    />
                  )}
                </label>
              ))}
            </div>
          );
        })()}
        </details>
      </form>

      <div className="mb-3 hidden rounded border border-zinc-700 p-3">
        <details open>
          <summary className="cursor-pointer list-none text-sm font-semibold">Batch Proof Approvals</summary>
        <p className="mt-2 text-xs text-zinc-400">Batch proof approvals</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={batchProofRecipient} onChange={(e) => setBatchProofRecipient(e.target.value)} placeholder="recipient@email.com" className="w-full max-w-sm rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <button type="button" onClick={async () => { await loadUnsentProofOptions(); setShowProofPicker(true); }} className="rounded border border-zinc-600 px-3 py-2 text-xs">Select Proofs</button>
          <button type="button" onClick={sendBatchProofApproval} disabled={sendingBatchProofs} className="rounded bg-sky-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{sendingBatchProofs ? 'Sending…' : `Send Selected (${selectedProofIds.length})`}</button>
          {selectedProofIds.length > 0 ? <button type="button" onClick={() => setSelectedProofIds([])} className="rounded border border-zinc-600 px-3 py-2 text-xs">Clear Selection</button> : null}
        </div>
        {showProofPicker ? (
          <div className="mt-3 space-y-2 rounded border border-zinc-700 p-2">
            {unsentProofOptions.map((proof) => (
              <label key={proof.id} className="flex items-center gap-2 rounded border border-zinc-700 p-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedProofIds.includes(proof.id)}
                  onChange={(e) => setSelectedProofIds((prev) => e.target.checked ? (prev.includes(proof.id) ? prev : [...prev, proof.id]) : prev.filter((id) => id !== proof.id))}
                />
                {proof.mimeType.startsWith('image/') ? <img src={`/api/proofs/file/${proof.id}`} alt={proof.fileName} className="h-10 w-10 rounded object-cover" /> : <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-zinc-800">PDF</span>}
                <span>
                  {proof.fileName} <span className="text-zinc-400">• {proof.lineDescription}</span>
                  <span className="ml-2 text-[11px] text-zinc-400">({proof.statusLabel})</span>
                </span>
              </label>
            ))}
            {unsentProofOptions.length === 0 ? <p className="text-xs text-zinc-400">No unsent proofs found.</p> : null}
          </div>
        ) : null}
        </details>
      </div>

      <details open className="mb-3 rounded border border-zinc-700 p-3">
        <summary className="cursor-pointer list-none text-base font-semibold">Line Items</summary>
      <div className="mb-3 mt-2"><input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter lines..." className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" /></div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-zinc-700 p-2 text-xs">
        <span className="text-zinc-400">Selected: {selectedLineIds.length}</span>
        <select value={bulkParentId} onChange={(e) => setBulkParentId(e.target.value)} className="rounded border border-zinc-700 bg-white p-1 text-zinc-900">
          <option value="">Top level</option>
          {roots.filter((r) => !selectedLineIds.includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.description}</option>)}
        </select>
        <button onClick={() => bulkMakeChild(bulkParentId || null)} className="rounded border border-zinc-600 px-2 py-1">Apply rollup</button>
        <button onClick={() => setSelectedLineIds([])} className="rounded border border-zinc-600 px-2 py-1">Clear</button>
      </div>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Sel</th><th className="p-3">Drag</th><th className="p-3">Description</th><th className="p-3">Qty</th><th className="p-3">Unit Price</th><th className="p-3">Taxable</th><th className="p-3">Total</th><th className="p-3">Actions</th></tr></thead>
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
                toast={push}
                selectedProofIds={selectedProofIds}
                onToggleProofSelection={(proofId, selected) => {
                  setSelectedProofIds((prev) => {
                    if (selected) return prev.includes(proofId) ? prev : [...prev, proofId];
                    return prev.filter((id) => id !== proofId);
                  });
                }}
                selectedLineIds={selectedLineIds}
                onToggleLineSelection={(lineId, selected) => {
                  setSelectedLineIds((prev) => selected ? (prev.includes(lineId) ? prev : [...prev, lineId]) : prev.filter((id) => id !== lineId));
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      </details>

      <div className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-1rem))] rounded border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-lg">
        <p className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></p>
        <p className="mt-1 flex justify-between"><span>Tax</span><span>${taxTotal.toFixed(2)}</span></p>
        <p className="mt-2 flex justify-between text-base font-semibold"><span>Total</span><span>${(subtotal + taxTotal).toFixed(2)}</span></p>
      </div>

      <ModuleNotesTasks entityType="QUOTE" entityId={id} />
    </main>
  );
}

function QuoteLineRow({ line, depth, roots, displayTotal, hasChildren, onSave, onDelete, onMove, onDragMove, onToggleCollapse, onMakeChild, toast, selectedProofIds, onToggleProofSelection, selectedLineIds, onToggleLineSelection }: { line: Line; depth: number; roots: Line[]; displayTotal: number; hasChildren: boolean; onSave: (line: Line) => void; onDelete: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onDragMove: (sourceId: string, targetId: string) => void; onToggleCollapse: (line: Line) => void; onMakeChild: (id: string, parentId: string | null) => void; toast: (message: string, variant?: 'success' | 'error' | 'info') => void; selectedProofIds: string[]; onToggleProofSelection: (proofId: string, selected: boolean) => void; selectedLineIds: string[]; onToggleLineSelection: (lineId: string, selected: boolean) => void }) {
  const [draft, setDraft] = useState<Line>(line);
  const [dirty, setDirty] = useState(false);
  const [showProofs, setShowProofs] = useState(false);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofEmail, setProofEmail] = useState('');
  const [sendingProofId, setSendingProofId] = useState('');
  const [proofState, setProofState] = useState<'NONE' | 'UNSENT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESEND_NEEDED'>('NONE');
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => onSave(draft), 700);
    return () => clearTimeout(t);
  }, [draft, dirty, onSave]);

  async function loadProofs() {
    const res = await fetch(`/api/proofs?lineType=QUOTE_LINE&lineId=${line.id}`);
    if (!res.ok) return;
    const nextProofs = (await res.json()) as Proof[];
    setProofs(nextProofs);

    if (nextProofs.length === 0) {
      setProofState('NONE');
      return;
    }

    const latest = [...nextProofs].sort((a, b) => b.version - a.version || +new Date(b.createdAt) - +new Date(a.createdAt))[0];
    const hasRejectedHistory = nextProofs.some((p) => p.status === 'REVISIONS_REQUESTED');

    if (!latest.lastRequest && hasRejectedHistory) setProofState('RESEND_NEEDED');
    else if (latest.status === 'REVISIONS_REQUESTED') setProofState('REJECTED');
    else if (latest.lastRequest && !latest.lastRequest.respondedAt) setProofState('PENDING');
    else if (!latest.lastRequest) setProofState('UNSENT');
    else if (latest.status === 'APPROVED') setProofState('APPROVED');
    else setProofState('UNSENT');
  }

  async function uploadProof() {
    if (!proofFile) return;
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(proofFile);
    });

    const res = await fetch('/api/proofs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineType: 'QUOTE_LINE', lineId: line.id, fileName: proofFile.name, mimeType: proofFile.type || 'application/octet-stream', base64Data }),
    });
    if (!res.ok) { toast('Failed to upload proof', 'error'); return; }
    setProofFile(null);
    toast('Proof uploaded', 'success');
    await loadProofs();
  }

  async function sendProofApproval(proofId: string) {
    if (!proofEmail.trim()) { toast('Enter recipient email first', 'error'); return; }
    setSendingProofId(proofId);
    const res = await fetch(`/api/proofs/${proofId}/send-approval`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientEmail: proofEmail.trim() }),
    });
    setSendingProofId('');
    if (!res.ok) { toast('Failed to send proof approval', 'error'); return; }
    toast('Proof approval email sent', 'success');
    await loadProofs();
  }

  useEffect(() => {
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.id]);

  useEffect(() => {
    if (!showProofs) return;
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProofs]);

  return (
    <>
    <tr className="border-t border-zinc-800" onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const sourceId = e.dataTransfer.getData('text/plain'); if (sourceId) onDragMove(sourceId, line.id); }}>
      <td className="p-3 align-top"><input type="checkbox" checked={selectedLineIds.includes(line.id)} onChange={(e) => onToggleLineSelection(line.id, e.target.checked)} /></td>
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
    {showProofs ? (
      <tr className="border-t border-zinc-800 bg-zinc-950/30">
        <td className="p-3" colSpan={8}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-zinc-300 md:col-span-2">Upload proof
              <div className="mt-1 flex gap-2">
                <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
                <button type="button" onClick={uploadProof} className="rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Upload</button>
              </div>
            </label>
            <label className="text-xs text-zinc-300">Approval email
              <input value={proofEmail} onChange={(e) => setProofEmail(e.target.value)} placeholder="customer@email.com" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
          </div>
          <div className="mt-2 space-y-2">
            {proofs.map((proof) => (
              <div key={proof.id} className="flex items-center justify-between gap-2 rounded border border-zinc-700 p-2 text-xs">
                <div>
                  <p className="font-medium">v{proof.version} • {proof.fileName}</p>
                  <p className="text-zinc-400">{proof.status}{proof.approvalNotes ? ` • ${proof.approvalNotes}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 text-[11px] text-zinc-300">
                    <input type="checkbox" checked={selectedProofIds.includes(proof.id)} onChange={(e) => onToggleProofSelection(proof.id, e.target.checked)} />
                    Select
                  </label>
                  <a href={`/api/proofs/file/${proof.id}`} target="_blank" rel="noreferrer" className="text-sky-300">Open</a>
                  <button type="button" onClick={() => sendProofApproval(proof.id)} disabled={sendingProofId === proof.id} className="rounded border border-zinc-600 px-2 py-1">{sendingProofId === proof.id ? 'Sending…' : 'Send'}</button>
                </div>
              </div>
            ))}
            {proofs.length === 0 ? <p className="text-xs text-zinc-400">No proofs uploaded yet for this line.</p> : null}
          </div>
        </td>
      </tr>
    ) : null}
  </>
  );
}
