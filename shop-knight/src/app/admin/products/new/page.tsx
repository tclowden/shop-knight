"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
          <p className="text-sm text-slate-500">Key in product details and save to make it available in Quotes and Sales Orders.</p>
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
