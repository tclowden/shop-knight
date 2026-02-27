"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
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
      body: JSON.stringify({ sku, name, category, description, salePrice, costPrice, taxable }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create product');
      return;
    }

    setSku('');
    setName('');
    setCategory('General');
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
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Product Admin</h1>
      <p className="text-sm text-zinc-400">Create products that appear as dropdown options in Quotes and Sales Orders.</p>
      <Nav />

      <form onSubmit={createProduct} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-7">
        <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} type="number" step="0.01" min="0" placeholder="Sale price" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="Cost" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <label className="flex items-center gap-2 rounded border border-zinc-700 p-2 text-sm">
          <input checked={taxable} onChange={(e) => setTaxable(e.target.checked)} type="checkbox" /> Taxable
        </label>
        <button className="rounded bg-blue-600 px-3 py-2 md:col-span-7">Create Product</button>
      </form>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3">SKU</th>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Sale Price</th>
              <th className="p-3">Cost</th>
              <th className="p-3">Taxable</th>
              <th className="p-3">Rules</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="p-3">{p.sku}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.category || '—'}</td>
                <td className="p-3">{p.description || '—'}</td>
                <td className="p-3">{p.salePrice}</td>
                <td className="p-3">{p.costPrice ?? '—'}</td>
                <td className="p-3">{p.taxable ? 'Yes' : 'No'}</td>
                <td className="p-3"><Link href={`/admin/products/${p.id}`} className="text-blue-400">Manage</Link></td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={8}>No products yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
