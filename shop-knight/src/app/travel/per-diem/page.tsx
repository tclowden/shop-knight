"use client";

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type TripOption = { id: string; name: string; destinationCity?: string | null; destinationState?: string | null };
type RequestItem = {
  id: string;
  status: 'NEW' | 'IN_REVIEW' | 'COMPLETE' | 'CANCELED';
  trip: { id: string; name: string };
  destinationCity?: string | null;
  destinationState?: string | null;
  dailyRate?: string | number | null;
  total?: string | number | null;
  createdAt: string;
};
export default function PerDiemRequestsPage() {
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [tripId, setTripId] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [tripRes, reqRes] = await Promise.all([
      fetch('/api/travel/trips'),
      fetch(`/api/travel/per-diem-requests?status=${statusFilter === 'OPEN' ? '' : statusFilter}`),
    ]);
    if (tripRes.ok) setTrips(await tripRes.json());
    if (reqRes.ok) setItems(await reqRes.json());
  }, [statusFilter]);

  async function createRequest(e: FormEvent) {
    e.preventDefault();
    if (!tripId) { setMessage('Select a trip first.'); return; }

    setCreating(true);
    setMessage('');
    const res = await fetch('/api/travel/per-diem-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, notes }),
    });
    const payload = await res.json().catch(() => ({}));
    setCreating(false);

    if (!res.ok) {
      setMessage(payload?.error || 'Failed to create per-diem request');
      return;
    }

    setTripId('');
    setNotes('');
    setMessage('Per-diem request created.');
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Per-Diem Requests</h1>
      <p className="text-sm text-slate-500">Create and manage per-diem request workflow.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Create Request</h2>
        <form onSubmit={createRequest} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="field md:col-span-2">
            <option value="">Select trip…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.destinationCity && t.destinationState ? ` — ${t.destinationCity}, ${t.destinationState}` : ''}</option>
            ))}
          </select>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="field" />
          <button disabled={creating} className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{creating ? 'Creating…' : 'Create Request'}</button>
        </form>
        {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      </section>

      <section className="mb-2 flex items-center gap-2">
        <label className="text-sm text-slate-600">Status filter</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-10 w-52">
          <option value="OPEN">Open (default)</option>
          <option value="NEW">New</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="CANCELED">Canceled</option>
          <option value="COMPLETE">Complete</option>
          <option value="ALL">All</option>
        </select>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Request</th>
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">M&IE</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/travel/per-diem/${item.id}`} className="text-sky-700 hover:underline">{item.id.slice(0, 8).toUpperCase()}</Link></td>
                <td className="px-4 py-4">{item.trip.name}</td>
                <td className="px-4 py-4">{item.destinationCity && item.destinationState ? `${item.destinationCity}, ${item.destinationState}` : '—'}</td>
                <td className="px-4 py-4">{item.dailyRate ? `$${Number(item.dailyRate).toFixed(2)}/day` : '—'}</td>
                <td className="px-4 py-4">{item.total !== null && item.total !== undefined ? `$${Number(item.total).toFixed(2)}` : '—'}</td>
                <td className="px-4 py-4">{item.status}</td>
                <td className="px-4 py-4 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No requests found for this filter.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
