"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function handleArchive(productId: string) {
    if (archivingId) return;
    const ok = window.confirm(showArchived ? 'Restore this product?' : 'Archive this product?');
    if (!ok) return;

    try {
      setArchivingId(productId);
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: showArchived ? 'POST' : 'DELETE',
        headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
        body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to ${showArchived ? 'restore' : 'archive'} product`);
      }
      setProducts((prev) => prev.filter((item) => item.id !== productId));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${showArchived ? 'restore' : 'archive'} product`;
      window.alert(message);
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/admin/products?archived=${showArchived ? 'only' : 'active'}`);
      if (!res.ok) return;
      setProducts(await res.json());
    };
    run();
  }, [showArchived]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Product Admin</h1>
          <p className="text-sm text-slate-500">Manage products used in Quotes and Sales Orders.</p>
        </div>
        {!showArchived ? (
          <Link
            href="/admin/products/new"
            className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Create Product
          </Link>
        ) : null}
      </div>

      <Nav />

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowArchived((prev) => !prev)}
          className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>

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
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
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
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleArchive(p.id)}
                    disabled={archivingId === p.id}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {archivingId === p.id ? (showArchived ? 'Restoring…' : 'Archiving…') : (showArchived ? 'Restore' : 'Archive')}
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={10}>No products yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
