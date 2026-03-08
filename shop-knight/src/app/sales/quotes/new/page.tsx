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
  salesRepId?: string | null;
  projectManagerId?: string | null;
};
type User = { id: string; name: string; type: string };

type ProductAttribute = { id: string; code: string; name: string; inputType: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN'; defaultValue: string | null; options: string[] | null };
type Product = { id: string; sku: string; name: string; category?: string | null; salePrice: string | number; pricingFormula?: string | null; attributes?: ProductAttribute[] };

type LineItem = {
  productId: string;
  name: string;
  description: string;
  quantity: string;
  priceInDollars: string;
  taxable: boolean;
  unitCost: string;
  gpmPercent: string;
  attributeValues: Record<string, string>;
};

export default function NewQuotePage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [opportunityId, setOpportunityId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [txnDate, setTxnDate] = useState('');
  const [quoteDate, setQuoteDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [customerContactRole, setCustomerContactRole] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingAttentionTo, setBillingAttentionTo] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAttentionTo, setShippingAttentionTo] = useState('');
  const [installAddress, setInstallAddress] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [customerPoNumber, setCustomerPoNumber] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: '', name: '', description: '', quantity: '1', priceInDollars: '0.00', taxable: true, unitCost: '0.00', gpmPercent: '35', attributeValues: {} },
  ]);
  const [error, setError] = useState('');

  const sortedOpportunities = useMemo(() => [...opportunities].sort((a, b) => a.name.localeCompare(b.name)), [opportunities]);
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const sortedSalesReps = useMemo(() => [...users].filter((u) => u.type === 'SALES_REP' || u.type === 'SALES' || u.type === 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedProjectManagers = useMemo(() => [...users].filter((u) => u.type === 'PROJECT_MANAGER' || u.type === 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)), [users]);

  async function load() {
    const [oppRes, productRes, usersRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/admin/products'),
      fetch('/api/users'),
    ]);
    const oppData = await oppRes.json();
    const productData = await productRes.json();
    const usersData = await usersRes.json();
    setOpportunities(oppData);
    setProducts(productData);
    setUsers(usersData);

    const requestedOpportunityId = new URLSearchParams(window.location.search).get('opportunityId');
    const exists = requestedOpportunityId ? oppData.some((o: Opportunity) => o.id === requestedOpportunityId) : false;
    if (requestedOpportunityId && exists) setOpportunityId(requestedOpportunityId);
    else setOpportunityId('');
  }

  function recalcLinePrice(line: LineItem) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) return line;
    const basePrice = Number(product.salePrice || 0);
    const qty = Number(line.quantity || 1);
    const vars = buildPricingVars(qty, basePrice, line.attributeValues);
    const computed = computeUnitPrice(basePrice, product.pricingFormula, vars);
    return { ...line, priceInDollars: String(computed) };
  }

  function updateLine(index: number, key: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((l, i) => (i === index ? recalcLinePrice({ ...l, [key]: value }) : l)));
  }

  function updateLineAttribute(index: number, code: string, value: string) {
    setLineItems((prev) =>
      prev.map((l, i) =>
        i === index ? recalcLinePrice({ ...l, attributeValues: { ...l.attributeValues, [code]: value } }) : l
      )
    );
  }

  function calculateUnitPriceFromCostGpm(unitCost: string, gpmPercent: string) {
    const cost = Number(unitCost || 0);
    const gpm = Number(gpmPercent || 0) / 100;
    if (!Number.isFinite(cost) || !Number.isFinite(gpm) || gpm >= 1) return '0.00';
    const unitPrice = cost / (1 - gpm);
    return unitPrice.toFixed(2);
  }

  function updateLineCostGpm(index: number, key: 'unitCost' | 'gpmPercent', value: string) {
    setLineItems((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, [key]: value };
        return { ...next, priceInDollars: calculateUnitPriceFromCostGpm(next.unitCost, next.gpmPercent) };
      })
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, { productId: '', name: '', description: '', quantity: '1', priceInDollars: '0.00', taxable: true, unitCost: '0.00', gpmPercent: '35', attributeValues: {} }]);
  }

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setError('');

    const normalized = lineItems.map((l) => {
      const qty = Number(l.quantity || 0);
      const price = Number(l.priceInDollars || 0);
      const taxRate = l.taxable ? 0.075 : 0;
      const totalPriceInDollars = qty * price;
      const totalTaxInDollars = totalPriceInDollars * taxRate;
      return {
        productId: l.productId || null,
        attributeValues: l.attributeValues,
        name: l.name,
        description: l.description || l.name,
        quantity: qty,
        priceInDollars: price,
        totalPriceInDollars,
        totalTaxInDollars,
        taxRate,
        taxable: l.taxable,
      };
    });

    const subtotal = normalized.reduce((sum, l) => sum + Number(l.totalPriceInDollars || 0), 0);
    const tax = normalized.reduce((sum, l) => sum + Number(l.totalTaxInDollars || 0), 0);

    const payload = {
      active: true,
      title,
      description,
      txnDate: txnDate || null,
      quoteDate: quoteDate || null,
      dueDate: dueDate || null,

      customerContactRole: customerContactRole || null,
      billingAddress: billingAddress || null,
      billingAttentionTo: billingAttentionTo || null,
      shippingAddress: shippingAddress || null,
      shippingAttentionTo: shippingAttentionTo || null,
      installAddress: installAddress || null,
      salesRepId: salesRepId || null,
      projectManagerId: projectManagerId || null,
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

  useEffect(() => {
    if (!opportunityId || opportunities.length === 0) return;
    const selected = opportunities.find((o) => o.id === opportunityId);
    if (!selected) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSalesRepId(selected.salesRepId || '');
    setProjectManagerId(selected.projectManagerId || '');
  }, [opportunityId, opportunities]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">New Quote</h1>
      <p className="text-sm text-zinc-400">Quote fields now follow your current system structure.</p>
      <Nav />

      <form onSubmit={submitQuote} className="space-y-4 rounded border border-zinc-800 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Opportunity</span>
            <select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">None (Unassigned)</option>
              {sortedOpportunities.map((o) => (
                <option key={o.id} value={o.id}>{o.name} — {o.customer}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Quote Number</span>
            <input value="Auto-assigned when saved" disabled className="w-full rounded border border-zinc-700 bg-zinc-100 p-2 text-zinc-700" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" placeholder="My quote" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Customer Contact Role</span>
            <input value={customerContactRole} onChange={(e) => setCustomerContactRole(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" placeholder="Owner, Buyer, etc." />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Billing Attention To</span>
            <input value={billingAttentionTo} onChange={(e) => setBillingAttentionTo(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Shipping Attention To</span>
            <input value={shippingAttentionTo} onChange={(e) => setShippingAttentionTo(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Quote Date</span>
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Due Date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Expiration Date</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Txn Date</span>
            <input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Sales Rep</span>
            <select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Unassigned</option>
              {sortedSalesReps.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Project Manager</span>
            <select value={projectManagerId} onChange={(e) => setProjectManagerId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Unassigned</option>
              {sortedProjectManagers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <AddressAutocomplete label="Billing Address" value={billingAddress} onChange={setBillingAddress} />
          </div>
          <div className="md:col-span-2">
            <AddressAutocomplete label="Shipping Address" value={shippingAddress} onChange={setShippingAddress} />
          </div>
          <div className="md:col-span-2">
            <AddressAutocomplete label="Install Address" value={installAddress} onChange={setInstallAddress} />
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-300">Customer PO Number</span>
            <input value={customerPoNumber} onChange={(e) => setCustomerPoNumber(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" placeholder="12345" />
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
            {lineItems.map((line, i) => {
              const selectedProduct = products.find((p) => p.id === line.productId);
              return (
                <div key={i} className="space-y-2 rounded border border-zinc-700 p-2">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
                    <label className="text-xs text-zinc-300">Product
                      <select
                        value={line.productId}
                        onChange={(e) => {
                          const productId = e.target.value;
                          updateLine(i, 'productId', productId);
                          const p = products.find((x) => x.id === productId);
                          if (p) {
                            const defaults = Object.fromEntries((p.attributes || []).map((a) => [a.code, a.defaultValue || '']));
                            setLineItems((prev) =>
                              prev.map((line, idx) =>
                                idx === i
                                  ? recalcLinePrice({
                                      ...line,
                                      productId,
                                      name: p.name,
                                      description: line.description || p.name,
                                      attributeValues: defaults,
                                    })
                                  : line
                              )
                            );
                          }
                        }}
                        className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                      >
                        <option value="">Select product</option>
                        {sortedProducts.map((p) => (
                          <option key={p.id} value={p.id}>{p.sku} — {p.name}{p.category ? ` (${p.category})` : ''}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-zinc-300">Line Name
                      <input value={line.name} onChange={(e) => updateLine(i, 'name', e.target.value)} placeholder="Line item name" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
                    </label>
                    <label className="text-xs text-zinc-300">Description
                      <input value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} placeholder="Description" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
                    </label>
                    <label className="text-xs text-zinc-300">Quantity
                      <input value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
                    </label>
                    <label className="text-xs text-zinc-300">Unit Price
                      <input value={line.priceInDollars} onChange={(e) => updateLine(i, 'priceInDollars', e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
                    </label>
                    <label className="text-xs text-zinc-300">Taxable
                      <span className="mt-1 flex h-[42px] items-center rounded border border-zinc-700 bg-white px-2 text-zinc-900">
                        <input type="checkbox" checked={line.taxable} onChange={(e) => setLineItems((prev) => prev.map((l, idx) => idx === i ? { ...l, taxable: e.target.checked } : l))} />
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <label className="text-xs text-zinc-300">Unit Cost
                      <input value={line.unitCost} onChange={(e) => updateLineCostGpm(i, 'unitCost', e.target.value)} type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
                    </label>
                    <label className="text-xs text-zinc-300">GPM %
                      <input value={line.gpmPercent} onChange={(e) => updateLineCostGpm(i, 'gpmPercent', e.target.value)} type="number" min="0" max="99.99" step="0.01" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
                    </label>
                    <label className="text-xs text-zinc-300">Extended Price
                      <input value={(Number(line.quantity || 0) * Number(line.priceInDollars || 0)).toFixed(2)} disabled className="mt-1 w-full rounded border border-zinc-700 bg-zinc-100 p-2 text-zinc-700" />
                    </label>
                  </div>

                  {selectedProduct?.attributes?.length ? (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                      {selectedProduct.attributes.map((attr) => (
                        <label key={attr.id} className="text-xs text-zinc-300">
                          <span className="mb-1 block">{attr.name}</span>
                          {attr.inputType === 'SELECT' ? (
                            <select
                              value={line.attributeValues[attr.code] || ''}
                              onChange={(e) => updateLineAttribute(i, attr.code, e.target.value)}
                              className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                            >
                              <option value="">Select</option>
                              {(attr.options || []).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={line.attributeValues[attr.code] || ''}
                              onChange={(e) => updateLineAttribute(i, attr.code, e.target.value)}
                              type={attr.inputType === 'NUMBER' ? 'number' : 'text'}
                              className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900"
                              required={Boolean((attr as { required?: boolean }).required)}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <button className="rounded bg-blue-600 px-4 py-2">Create Quote</button>
      </form>
    </main>
  );
}
