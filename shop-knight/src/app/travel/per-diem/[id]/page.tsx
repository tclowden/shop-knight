"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type RequestDetail = {
  id: string;
  status: 'NEW' | 'IN_REVIEW' | 'COMPLETE' | 'CANCELED';
  destinationCity?: string | null;
  destinationState?: string | null;
  year?: number | null;
  dailyRate?: string | number | null;
  lodgingRate?: string | number | null;
  days?: number | null;
  travelerCount?: number | null;
  total?: string | number | null;
  notes?: string | null;
  trip: { id: string; name: string };
  createdByUser?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export default function PerDiemRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [item, setItem] = useState<RequestDetail | null>(null);
  const [status, setStatus] = useState('NEW');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function load(requestId: string) {
    const res = await fetch(`/api/travel/per-diem-requests/${requestId}`);
    if (!res.ok) return;
    const data = await res.json();
    setItem(data);
    setStatus(data.status || 'NEW');
    setNotes(data.notes || '');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/travel/per-diem-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(payload?.error || 'Failed to save');
      return;
    }
    setMessage('Request updated.');
    await load(id);
  }

  async function recompute() {
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/travel/per-diem-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recompute' }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(payload?.error || 'Failed to recompute');
      return;
    }
    setMessage('Rates recomputed from GSA.');
    await load(id);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  if (!item) return <main className="mx-auto max-w-7xl p-8">Loading request…</main>;

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <Nav />
      <h1 className="text-3xl font-semibold tracking-tight">Per-Diem Request {item.id.slice(0, 8).toUpperCase()}</h1>
      <p className="text-sm text-slate-500">Trip: {item.trip.name}</p>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Request Details</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p>Destination: <span className="font-medium">{item.destinationCity && item.destinationState ? `${item.destinationCity}, ${item.destinationState}` : '—'}</span></p>
          <p>Year: <span className="font-medium">{item.year ?? '—'}</span></p>
          <p>M&IE: <span className="font-medium">{item.dailyRate ?? '—'}</span></p>
          <p>Lodging: <span className="font-medium">{item.lodgingRate ?? '—'}</span></p>
          <p>Days: <span className="font-medium">{item.days ?? '—'}</span></p>
          <p>Traveler count: <span className="font-medium">{item.travelerCount ?? '—'}</span></p>
          <p>Total: <span className="font-medium">{item.total ?? '—'}</span></p>
          <p>Created by: <span className="font-medium">{item.createdByUser?.name || '—'}</span></p>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Manage Request</h2>
        <form onSubmit={save} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field">
            <option value="NEW">New</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="COMPLETE">Complete</option>
            <option value="CANCELED">Canceled</option>
          </select>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="field md:col-span-2" />
          <div className="md:col-span-3 flex gap-2">
            <button disabled={saving} className="inline-flex h-11 items-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">Save Changes</button>
            <button type="button" onClick={recompute} disabled={saving} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Recompute from GSA</button>
          </div>
        </form>
        {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      </section>
    </main>
  );
}
