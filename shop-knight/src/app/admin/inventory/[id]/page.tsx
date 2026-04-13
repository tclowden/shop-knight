"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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

type BinOption = {
  id: string;
  name: string;
  space: { id: string; name: string; rack: { id: string; name: string } | null } | null;
};

type Assignment = {
  id: string;
  binId: string;
  notes: string | null;
  startedAt: string;
  endedAt: string | null;
  photoUrl: string | null;
  movedBy: { name: string | null; email: string } | null;
  bin: BinOption | null;
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

  const [bins, setBins] = useState<BinOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showMove, setShowMove] = useState(false);
  const [moveBinId, setMoveBinId] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [movePhoto, setMovePhoto] = useState<File | null>(null);
  const [moveError, setMoveError] = useState('');
  const [moveSaving, setMoveSaving] = useState(false);

  const currentAssignment = useMemo(() => assignments.find((x) => !x.endedAt) || null, [assignments]);

  async function load(itemId: string) {
    const [itemRes, binsRes, historyRes] = await Promise.all([
      fetch(`/api/admin/inventory-items/${itemId}`),
      fetch('/api/admin/storage/bins'),
      fetch(`/api/admin/inventory-items/${itemId}/storage-assignments`),
    ]);

    if (!itemRes.ok) {
      setError('Failed to load inventory item');
      return;
    }
    const item = (await itemRes.json()) as Item;
    setItemNumber(item.itemNumber);
    setName(item.name || '');
    setCategory(item.category || '');
    setLocation(item.location || '');
    setTotalQty(String(item.totalQty ?? 0));
    setCheckedOutQty(String(item.checkedOutQty ?? 0));
    setReservedQty(String(item.reservedQty ?? 0));
    setAvailableQty(String(item.availableQty ?? 0));
    setNotes(item.notes || '');

    if (binsRes.ok) {
      const rows = (await binsRes.json()) as BinOption[];
      setBins(rows);
      if (!moveBinId && rows.length) setMoveBinId(rows[0].id);
    }

    if (historyRes.ok) {
      const history = (await historyRes.json()) as Assignment[];
      setAssignments(history);
      const open = history.find((x) => !x.endedAt);
      if (open) setMoveBinId(open.binId);
    }
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

  async function moveAssignment(e: FormEvent) {
    e.preventDefault();
    if (!id || !moveBinId || moveSaving) return;
    setMoveSaving(true);
    setMoveError('');

    const form = new FormData();
    form.set('binId', moveBinId);
    form.set('notes', moveNotes);
    if (movePhoto) form.set('photo', movePhoto);

    const res = await fetch(`/api/admin/inventory-items/${id}/storage-assignments`, { method: 'POST', body: form });
    setMoveSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMoveError(typeof data?.error === 'string' ? data.error : 'Failed to move assignment');
      return;
    }

    setShowMove(false);
    setMoveNotes('');
    setMovePhoto(null);
    await load(id);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      void load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-5xl bg-[#f5f7fa] p-8 text-slate-800">
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

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Storage Assignment</h2>
            <p className="text-sm text-slate-500">Assign this item to a bin and keep move history.</p>
          </div>
          <button type="button" onClick={() => setShowMove(true)} className="inline-flex h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700">{currentAssignment ? 'Move Assignment' : 'Create Assignment'}</button>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-slate-700">Current Location</div>
          {currentAssignment ? (
            <p className="mt-1 text-slate-700">{currentAssignment.bin?.space?.rack?.name || '—'} / {currentAssignment.bin?.space?.name || '—'} / {currentAssignment.bin?.name || '—'}</p>
          ) : <p className="mt-1 text-slate-500">No active assignment.</p>}
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-700">History</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm"><thead className="bg-[#eaf6fd]"><tr><th className="px-3 py-2">Location</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th><th className="px-3 py-2">Photo</th><th className="px-3 py-2">Moved By</th></tr></thead><tbody>
            {assignments.map((a) => <tr key={a.id} className="border-t border-slate-100"><td className="px-3 py-2">{a.bin?.space?.rack?.name || '—'} / {a.bin?.space?.name || '—'} / {a.bin?.name || '—'}</td><td className="px-3 py-2">{new Date(a.startedAt).toLocaleString()}</td><td className="px-3 py-2">{a.endedAt ? new Date(a.endedAt).toLocaleString() : 'Current'}</td><td className="px-3 py-2">{a.photoUrl ? <a href={a.photoUrl} target="_blank" className="text-sky-700 underline">View</a> : '—'}</td><td className="px-3 py-2">{a.movedBy?.name || a.movedBy?.email || '—'}</td></tr>)}
            {assignments.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No assignment history yet.</td></tr> : null}
          </tbody></table>
        </div>
      </section>

      {showMove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={moveAssignment} className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">{currentAssignment ? 'Move Item to New Bin' : 'Assign Item to Bin'}</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">Bin
              <select className="field mt-1" value={moveBinId} onChange={(e) => setMoveBinId(e.target.value)} required>
                {bins.map((b) => <option key={b.id} value={b.id}>{b.space?.rack?.name || '—'} / {b.space?.name || '—'} / {b.name}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">Move Notes
              <textarea value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-sky-300 transition focus:ring" />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-700">Photo
              <input type="file" accept="image/*" onChange={(e) => setMovePhoto(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
            </label>
            {moveError ? <p className="mt-2 text-sm text-rose-600">{moveError}</p> : null}
            <div className="mt-4 flex items-center gap-2">
              <button type="submit" disabled={moveSaving} className="inline-flex h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white">{moveSaving ? 'Saving…' : currentAssignment ? 'Move Item' : 'Create Assignment'}</button>
              <button type="button" onClick={() => setShowMove(false)} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
