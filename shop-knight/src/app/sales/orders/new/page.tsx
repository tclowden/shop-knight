"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { buildPricingVars, computeUnitPrice } from '@/lib/pricing';

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  customerId: string;
  customerAdditionalFeePercent?: string | number | null;
  salesRepId?: string | null;
  projectManagerId?: string | null;
};
type Quote = {
  id: string;
  quoteNumber: string;
  opportunityId: string;
  opportunity: string;
  customer: string;
  salesRepId?: string | null;
  projectManagerId?: string | null;
};
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

  function applyOpportunityDefaults(nextOpportunityId: string, opportunitiesList: Opportunity[], customerList: Customer[]) {
    const opp = opportunitiesList.find((o) => o.id === nextOpportunityId);
    if (!opp) return;
    const c = customerList.find((x) => x.id === opp.customerId);
    setPaymentTerms(c?.paymentTerms || '');
    setSalesRepId(opp.salesRepId || '');
    setProjectManagerId(opp.projectManagerId || '');
  }

  function applyQuoteDefaults(nextQuoteId: string, quoteList: Quote[], opportunitiesList: Opportunity[], customerList: Customer[]) {
    const quote = quoteList.find((q) => q.id === nextQuoteId);
    if (!quote) return;

    setOpportunityId(quote.opportunityId);
    setSalesRepId(quote.salesRepId || '');
    setProjectManagerId(quote.projectManagerId || '');

    const opp = opportunitiesList.find((o) => o.id === quote.opportunityId);
    const c = customerList.find((x) => x.id === opp?.customerId);
    setPaymentTerms(c?.paymentTerms || '');
  }

  async function load() {
    const [oppRes, quoteRes, productRes, usersRes, statusRes, customersRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/quotes'),
      fetch('/api/admin/products'),
      fetch('/api/users'),
      fetch('/api/admin/sales-order-statuses'),
      fetch('/api/customers'),
    ]);

    const oppItems = oppRes.ok ? await oppRes.json() : [];
    const quoteItems = quoteRes.ok ? await quoteRes.json() : [];
    const productItems = productRes.ok ? await productRes.json() : [];
    const usersItems = usersRes.ok ? await usersRes.json() : [];
    const statusItems = statusRes.ok ? await statusRes.json() : [];
    const customerItems = customersRes.ok ? await customersRes.json() : [];

    setOpportunities(Array.isArray(oppItems) ? oppItems : []);
    setQuotes(Array.isArray(quoteItems) ? quoteItems : []);
    setProducts(Array.isArray(productItems) ? productItems : []);
    setUsers(Array.isArray(usersItems) ? usersItems : []);
    setStatuses(Array.isArray(statusItems) ? statusItems : []);
    setCustomers(Array.isArray(customerItems) ? customerItems : []);
    setOpportunityId('');
    if (Array.isArray(statusItems) && statusItems.length > 0) {
      const newStatus = statusItems.find((s: SalesOrderStatus) => String(s.name).toLowerCase() === 'new');
      setStatus(newStatus?.name || statusItems[0].name);
    } else {
      setStatus('New');
    }
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
    const baseGpm = Number(gpmPercent || 0);
    const selectedOpp = opportunities.find((o) => o.id === opportunityId);
    const additionalFee = Number(selectedOpp?.customerAdditionalFeePercent || 0);
    const effectiveGpm = (baseGpm + additionalFee) / 100;
    if (!Number.isFinite(cost) || !Number.isFinite(effectiveGpm) || effectiveGpm >= 1) return '0.00';
    return (cost / (1 - effectiveGpm)).toFixed(2);
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

  useEffect(() => {
    setLineUnitPrice(calculateUnitPriceFromCostGpm(lineUnitCost, lineGpmPercent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityId]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">New Sales Order</h1>
      <p className="text-sm text-zinc-400">Create a detailed sales order.</p>
      <Nav />

      <form onSubmit={createOrder} className="space-y-3 rounded border border-zinc-800 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="Order Number (leave blank to auto-generate)"><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="field" placeholder="Auto" /></FormField>
          <FormField label="Sales Order Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="field" /></FormField>

          <FormField label="Opportunity">
            <select value={opportunityId} onChange={(e) => {
              const nextId = e.target.value;
              setOpportunityId(nextId);
              setSourceQuoteId('');
              applyOpportunityDefaults(nextId, opportunities, customers);
            }} className="field">
              <option value="">None (Unassigned)</option>
              {sortedOpportunities.map((opp) => <option key={opp.id} value={opp.id}>{opp.name} — {opp.customer}</option>)}
            </select>
          </FormField>

          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="field">
              {sortedStatuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </FormField>

          <FormField label="Source Quote (optional)">
            <select value={sourceQuoteId} onChange={(e) => {
              const nextQuoteId = e.target.value;
              setSourceQuoteId(nextQuoteId);
              if (nextQuoteId) applyQuoteDefaults(nextQuoteId, quotes, opportunities, customers);
            }} className="field">
              <option value="">None</option>
              {sortedQuotes.map((q) => <option key={q.id} value={q.id}>{q.quoteNumber} — {q.customer}</option>)}
            </select>
          </FormField>

          <FormField label="Primary Customer Contact"><input value={primaryCustomerContact} onChange={(e) => setPrimaryCustomerContact(e.target.value)} className="field" /></FormField>
          <FormField label="Customer Invoice Contact"><input value={customerInvoiceContact} onChange={(e) => setCustomerInvoiceContact(e.target.value)} className="field" /></FormField>
          <FormField label="Billing Attention To"><input value={billingAttentionTo} onChange={(e) => setBillingAttentionTo(e.target.value)} className="field" /></FormField>
          <FormField label="Shipping Attention To"><input value={shippingAttentionTo} onChange={(e) => setShippingAttentionTo(e.target.value)} className="field" /></FormField>
          <FormField label="Shipping Method"><input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="field" /></FormField>
          <FormField label="Shipping Tracking"><input value={shippingTracking} onChange={(e) => setShippingTracking(e.target.value)} className="field" /></FormField>

          <FormField label="Sales Order Date"><input type="date" value={salesOrderDate} onChange={(e) => setSalesOrderDate(e.target.value)} className="field" /></FormField>
          <FormField label="Due Date"><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field" /></FormField>
          <FormField label="Install Date"><input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} className="field" /></FormField>
          <FormField label="Shipping Date"><input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} className="field" /></FormField>

          <FormField label="Payment Terms"><input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="field" /></FormField>
          <FormField label="Down Payment">
            <div className="grid grid-cols-2 gap-2">
              <select value={downPaymentType} onChange={(e) => setDownPaymentType(e.target.value as 'DOLLARS' | 'PERCENT')} className="field">
                <option value="DOLLARS">$</option>
                <option value="PERCENT">%</option>
              </select>
              <input value={downPaymentValue} onChange={(e) => setDownPaymentValue(e.target.value)} type="number" min="0" step="0.01" className="field" />
            </div>
          </FormField>

          <FormField label="Sales Rep">
            <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="field">
              <option value="">Unassigned</option>
              {sortedSalesReps.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
          <FormField label="Project Manager">
            <select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className="field">
              <option value="">Unassigned</option>
              {sortedProjectManagers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>
          <FormField label="Designer">
            <select value={designerId} onChange={(e) => setDesignerId(e.target.value)} className="field">
              <option value="">Unassigned</option>
              {sortedDesigners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </FormField>

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
            <label className="text-xs text-zinc-300">Unit Cost
              <input value={lineUnitCost} onChange={(e) => { const v = e.target.value; setLineUnitCost(v); setLineUnitPrice(calculateUnitPriceFromCostGpm(v, lineGpmPercent)); }} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">Taxable
              <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900"><input type="checkbox" checked={lineTaxable} onChange={(e) => setLineTaxable(e.target.checked)} /></span>
            </label>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-zinc-300">Unit Price
              <input value={lineUnitPrice} onChange={(e) => setLineUnitPrice(e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            </label>
            <label className="text-xs text-zinc-300">GPM %
              <input value={lineGpmPercent} onChange={(e) => { const v = e.target.value; setLineGpmPercent(v); setLineUnitPrice(calculateUnitPriceFromCostGpm(lineUnitCost, v)); }} type="number" min="0" max="99.99" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
              <span className="mt-1 block text-[11px] text-zinc-500">+ Fee {(Number(opportunities.find((o) => o.id === opportunityId)?.customerAdditionalFeePercent || 0)).toFixed(2)}%</span>
            </label>
            <label className="text-xs text-zinc-300">Extended Price
              <input value={(Number(lineQty || 0) * Number(lineUnitPrice || 0)).toFixed(2)} disabled className="mt-1 w-full rounded border border-zinc-700 bg-zinc-100 p-2 text-zinc-700" />
            </label>
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
                    ) : attr.inputType === 'BOOLEAN' ? (
                      <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900">
                        <input
                          type="checkbox"
                          checked={(lineAttributeValues[attr.code] || '').toLowerCase() === 'true'}
                          onChange={(e) => {
                            const next = { ...lineAttributeValues, [attr.code]: e.target.checked ? 'true' : 'false' };
                            setLineAttributeValues(next);
                            recalcLinePrice(lineProductId, lineQty, next);
                          }}
                        />
                      </span>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
