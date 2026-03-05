"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { buildPricingVars, computeUnitPrice } from '@/lib/pricing';

type Opportunity = { id: string; name: string; customer: string; customerId: string };
type Quote = { id: string; quoteNumber: string; opportunity: string; customer: string };
type ProductAttribute = { id: string; code: string; name: string; inputType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'; defaultValue: string | null; options: string[] | null };
type Product = { id: string; sku: string; name: string; category?: string | null; salePrice: string | number; pricingFormula?: string | null; attributes?: ProductAttribute[] };
type User = { id: string; name: string; type: string };
type SalesOrderStatus = { id: string; name: string; active: boolean; sortOrder: number };
type Customer = { id: string; name: string; paymentTerms?: string | null };

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<SalesOrderStatus[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [orderNumber, setOrderNumber] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [sourceQuoteId, setSourceQuoteId] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('New');
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
  const [downPaymentType, setDownPaymentType] = useState<'DOLLARS' | 'PERCENT'>('DOLLARS');
  const [downPaymentValue, setDownPaymentValue] = useState('0');
  const [salesRepId, setSalesRepId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [designerId, setDesignerId] = useState('');

  const [lineProductId, setLineProductId] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [lineUnitPrice, setLineUnitPrice] = useState('0.00');
  const [lineTaxable, setLineTaxable] = useState(true);
  const [lineUnitCost, setLineUnitCost] = useState('0.00');
  const [lineGpmPercent, setLineGpmPercent] = useState('35');
  const [lineAttributeValues, setLineAttributeValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const sortedOpportunities = useMemo(() => [...opportunities].sort((a, b) => a.name.localeCompare(b.name)), [opportunities]);
  const sortedQuotes = useMemo(() => [...quotes].sort((a, b) => a.quoteNumber.localeCompare(b.quoteNumber)), [quotes]);
  const sortedStatuses = useMemo(() => [...statuses].sort((a, b) => a.name.localeCompare(b.name)), [statuses]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedSalesReps = useMemo(() => [...users].filter((u) => ['SALES_REP', 'SALES', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedProjectManagers = useMemo(() => [...users].filter((u) => ['PROJECT_MANAGER', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedDesigners = useMemo(() => [...users].filter((u) => ['DESIGNER', 'ADMIN'].includes(u.type)).sort((a, b) => a.name.localeCompare(b.name)), [users]);


  async function load() {
    const [oppRes, quoteRes, productRes, usersRes, statusRes, customersRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/quotes'),
      fetch('/api/admin/products'),
      fetch('/api/users'),
      fetch('/api/admin/sales-order-statuses'),
      fetch('/api/customers'),
    ]);

    const oppItems = await oppRes.json();
    const quoteItems = await quoteRes.json();
    const productItems = await productRes.json();
    const usersItems = await usersRes.json();
    const statusItems = await statusRes.json();
    const customerItems = await customersRes.json();

    setOpportunities(oppItems);
    setQuotes(quoteItems);
    setProducts(productItems);
    setUsers(usersItems);
    setStatuses(statusItems);
    setCustomers(customerItems);
    if (oppItems.length > 0) {
      setOpportunityId(oppItems[0].id);
      const c = customerItems.find((x: Customer) => x.id === oppItems[0].customerId);
      setPaymentTerms(c?.paymentTerms || '');
    }
    if (statusItems.length > 0) setStatus(statusItems[0].name);
  }

  function recalcLinePrice(productId: string, qty: string, attrs: Record<string, string>) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const basePrice = Number(p.salePrice || 0);
    const vars = buildPricingVars(Number(qty || 1), basePrice, attrs);
    setLineUnitPrice(String(computeUnitPrice(basePrice, p.pricingFormula, vars)));
  }

  function calculateUnitPriceFromCostGpm(unitCost: string, gpmPercent: string) {
    const cost = Number(unitCost || 0);
    const gpm = Number(gpmPercent || 0) / 100;
    if (!Number.isFinite(cost) || !Number.isFinite(gpm) || gpm >= 1) return '0.00';
    return (cost / (1 - gpm)).toFixed(2);
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
        title,
        status,
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
        initialLine: lineDescription
          ? {
              productId: lineProductId || null,
              description: lineDescription,
              qty: Number(lineQty || 1),
              unitPrice: Number(lineUnitPrice || 0),
              attributeValues: { ...lineAttributeValues, _taxable: lineTaxable ? 'true' : 'false', _unitCost: lineUnitCost, _gpmPercent: lineGpmPercent },
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
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">New Sales Order</h1>
      <p className="text-sm text-zinc-400">Create a detailed sales order.</p>
      <Nav />

      <form onSubmit={createOrder} className="space-y-3 rounded border border-zinc-800 p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Order Number" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sales Order Title" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <select value={opportunityId} onChange={(e) => {
            const nextId = e.target.value;
            setOpportunityId(nextId);
            const opp = opportunities.find((o) => o.id === nextId);
            const c = customers.find((x) => x.id === opp?.customerId);
            setPaymentTerms(c?.paymentTerms || '');
          }} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required>
            {sortedOpportunities.map((opp) => <option key={opp.id} value={opp.id}>{opp.name} — {opp.customer}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            {sortedStatuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={sourceQuoteId} onChange={(e) => setSourceQuoteId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <option value="">Source Quote (optional)</option>
            {sortedQuotes.map((q) => <option key={q.id} value={q.id}>{q.quoteNumber} — {q.customer}</option>)}
          </select>
          <input value={primaryCustomerContact} onChange={(e) => setPrimaryCustomerContact(e.target.value)} placeholder="Primary Customer Contact" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={customerInvoiceContact} onChange={(e) => setCustomerInvoiceContact(e.target.value)} placeholder="Customer Invoice Contact" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={billingAttentionTo} onChange={(e) => setBillingAttentionTo(e.target.value)} placeholder="Billing Attention To" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={shippingAttentionTo} onChange={(e) => setShippingAttentionTo(e.target.value)} placeholder="Shipping Attention To" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} placeholder="Shipping Method" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={shippingTracking} onChange={(e) => setShippingTracking(e.target.value)} placeholder="Shipping Tracking" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input type="date" value={salesOrderDate} onChange={(e) => setSalesOrderDate(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Payment Terms" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <div className="grid grid-cols-2 gap-2">
            <select value={downPaymentType} onChange={(e) => setDownPaymentType(e.target.value as 'DOLLARS' | 'PERCENT')} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="DOLLARS">Down Payment ($)</option>
              <option value="PERCENT">Down Payment (%)</option>
            </select>
            <input value={downPaymentValue} onChange={(e) => setDownPaymentValue(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </div>
          <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <option value="">Sales Rep</option>
            {sortedSalesReps.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <option value="">Project Manager</option>
            {sortedProjectManagers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={designerId} onChange={(e) => setDesignerId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <option value="">Designer</option>
            {sortedDesigners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <AddressAutocomplete label="Billing Address" value={billingAddress} onChange={setBillingAddress} />
          <AddressAutocomplete label="Shipping Address" value={shippingAddress} onChange={setShippingAddress} />
          <AddressAutocomplete label="Install Address" value={installAddress} onChange={setInstallAddress} />
        </div>

        <div className="rounded border border-zinc-700 p-3">
          <h2 className="mb-2 font-medium">Initial Line Item (optional)</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            <label className="text-xs text-zinc-300">Product
              <select value={lineProductId} onChange={(e) => { const productId = e.target.value; setLineProductId(productId); const p = products.find((x) => x.id === productId); if (p) { setLineDescription(p.name); const defaults = Object.fromEntries((p.attributes || []).map((a) => [a.code, a.defaultValue || ''])); setLineAttributeValues(defaults); recalcLinePrice(productId, lineQty, defaults); } }} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                <option value="">Custom / no product</option>
                {sortedProducts.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-zinc-300">Description
              <input value={lineDescription} onChange={(e) => setLineDescription(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">Quantity
              <input value={lineQty} onChange={(e) => { const q = e.target.value; setLineQty(q); recalcLinePrice(lineProductId, q, lineAttributeValues); }} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">Unit Price
              <input value={lineUnitPrice} onChange={(e) => setLineUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">Taxable
              <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900"><input type="checkbox" checked={lineTaxable} onChange={(e) => setLineTaxable(e.target.checked)} /></span>
            </label>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-zinc-300">Unit Cost
              <input value={lineUnitCost} onChange={(e) => { const v = e.target.value; setLineUnitCost(v); setLineUnitPrice(calculateUnitPriceFromCostGpm(v, lineGpmPercent)); }} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">GPM %
              <input value={lineGpmPercent} onChange={(e) => { const v = e.target.value; setLineGpmPercent(v); setLineUnitPrice(calculateUnitPriceFromCostGpm(lineUnitCost, v)); }} type="number" min="0" max="99.99" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">Extended Price
              <input value={(Number(lineQty || 0) * Number(lineUnitPrice || 0)).toFixed(2)} disabled className="mt-1 w-full rounded border border-zinc-700 bg-zinc-100 p-2 text-zinc-700" />
            </label>
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="rounded bg-blue-600 px-4 py-2">Create Sales Order</button>
      </form>
    </main>
  );
}
