"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  uom: string | null;
  description: string | null;
  salePrice: string | number;
  costPrice: string | number | null;
  taxable: boolean;
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [uom, setUom] = useState('EA');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('0.00');
  const [costPrice, setCostPrice] = useState('0.00');
  const [taxable, setTaxable] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/admin/products');
    if (!res.ok) return;
    setProducts(await res.json());
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, name, category, uom, description, salePrice, costPrice, taxable }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create product');
      return;
    }

    setSku('');
    setName('');
    setCategory('General');
    setUom('EA');
    setDescription('');
    setSalePrice('0.00');
    setCostPrice('0.00');
    setTaxable(true);
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Product Admin</h1>
      <p className="text-sm text-slate-500">Create products that appear as options in Quotes and Sales Orders.</p>
      <Nav />

      <form onSubmit={createProduct} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-8">
        <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="field" required />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="field" required />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="field" />
        <input value={uom} onChange={(e) => setUom(e.target.value)} placeholder="UOM (EA, sqft, ft)" className="field" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="field" />
        <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} type="number" step="0.01" min="0" placeholder="Sale price" className="field" required />
        <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="Cost" className="field" />
        <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"><input checked={taxable} onChange={(e) => setTaxable(e.target.checked)} type="checkbox" /> Taxable</label>
        <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 md:col-span-8">Create Product</button>
      </form>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">UOM</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Sale Price</th>
              <th className="px-4 py-3 font-semibold">Cost</th>
              <th className="px-4 py-3 font-semibold">Taxable</th>
              <th className="px-4 py-3 font-semibold">Rules</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{p.sku}</td>
                <td className="px-4 py-4">{p.name}</td>
                <td className="px-4 py-4">{p.category || '—'}</td>
                <td className="px-4 py-4">{p.uom || 'EA'}</td>
                <td className="px-4 py-4">{p.description || '—'}</td>
                <td className="px-4 py-4">{p.salePrice}</td>
                <td className="px-4 py-4">{p.costPrice ?? '—'}</td>
                <td className="px-4 py-4">{p.taxable ? 'Yes' : 'No'}</td>
                <td className="px-4 py-4"><Link href={`/admin/products/${p.id}`} className="text-sky-700">Manage</Link></td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={9}>No products yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
