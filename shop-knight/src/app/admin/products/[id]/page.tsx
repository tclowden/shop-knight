"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { buildPricingVars, computeUnitPrice } from '@/lib/pricing';
type Product = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  uom?: string | null;
  salePrice?: string | number;
  pricingFormula: string | null;
};
type Attribute = { id: string; code: string; name: string; inputType: string; required: boolean; options: string[] | null; defaultValue: string | null };

export default function ProductDetailAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [pricingFormula, setPricingFormula] = useState('basePrice');
  const [category, setCategory] = useState('');
  const [uom, setUom] = useState('EA');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [inputType, setInputType] = useState('NUMBER');
  const [required, setRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [optionsCsv, setOptionsCsv] = useState('');

  const [previewQty, setPreviewQty] = useState('1');
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  async function load(productId: string) {
    const [productsRes, attrsRes] = await Promise.all([
      fetch('/api/admin/products'),
      fetch(`/api/admin/products/${productId}/attributes`),
    ]);
    const products = await productsRes.json();
    const p = products.find((x: Product) => x.id === productId) || null;
    const attrs = await attrsRes.json();

    setProduct(p);
    setPricingFormula(p?.pricingFormula || 'basePrice');
    setCategory(p?.category || '');
    setUom(p?.uom || 'EA');
    setAttributes(attrs);
    setPreviewValues(Object.fromEntries(attrs.map((a: Attribute) => [a.code, a.defaultValue || ''])));
  }

  async function saveFormula(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricingFormula, category, uom }),
    });
    await load(id);
  }

  async function addAttribute(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/products/${id}/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name,
        inputType,
        required,
        defaultValue: defaultValue || null,
        options: inputType === 'SELECT' ? optionsCsv.split(',').map((s) => s.trim()).filter(Boolean) : null,
      }),
    });

    setCode('');
    setName('');
    setInputType('NUMBER');
    setRequired(false);
    setDefaultValue('');
    setOptionsCsv('');
    await load(id);
  }

  const previewPrice = useMemo(() => {
    const basePrice = Number(product?.salePrice || 0);
    const qty = Number(previewQty || 1);
    const vars = buildPricingVars(qty, basePrice, previewValues);
    return computeUnitPrice(basePrice, pricingFormula, vars);
  }, [previewQty, previewValues, pricingFormula, product?.salePrice]);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Product Pricing Rules</h1>
      <p className="text-sm text-zinc-400">{product ? `${product.sku} — ${product.name}` : 'Loading...'}</p>
      <Nav />

      <form onSubmit={saveFormula} className="mb-4 rounded border border-zinc-800 p-4 space-y-2">
        <p className="text-sm text-zinc-300">Pricing Formula</p>
        <input value={pricingFormula} onChange={(e) => setPricingFormula(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          <input value={uom} onChange={(e) => setUom(e.target.value)} placeholder="UOM (EA, sqft, ft)" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </div>
        <p className="text-xs text-zinc-400">Examples: <code>basePrice + width * height * 0.12</code> or <code>width &lt;= 24 ? 12 : width &lt;= 48 ? 20 : 30</code></p>
        <button className="rounded bg-blue-600 px-3 py-2 text-sm">Save Rules</button>
      </form>

      <div className="mb-4 rounded border border-zinc-800 p-4">
        <h2 className="mb-2 font-medium">Formula Preview</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <label className="text-xs text-zinc-300">
            Qty
            <input value={previewQty} onChange={(e) => setPreviewQty(e.target.value)} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          {attributes.map((attr) => (
            <label key={attr.id} className="text-xs text-zinc-300">
              {attr.name}
              {attr.inputType === 'SELECT' ? (
                <select value={previewValues[attr.code] || ''} onChange={(e) => setPreviewValues((p) => ({ ...p, [attr.code]: e.target.value }))} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                  <option value="">Select</option>
                  {(attr.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={previewValues[attr.code] || ''} onChange={(e) => setPreviewValues((p) => ({ ...p, [attr.code]: e.target.value }))} type={attr.inputType === 'NUMBER' ? 'number' : 'text'} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
              )}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-200">Calculated Unit Price: <span className="font-semibold">${previewPrice.toFixed(2)}</span></p>
      </div>

      <form onSubmit={addAttribute} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-4 md:grid-cols-6">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="code (e.g. width)" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <select value={inputType} onChange={(e) => setInputType(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="NUMBER">NUMBER</option><option value="TEXT">TEXT</option><option value="SELECT">SELECT</option><option value="BOOLEAN">BOOLEAN</option>
        </select>
        <input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} placeholder="default value" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={optionsCsv} onChange={(e) => setOptionsCsv(e.target.value)} placeholder="select options: a,b,c" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <label className="flex items-center gap-2 rounded border border-zinc-700 p-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>
        <button className="rounded bg-blue-600 px-3 py-2 md:col-span-6">Add Attribute</button>
      </form>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Code</th><th className="p-3">Label</th><th className="p-3">Type</th><th className="p-3">Default</th><th className="p-3">Options</th><th className="p-3">Required</th></tr></thead>
          <tbody>{attributes.map((a) => (<tr key={a.id} className="border-t border-zinc-800"><td className="p-3">{a.code}</td><td className="p-3">{a.name}</td><td className="p-3">{a.inputType}</td><td className="p-3">{a.defaultValue || '—'}</td><td className="p-3">{a.options?.join(', ') || '—'}</td><td className="p-3">{a.required ? 'Yes' : 'No'}</td></tr>))}</tbody>
        </table>
      </div>

      <ModuleNotesTasks entityType="PRODUCT" entityId={id} />
    </main>
  );
}
