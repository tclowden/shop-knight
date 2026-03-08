"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { StatusChip } from '@/components/status-chip';
import { useUnsavedGuard } from '@/components/use-unsaved-guard';
import { useToast } from '@/components/toast-provider';

type Product = { id: string; sku: string; name: string; salePrice: string | number };
type User = { id: string; name: string; type: string };
type SalesOrderStatus = { id: string; name: string };
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
type Line = { id: string; description: string; qty: number; unitPrice: string | number; productId?: string | null; sortOrder?: number; parentLineId?: string | null; collapsed?: boolean };
type SalesOrder = {
  opportunityId?: string;
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
  salesRepId?: string | null;
  projectManagerId?: string | null;
  designerId?: string | null;
  salesRep?: { name: string } | null;
  projectManager?: { name: string } | null;
  designer?: { name: string } | null;
  opportunity: { name: string; customer: { name: string } };
  lines: Line[];
};

const tabBase = 'inline-flex h-11 items-center border-b-2 px-2 text-sm font-medium';

export default function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { push } = useToast();
  const [id, setId] = useState('');
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<SalesOrderStatus[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityOption[]>([]);
  const [filterText, setFilterText] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);


  const [newProductId, setNewProductId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newUnitPrice, setNewUnitPrice] = useState('0');
  const [newTaxable, setNewTaxable] = useState(true);
  const [newUnitCost, setNewUnitCost] = useState('0.00');
  const [newGpmPercent, setNewGpmPercent] = useState('35');

  const [title, setTitle] = useState('');
  const [statusName, setStatusName] = useState('');
  const [primaryCustomerContact, setPrimaryCustomerContact] = useState('');
  const [customerInvoiceContact, setCustomerInvoiceContact] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingAttentionTo, setBillingAttentionTo] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAttentionTo, setShippingAttentionTo] = useState('');
  const [installAddress, setInstallAddress] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingTracking, setShippingTracking] = useState('');
  const [salesOrderDate, setSalesOrderDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [downPaymentType, setDownPaymentType] = useState('DOLLARS');
  const [downPaymentValue, setDownPaymentValue] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [opportunityId, setOpportunityId] = useState('');

  async function load(orderId: string) {
    const [soRes, pRes, usersRes, statusesRes, oppRes] = await Promise.all([
      fetch(`/api/sales-orders/${orderId}`),
      fetch('/api/admin/products'),
      fetch('/api/users'),
      fetch('/api/admin/sales-order-statuses'),
      fetch('/api/opportunities'),
    ]);
    if (soRes.ok) {
      const so = await soRes.json();
      setOrder(so);
      setTitle(so.title || '');
      setStatusName(so.status?.name || '');
      setPrimaryCustomerContact(so.primaryCustomerContact || '');
      setCustomerInvoiceContact(so.customerInvoiceContact || '');
      setBillingAddress(so.billingAddress || '');
      setBillingAttentionTo(so.billingAttentionTo || '');
      setShippingAddress(so.shippingAddress || '');
      setShippingAttentionTo(so.shippingAttentionTo || '');
      setInstallAddress(so.installAddress || '');
      setShippingMethod(so.shippingMethod || '');
      setShippingTracking(so.shippingTracking || '');
      setSalesOrderDate(so.salesOrderDate ? String(so.salesOrderDate).slice(0, 10) : '');
      setDueDate(so.dueDate ? String(so.dueDate).slice(0, 10) : '');
      setInstallDate(so.installDate ? String(so.installDate).slice(0, 10) : '');
      setShippingDate(so.shippingDate ? String(so.shippingDate).slice(0, 10) : '');
      setPaymentTerms(so.paymentTerms || '');
      setDownPaymentType(so.downPaymentType || 'DOLLARS');
      setDownPaymentValue(so.downPaymentValue ? String(so.downPaymentValue) : '');
      setSalesRepId(so.salesRepId || '');
      setProjectManagerId(so.projectManagerId || '');
      setDesignerId(so.designerId || '');
      setOpportunityId(so.opportunityId || '');
    }
    if (pRes.ok) setProducts(await pRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (statusesRes.ok) setStatuses(await statusesRes.json());
    if (oppRes.ok) setOpportunities(await oppRes.json());
  }

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    setSavingHeader(true);
    const res = await fetch(`/api/sales-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        statusName,
        primaryCustomerContact,
        customerInvoiceContact,
        billingAddress,
        billingAttentionTo,
        shippingAddress,
        shippingAttentionTo,
        installAddress,
        shippingMethod,
        shippingTracking,
        salesOrderDate: salesOrderDate || null,
        dueDate: dueDate || null,
        installDate: installDate || null,
        shippingDate: shippingDate || null,
        paymentTerms,
        downPaymentType,
        downPaymentValue,
        salesRepId: salesRepId || null,
        projectManagerId: projectManagerId || null,
        designerId: designerId || null,
        opportunityId: opportunityId || null,
      }),
    });
    if (res.ok) push('Sales order saved', 'success');
    else push('Failed to save sales order', 'error');
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
    await fetch(`/api/sales-orders/${id}/lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: newProductId || null, description: newDescription, qty: Number(newQty), unitPrice: Number(newUnitPrice), attributeValues: { _taxable: newTaxable ? 'true' : 'false', _unitCost: newUnitCost, _gpmPercent: newGpmPercent } }),
    });
    setNewProductId('');
    setNewDescription('');
    setNewQty('1');
    setNewUnitPrice('0');
    setNewTaxable(true);
    setNewUnitCost('0.00');
    setNewGpmPercent('35');
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
    for (const r of sortedRoots) {
      out.push({ line: r, depth: 0 });
      if (!r.collapsed) (childrenMap.get(r.id) || []).forEach((c) => out.push({ line: c, depth: 1 }));
    }
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

  const headerDirty = useMemo(() => {
    if (!order || !editingHeader) return false;
    return (
      title !== (order.title || '') ||
      statusName !== (order.status?.name || '') ||
      primaryCustomerContact !== (order.primaryCustomerContact || '') ||
      customerInvoiceContact !== (order.customerInvoiceContact || '') ||
      billingAddress !== (order.billingAddress || '') ||
      billingAttentionTo !== (order.billingAttentionTo || '') ||
      shippingAddress !== (order.shippingAddress || '') ||
      shippingAttentionTo !== (order.shippingAttentionTo || '') ||
      installAddress !== (order.installAddress || '') ||
      shippingMethod !== (order.shippingMethod || '') ||
      shippingTracking !== (order.shippingTracking || '') ||
      salesOrderDate !== (order.salesOrderDate ? String(order.salesOrderDate).slice(0, 10) : '') ||
      dueDate !== (order.dueDate ? String(order.dueDate).slice(0, 10) : '') ||
      installDate !== (order.installDate ? String(order.installDate).slice(0, 10) : '') ||
      shippingDate !== (order.shippingDate ? String(order.shippingDate).slice(0, 10) : '') ||
      paymentTerms !== (order.paymentTerms || '') ||
      downPaymentType !== (order.downPaymentType || 'DOLLARS') ||
      downPaymentValue !== (order.downPaymentValue ? String(order.downPaymentValue) : '') ||
      salesRepId !== (order.salesRepId || '') ||
      projectManagerId !== (order.projectManagerId || '') ||
      designerId !== (order.designerId || '') ||
      opportunityId !== (order.opportunityId || '')
    );
  }, [order, editingHeader, title, statusName, primaryCustomerContact, customerInvoiceContact, billingAddress, billingAttentionTo, shippingAddress, shippingAttentionTo, installAddress, shippingMethod, shippingTracking, salesOrderDate, dueDate, installDate, shippingDate, paymentTerms, downPaymentType, downPaymentValue, salesRepId, projectManagerId, designerId, opportunityId]);

  const sortedStatuses = useMemo(() => [...statuses].sort((a, b) => a.name.localeCompare(b.name)), [statuses]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedSalesReps = useMemo(() => [...users].filter((u) => ['SALES_REP', 'SALES', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedProjectManagers = useMemo(() => [...users].filter((u) => ['PROJECT_MANAGER', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedDesigners = useMemo(() => [...users].filter((u) => ['DESIGNER', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);

  useUnsavedGuard(headerDirty);

  useEffect(() => { params.then((p) => { setId(p.id); load(p.id); }); }, [params]);
  if (!order) return <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-700">Loading sales order…</main>;

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sales Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">{order.opportunity.name} • {order.opportunity.customer.name}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <StatusChip value={order.status?.name || 'Unknown'} />
        </div>
      </header>
      <Nav />

      <section className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <SummaryCell label="Customer" value={order.opportunity.customer.name} />
        <SummaryCell label="Status" value={order.status?.name || 'Unknown'} />
        <SummaryCell label="Assigned Team" value={[order.salesRep?.name, order.projectManager?.name, order.designer?.name].filter(Boolean).join(', ') || 'Unassigned'} />
        <SummaryCell label="Dates" value={`${order.salesOrderDate ? new Date(order.salesOrderDate).toLocaleDateString() : '—'} • Due ${order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '—'}`} />
      </section>

      <section className="mb-4 border-b border-slate-200">
        <div className="flex flex-wrap gap-4 text-slate-500">
          <button className={`${tabBase} border-sky-500 text-sky-600`}>Items ({order.lines.length})</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Purchasing (0)</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Tasks</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Assets</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Notes</button>
          <button className={`${tabBase} border-transparent hover:border-slate-300`}>Emails</button>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!editingHeader ? (
          <>
            <div className="mb-4 flex justify-end"><button onClick={() => setEditingHeader(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit order info</button></div>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <ReadField label="Title" value={order.title || '—'} />
              <ReadField label="Opportunity" value={order.opportunity.name} />
              <ReadField label="Status" value={order.status?.name || '—'} />
              <ReadField label="Primary Customer Contact" value={order.primaryCustomerContact || '—'} />
              <ReadField label="Customer Invoice Contact" value={order.customerInvoiceContact || '—'} />
              <ReadField label="Sales Order Date" value={order.salesOrderDate ? new Date(order.salesOrderDate).toLocaleDateString() : '—'} />
              <ReadField label="Due Date" value={order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '—'} />
              <ReadField label="Install Date" value={order.installDate ? new Date(order.installDate).toLocaleDateString() : '—'} />
              <ReadField label="Shipping Date" value={order.shippingDate ? new Date(order.shippingDate).toLocaleDateString() : '—'} />
              <ReadField label="Shipping Method" value={order.shippingMethod || '—'} />
              <ReadField label="Shipping Tracking" value={order.shippingTracking || '—'} />
              <ReadField label="Payment Terms" value={order.paymentTerms || '—'} />
              <ReadField label="Down Payment" value={order.downPaymentValue ? `${order.downPaymentValue} ${order.downPaymentType === 'PERCENT' ? '%' : '$'}` : '—'} />
              <ReadField label="Sales Rep" value={order.salesRep?.name || '—'} />
              <ReadField label="Project Manager" value={order.projectManager?.name || '—'} />
              <ReadField label="Designer" value={order.designer?.name || '—'} />
              <ReadField label="Billing Attention To" value={order.billingAttentionTo || '—'} />
              <ReadField label="Shipping Attention To" value={order.shippingAttentionTo || '—'} />
              <div className="md:col-span-2"><ReadField label="Billing Address" value={order.billingAddress || '—'} /></div>
              <div className="md:col-span-2"><ReadField label="Shipping Address" value={order.shippingAddress || '—'} /></div>
              <div className="md:col-span-2"><ReadField label="Install Address" value={order.installAddress || '—'} /></div>
            </div>
          </>
        ) : (
          <form onSubmit={saveHeader} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="field" /></FormField>
            <FormField label="Opportunity"><select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="field"><option value="">Select opportunity</option>{opportunities.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.customer}</option>)}</select></FormField>
            <FormField label="Status"><select value={statusName} onChange={(e) => setStatusName(e.target.value)} className="field"><option value="">Status</option>{sortedStatuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></FormField>
            <FormField label="Primary Customer Contact"><input value={primaryCustomerContact} onChange={(e) => setPrimaryCustomerContact(e.target.value)} className="field" /></FormField>
            <FormField label="Customer Invoice Contact"><input value={customerInvoiceContact} onChange={(e) => setCustomerInvoiceContact(e.target.value)} className="field" /></FormField>
            <FormField label="Sales Order Date"><input type="date" value={salesOrderDate} onChange={(e) => setSalesOrderDate(e.target.value)} className="field" /></FormField>
            <FormField label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field" /></FormField>
            <FormField label="Install Date"><input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="field" /></FormField>
            <FormField label="Shipping Date"><input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} className="field" /></FormField>
            <FormField label="Shipping Method"><input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="field" /></FormField>
            <FormField label="Shipping Tracking"><input value={shippingTracking} onChange={(e) => setShippingTracking(e.target.value)} className="field" /></FormField>
            <FormField label="Payment Terms"><input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="field" /></FormField>
            <FormField label="Down Payment">
              <div className="grid grid-cols-2 gap-2">
                <select value={downPaymentType} onChange={(e) => setDownPaymentType(e.target.value)} className="field"><option value="DOLLARS">$</option><option value="PERCENT">%</option></select>
                <input value={downPaymentValue} onChange={(e) => setDownPaymentValue(e.target.value)} type="number" step="0.01" min="0" className="field" />
              </div>
            </FormField>
            <FormField label="Sales Rep"><select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="field"><option value="">Unassigned</option>{sortedSalesReps.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
            <FormField label="Project Manager"><select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className="field"><option value="">Unassigned</option>{sortedProjectManagers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
            <FormField label="Designer"><select value={designerId} onChange={(e) => setDesignerId(e.target.value)} className="field"><option value="">Unassigned</option>{sortedDesigners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></FormField>
            <FormField label="Billing Attention To"><input value={billingAttentionTo} onChange={(e) => setBillingAttentionTo(e.target.value)} className="field" /></FormField>
            <FormField label="Shipping Attention To"><input value={shippingAttentionTo} onChange={(e) => setShippingAttentionTo(e.target.value)} className="field" /></FormField>
            <div className="md:col-span-2"><AddressAutocomplete label="Billing Address" value={billingAddress} onChange={setBillingAddress} /></div>
            <div className="md:col-span-2"><AddressAutocomplete label="Shipping Address" value={shippingAddress} onChange={setShippingAddress} /></div>
            <div className="md:col-span-2"><AddressAutocomplete label="Install Address" value={installAddress} onChange={setInstallAddress} /></div>
            <div className="md:col-span-2 flex gap-2 pt-2">
              <button disabled={savingHeader} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{savingHeader ? 'Saving…' : 'Save Header'}</button>
              <button type="button" onClick={() => { setEditingHeader(false); load(id); }} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Add Line Item</h2>
        <form onSubmit={addLine} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <FormFieldSmall label="Product">
              <select value={newProductId} onChange={(e) => { const pid = e.target.value; setNewProductId(pid); const p = products.find((x) => x.id === pid); if (p) { setNewDescription(p.name); setNewUnitPrice(String(p.salePrice)); } }} className="field">
                <option value="">Custom / no product</option>{sortedProducts.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
              </select>
            </FormFieldSmall>
            <FormFieldSmall label="Description"><input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="field" required /></FormFieldSmall>
            <FormFieldSmall label="Quantity"><input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="1" className="field" required /></FormFieldSmall>
            <FormFieldSmall label="Unit Price"><input value={newUnitPrice} onChange={(e) => setNewUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="field" required /></FormFieldSmall>
            <FormFieldSmall label="Taxable"><span className="field flex items-center"><input type="checkbox" checked={newTaxable} onChange={(e) => setNewTaxable(e.target.checked)} /></span></FormFieldSmall>
            <div className="flex items-end"><button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">+ Add Line</button></div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FormFieldSmall label="Unit Cost"><input value={newUnitCost} onChange={(e) => { const v = e.target.value; setNewUnitCost(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(v, newGpmPercent)); }} type="number" min="0" step="0.01" className="field" /></FormFieldSmall>
            <FormFieldSmall label="GPM %"><input value={newGpmPercent} onChange={(e) => { const v = e.target.value; setNewGpmPercent(v); setNewUnitPrice(calculateUnitPriceFromCostGpm(newUnitCost, v)); }} type="number" min="0" max="99.99" step="0.01" className="field" /></FormFieldSmall>
            <FormFieldSmall label="Extended Price"><input value={(Number(newQty || 0) * Number(newUnitPrice || 0)).toFixed(2)} disabled className="field bg-slate-100" /></FormFieldSmall>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Filter lines..." className="field max-w-md" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Drag</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 font-semibold">Qty</th><th className="px-4 py-3 font-semibold">Unit Price</th><th className="px-4 py-3 font-semibold">Line Total</th><th className="px-4 py-3 font-semibold">Actions</th></tr></thead>
            <tbody>
              {visibleLines.map(({ line, depth }) => (
                <SalesOrderLineRow
                  key={`${line.id}-${line.description}-${line.qty}-${line.unitPrice}-${line.parentLineId ?? ''}-${line.collapsed ? '1' : '0'}`}
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
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sticky bottom-2 mt-4 ml-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 text-sm shadow">
        <p className="flex justify-between text-lg font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></p>
      </div>

      <ModuleNotesTasks entityType="SALES_ORDER" entityId={id} />
    </main>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block text-sm text-slate-800">{value}</span>
    </p>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function FormFieldSmall({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SalesOrderLineRow({ line, depth, roots, displayTotal, hasChildren, onSave, onDelete, onMove, onDragMove, onToggleCollapse, onMakeChild, toast }: { line: Line; depth: number; roots: Line[]; displayTotal: number; hasChildren: boolean; onSave: (line: Line) => void; onDelete: (id: string) => void; onMove: (id: string, dir: -1 | 1) => void; onDragMove: (sourceId: string, targetId: string) => void; onToggleCollapse: (line: Line) => void; onMakeChild: (id: string, parentId: string | null) => void; toast: (message: string, variant?: 'success' | 'error' | 'info') => void }) {
  const [draft, setDraft] = useState<Line>(line);
  const [dirty, setDirty] = useState(false);
  const [showProofs, setShowProofs] = useState(false);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofEmail, setProofEmail] = useState('');
  const [sendingProofId, setSendingProofId] = useState('');

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => onSave(draft), 700);
    return () => clearTimeout(t);
  }, [draft, dirty, onSave]);

  async function loadProofs() {
    const res = await fetch(`/api/proofs?lineType=SALES_ORDER_LINE&lineId=${line.id}`);
    if (!res.ok) return;
    setProofs(await res.json());
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
      body: JSON.stringify({ lineType: 'SALES_ORDER_LINE', lineId: line.id, fileName: proofFile.name, mimeType: proofFile.type || 'application/octet-stream', base64Data }),
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
    if (!showProofs) return;
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProofs]);

  return (
    <>
    <tr className="border-t border-slate-100" onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const sourceId = e.dataTransfer.getData('text/plain'); if (sourceId) onDragMove(sourceId, line.id); }}>
      <td className="px-4 py-4 align-top">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', line.id);
          }}
          className="inline-flex cursor-grab select-none rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-500"
          title="Drag to reorder"
        >
          ⋮⋮
        </span>
      </td>
      <td className="px-4 py-4">
        <div style={{ paddingLeft: `${depth * 22}px` }} className="flex items-center gap-2">
          {depth === 0 ? <button onClick={() => onToggleCollapse(line)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">{line.collapsed ? '+' : '-'}</button> : <span className="text-slate-400">↳</span>}
          <input value={draft.description} onChange={(e) => { setDirty(true); setDraft({ ...draft, description: e.target.value }); }} className="field w-full" />
        </div>
      </td>
      <td className="px-4 py-4"><input value={draft.qty} onChange={(e) => { setDirty(true); setDraft({ ...draft, qty: Number(e.target.value) }); }} type="number" min="1" className="field w-24" /></td>
      <td className="px-4 py-4"><input value={draft.unitPrice} onChange={(e) => { setDirty(true); setDraft({ ...draft, unitPrice: Number(e.target.value) }); }} type="number" min="0" step="0.01" className="field w-32" /></td>
      <td className="px-4 py-4 font-medium text-slate-700">${displayTotal.toFixed(2)}{hasChildren ? ' (rollup)' : ''}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-1">
          <button onClick={() => onSave(draft)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">Save</button>
          <button onClick={() => onDelete(line.id)} className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100">Delete</button>
          <button onClick={() => onMove(line.id, -1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">↑</button>
          <button onClick={() => onMove(line.id, 1)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">↓</button>
          <button onClick={() => setShowProofs((v) => !v)} className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700">{showProofs ? 'Hide Proofs' : 'Proofs'}</button>
          <select value={line.parentLineId || ''} onChange={(e) => onMakeChild(line.id, e.target.value || null)} className="field h-8 w-40 text-xs">
            <option value="">Top level</option>
            {roots.filter((r) => r.id !== line.id).map((r) => <option key={r.id} value={r.id}>{r.description}</option>)}
          </select>
        </div>
      </td>
    </tr>
    {showProofs ? (
      <tr className="border-t border-slate-100 bg-slate-50/60">
        <td className="px-4 py-3" colSpan={6}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-slate-600 md:col-span-2">Upload proof
              <div className="mt-1 flex gap-2">
                <input type="file" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="field" />
                <button type="button" onClick={uploadProof} className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white">Upload</button>
              </div>
            </label>
            <label className="text-xs text-slate-600">Approval email
              <input value={proofEmail} onChange={(e) => setProofEmail(e.target.value)} placeholder="customer@email.com" className="field mt-1" />
            </label>
          </div>
          <div className="mt-2 space-y-2">
            {proofs.map((proof) => (
              <div key={proof.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs">
                <div>
                  <p className="font-medium">v{proof.version} • {proof.fileName}</p>
                  <p className="text-slate-500">{proof.status}{proof.approvalNotes ? ` • ${proof.approvalNotes}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/api/proofs/file/${proof.id}`} target="_blank" rel="noreferrer" className="text-sky-700">Open</a>
                  <button type="button" onClick={() => sendProofApproval(proof.id)} disabled={sendingProofId === proof.id} className="rounded-md border border-slate-300 bg-white px-2 py-1">{sendingProofId === proof.id ? 'Sending…' : 'Send'}</button>
                </div>
              </div>
            ))}
            {proofs.length === 0 ? <p className="text-xs text-slate-500">No proofs uploaded yet for this line.</p> : null}
          </div>
        </td>
      </tr>
    ) : null}
  </>
  );
}
