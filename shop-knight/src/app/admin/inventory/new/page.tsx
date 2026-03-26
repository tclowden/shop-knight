"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [itemNumber, setItemNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [totalQty, setTotalQty] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createItem(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');

    const res = await fetch('/api/admin/inventory-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemNumber, name, category, location, totalQty, notes }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === 'string' ? data.error : 'Failed to create inventory item');
      return;
    }

    router.push('/admin/inventory');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create Inventory Item</h1>
          <p className="text-sm text-slate-500">Define on-hand inventory that can be reserved by sales orders.</p>
        </div>
        <Link href="/admin/inventory" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Inventory</Link>
      </div>
      <Nav />

      <form onSubmit={createItem} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Item Number<input value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} className="field mt-1" required /></label>
          <label className="text-sm font-medium text-slate-700">Item Name<input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" required /></label>
          <label className="text-sm font-medium text-slate-700">Category<input value={category} onChange={(e) => setCategory(e.target.value)} className="field mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="field mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">On Hand Quantity<input value={totalQty} onChange={(e) => setTotalQty(e.target.value)} type="number" min="0" className="field mt-1" required /></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" /></label>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{saving ? 'Creating…' : 'Create Item'}</button>
          <Link href="/admin/inventory" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
