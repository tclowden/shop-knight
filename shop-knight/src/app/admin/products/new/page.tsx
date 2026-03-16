"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type DraftAttribute = {
  code: string;
  name: string;
  inputType: 'NUMBER' | 'TEXT' | 'SELECT' | 'BOOLEAN';
  required: boolean;
  defaultValue: string;
  optionsCsv: string;
};

export default function NewProductPage() {
  const router = useRouter();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [uom, setUom] = useState('EA');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('0.00');
  const [costPrice, setCostPrice] = useState('0.00');
  const [taxable, setTaxable] = useState(true);

  const [attributes, setAttributes] = useState<DraftAttribute[]>([]);
  const [attrCode, setAttrCode] = useState('');
  const [attrName, setAttrName] = useState('');
  const [attrInputType, setAttrInputType] = useState<DraftAttribute['inputType']>('NUMBER');
  const [attrRequired, setAttrRequired] = useState(false);
  const [attrDefaultValue, setAttrDefaultValue] = useState('');
  const [attrOptionsCsv, setAttrOptionsCsv] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addAttributeDraft(e: FormEvent) {
    e.preventDefault();

    const code = attrCode.trim();
    const label = attrName.trim();

    if (!code || !label) {
      setError('Attribute code and label are required.');
      return;
    }

    if (attributes.some((item) => item.code.toLowerCase() === code.toLowerCase())) {
      setError('Attribute code must be unique.');
      return;
    }

    if (attrInputType === 'SELECT') {
      const options = attrOptionsCsv.split(',').map((s) => s.trim()).filter(Boolean);
      if (options.length === 0) {
        setError('Select attributes need at least one option.');
        return;
      }
    }

    setAttributes((prev) => [
      ...prev,
      {
        code,
        name: label,
        inputType: attrInputType,
        required: attrRequired,
        defaultValue: attrDefaultValue.trim(),
        optionsCsv: attrOptionsCsv,
      },
    ]);

    setAttrCode('');
    setAttrName('');
    setAttrInputType('NUMBER');
    setAttrRequired(false);
    setAttrDefaultValue('');
    setAttrOptionsCsv('');
    setError('');
  }

  function removeAttributeDraft(code: string) {
    setAttributes((prev) => prev.filter((item) => item.code !== code));
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError('');

    try {
      setSaving(true);
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, name, category, uom, description, salePrice, costPrice, taxable }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Failed to create product');
        return;
      }

      const created = await res.json();
      const productId = String(created?.id || '');

      if (productId && attributes.length > 0) {
        for (let index = 0; index < attributes.length; index += 1) {
          const attr = attributes[index];
          const attrRes = await fetch(`/api/admin/products/${productId}/attributes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: attr.code,
              name: attr.name,
              inputType: attr.inputType,
              required: attr.required,
              defaultValue: attr.defaultValue || null,
              sortOrder: index,
              options: attr.inputType === 'SELECT'
                ? attr.optionsCsv.split(',').map((s) => s.trim()).filter(Boolean)
                : null,
            }),
          });

          if (!attrRes.ok) {
            const data = await attrRes.json().catch(() => ({}));
            setError(
              typeof data?.error === 'string'
                ? `Product created, but attribute "${attr.name}" failed: ${data.error}`
                : `Product created, but attribute "${attr.name}" failed to save.`
            );
            return;
          }
        }
      }

      router.push('/admin/products');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Product</h1>
          <p className="text-sm text-slate-500">Key in product details and optional attributes in one flow.</p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Products
        </Link>
      </div>

      <Nav />

      <form onSubmit={createProduct} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Product Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Unit of Measure
            <input value={uom} onChange={(e) => setUom(e.target.value)} placeholder="EA, sqft, ft" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="field mt-1" />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Sale Price
            <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="field mt-1" required />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Cost Price
            <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0.00" className="field mt-1" />
          </label>

          <label className="mt-1 flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 md:col-span-2">
            <input checked={taxable} onChange={(e) => setTaxable(e.target.checked)} type="checkbox" />
            Taxable
          </label>
        </div>

        <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Attributes</h2>
          <p className="mt-1 text-xs text-slate-500">Add optional product attributes now (width, height, material, finish, etc.). For SELECT options, you can use <span className="font-mono">Label|Number</span> (example: <span className="font-mono">Rush|25</span>) so formulas can use the numeric value.</p>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Default</th>
                  <th className="px-3 py-2 font-semibold">Options</th>
                  <th className="px-3 py-2 font-semibold">Required</th>
                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((a) => (
                  <tr key={a.code} className="border-t border-slate-100">
                    <td className="px-3 py-2">{a.code}</td>
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2">{a.inputType}</td>
                    <td className="px-3 py-2">{a.defaultValue || '—'}</td>
                    <td className="px-3 py-2">{a.inputType === 'SELECT' ? (a.optionsCsv || '—') : '—'}</td>
                    <td className="px-3 py-2">{a.required ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeAttributeDraft(a.code)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {attributes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center text-slate-500" colSpan={7}>No attributes added yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-6">
            <input value={attrCode} onChange={(e) => setAttrCode(e.target.value)} placeholder="code (e.g. width)" className="field md:col-span-1" />
            <input value={attrName} onChange={(e) => setAttrName(e.target.value)} placeholder="Label" className="field md:col-span-1" />
            <select value={attrInputType} onChange={(e) => setAttrInputType(e.target.value as DraftAttribute['inputType'])} className="field md:col-span-1">
              <option value="NUMBER">NUMBER</option>
              <option value="TEXT">TEXT</option>
              <option value="SELECT">SELECT</option>
              <option value="BOOLEAN">BOOLEAN</option>
            </select>
            <input value={attrDefaultValue} onChange={(e) => setAttrDefaultValue(e.target.value)} placeholder="default value" className="field md:col-span-1" />
            <input value={attrOptionsCsv} onChange={(e) => setAttrOptionsCsv(e.target.value)} placeholder="options (a,b,c)" className="field md:col-span-1" />
            <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 md:col-span-1">
              <input checked={attrRequired} onChange={(e) => setAttrRequired(e.target.checked)} type="checkbox" />
              Required
            </label>
          </div>

          <button
            type="button"
            onClick={addAttributeDraft}
            className="mt-3 inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Add Attribute
          </button>
        </section>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Create Product'}
          </button>
          <Link href="/admin/products" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
