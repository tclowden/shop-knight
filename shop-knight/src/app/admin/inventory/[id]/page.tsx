"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Item = {
  id: string;
  itemNumber: string;
  name: string;
  category: string | null;
  location: string | null;
  totalQty: number;
  checkedOutQty: number;
  reservedQty?: number;
  availableQty?: number;
  notes: string | null;
};

export default function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [totalQty, setTotalQty] = useState('0');
  const [checkedOutQty, setCheckedOutQty] = useState('0');
  const [reservedQty, setReservedQty] = useState('0');
  const [availableQty, setAvailableQty] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(itemId: string) {
    const res = await fetch(`/api/admin/inventory-items/${itemId}`);
    if (!res.ok) {
      setError('Failed to load inventory item');
      return;
    }
    const item = (await res.json()) as Item;
    setItemNumber(item.itemNumber);
    setName(item.name || '');
    setCategory(item.category || '');
    setLocation(item.location || '');
    setTotalQty(String(item.totalQty ?? 0));
    setCheckedOutQty(String(item.checkedOutQty ?? 0));
    setReservedQty(String(item.reservedQty ?? 0));
    setAvailableQty(String(item.availableQty ?? 0));
    setNotes(item.notes || '');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!id || saving) return;
    setSaving(true);
    setError('');

    const res = await fetch(`/api/admin/inventory-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, location, totalQty, checkedOutQty, notes }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === 'string' ? data.error : 'Failed to save inventory item');
      return;
    }

    router.push('/admin/inventory');
    router.refresh();
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit Inventory Item</h1>
          <p className="text-sm text-slate-500">Update quantity, location, and item details.</p>
        </div>
        <Link href="/admin/inventory" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Inventory</Link>
      </div>
      <Nav />

      <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Item Number<input value={itemNumber} disabled className="field mt-1 bg-slate-100 text-slate-600" /></label>
          <label className="text-sm font-medium text-slate-700">Item Name<input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" required /></label>
          <label className="text-sm font-medium text-slate-700">Category<input value={category} onChange={(e) => setCategory(e.target.value)} className="field mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="field mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">Total Quantity<input value={totalQty} onChange={(e) => setTotalQty(e.target.value)} type="number" min="0" className="field mt-1" required /></label>
          <label className="text-sm font-medium text-slate-700">Reserved Quantity (calculated)<input value={reservedQty} disabled className="field mt-1 bg-slate-100 text-slate-600" /></label>
          <label className="text-sm font-medium text-slate-700">Checked Out Quantity<input value={checkedOutQty} onChange={(e) => setCheckedOutQty(e.target.value)} type="number" min="0" className="field mt-1" required /></label>
          <label className="text-sm font-medium text-slate-700">Available Quantity (calculated)<input value={availableQty} disabled className="field mt-1 bg-slate-100 text-slate-600" /></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" /></label>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
          <Link href="/admin/inventory" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </main>
  );
}
