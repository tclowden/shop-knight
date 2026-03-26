"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Item = { id: string; itemNumber: string; name: string; totalQty: number };
type Reservation = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  reservedFrom: string;
  reservedTo: string;
  notes: string | null;
  inventoryItem: Item;
};

export default function SalesOrderInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const [salesOrderId, setSalesOrderId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reservedFrom, setReservedFrom] = useState('');
  const [reservedTo, setReservedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState<{ onHandQty: number; reservedQty: number; checkedOutQty: number; availableQty: number } | null>(null);
  const [error, setError] = useState('');

  const selectedItem = useMemo(() => items.find((i) => i.id === inventoryItemId), [items, inventoryItemId]);

  async function load(id: string) {
    const [itemsRes, reservationsRes] = await Promise.all([
      fetch('/api/admin/inventory-items'),
      fetch(`/api/sales-orders/${id}/inventory-reservations`),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (reservationsRes.ok) setReservations(await reservationsRes.json());
  }

  async function loadAvailability() {
    if (!inventoryItemId || !reservedFrom || !reservedTo) {
      setAvailability(null);
      return;
    }
    const res = await fetch(`/api/inventory/availability?itemId=${encodeURIComponent(inventoryItemId)}&from=${encodeURIComponent(reservedFrom)}&to=${encodeURIComponent(reservedTo)}`);
    if (!res.ok) {
      setAvailability(null);
      return;
    }
    const data = await res.json();
    setAvailability({ onHandQty: Number(data.onHandQty || 0), reservedQty: Number(data.reservedQty || 0), checkedOutQty: Number(data.checkedOutQty || 0), availableQty: Number(data.availableQty || 0) });
  }

  async function createReservation() {
    if (!salesOrderId) return;
    setError('');
    const res = await fetch(`/api/sales-orders/${salesOrderId}/inventory-reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventoryItemId, quantity: Number(quantity), reservedFrom, reservedTo, notes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === 'string' ? data.error : 'Failed to reserve inventory');
      return;
    }
    setQuantity('1');
    setNotes('');
    await load(salesOrderId);
    await loadAvailability();
  }

  async function removeReservation(id: string) {
    const res = await fetch(`/api/inventory-reservations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await load(salesOrderId);
      await loadAvailability();
    }
  }

  useEffect(() => {
    params.then((p) => {
      setSalesOrderId(p.id);
      load(p.id);
    });
  }, [params]);

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryItemId, reservedFrom, reservedTo]);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Order Inventory Reservations</h1>
      <p className="text-sm text-zinc-400">Reserve inventory for this order and see availability by date range.</p>
      <Nav />

      <div className="mb-3">
        <Link href={`/sales/orders/${salesOrderId}`} className="inline-flex h-10 items-center rounded border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50">Back to Sales Order</Link>
      </div>

      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 font-medium">Reserve Inventory</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <label className="text-xs text-zinc-300">Item
            <select value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Select item</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.itemNumber} — {i.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-zinc-300">Quantity
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="1" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-xs text-zinc-300">From
            <input value={reservedFrom} onChange={(e) => setReservedFrom(e.target.value)} type="date" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-xs text-zinc-300">To
            <input value={reservedTo} onChange={(e) => setReservedTo(e.target.value)} type="date" className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
          <label className="text-xs text-zinc-300">Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
          </label>
        </div>

        {selectedItem ? <p className="mt-2 text-xs text-zinc-400">On hand for {selectedItem.name}: {selectedItem.totalQty}</p> : null}
        {availability ? <p className="mt-1 text-xs text-zinc-300">For selected date range → Reserved: {availability.reservedQty}, Checked Out: {availability.checkedOutQty}, Available: {availability.availableQty}</p> : null}
        {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

        <button type="button" onClick={createReservation} className="mt-3 rounded bg-emerald-600 px-3 py-2 text-sm text-white">Reserve Inventory</button>
      </section>

      <section className="mt-4 overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{r.inventoryItem.itemNumber} — {r.inventoryItem.name}</td>
                <td className="px-3 py-2">{r.quantity}</td>
                <td className="px-3 py-2">{new Date(r.reservedFrom).toLocaleDateString()}</td>
                <td className="px-3 py-2">{new Date(r.reservedTo).toLocaleDateString()}</td>
                <td className="px-3 py-2">{r.notes || '—'}</td>
                <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeReservation(r.id)} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700">Remove</button></td>
              </tr>
            ))}
            {reservations.length === 0 ? <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={6}>No reservations yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
