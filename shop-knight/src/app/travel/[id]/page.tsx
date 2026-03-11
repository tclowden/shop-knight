"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Traveler = { id: string; fullName: string };
type Trip = {
  id: string;
  name: string;
  destinations?: string | null;
  purpose?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  travelers: Array<{ traveler: Traveler }>;
};

type Segment = {
  id: string;
  segmentType: string;
  provider?: string | null;
  confirmationCode?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  origin?: string | null;
  destination?: string | null;
  estimatedCost?: string | number | null;
  traveler?: Traveler | null;
};

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentType, setSegmentType] = useState('FLIGHT');
  const [travelerId, setTravelerId] = useState('');
  const [provider, setProvider] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  async function load(id: string) {
    const [tripRes, segmentRes] = await Promise.all([
      fetch(`/api/travel/trips/${id}`),
      fetch(`/api/travel/trips/${id}/segments`),
    ]);
    if (tripRes.ok) setTrip(await tripRes.json());
    if (segmentRes.ok) setSegments(await segmentRes.json());
  }

  async function addSegment(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;

    const res = await fetch(`/api/travel/trips/${trip.id}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmentType, travelerId: travelerId || null, provider, confirmationCode, origin, destination, estimatedCost }),
    });

    if (!res.ok) return;
    setProvider('');
    setConfirmationCode('');
    setOrigin('');
    setDestination('');
    setEstimatedCost('');
    await load(trip.id);
  }

  useEffect(() => {
    params.then((p) => load(p.id));
  }, [params]);

  if (!trip) return <main className="mx-auto max-w-7xl p-8">Loading trip…</main>;

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <Nav />
      <h1 className="text-3xl font-semibold tracking-tight">{trip.name}</h1>
      <p className="text-sm text-slate-500">{trip.destinations || 'No destination'} • {trip.status}</p>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Add Travel Segment</h2>
        <form onSubmit={addSegment} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <select value={segmentType} onChange={(e) => setSegmentType(e.target.value)} className="field">
            <option value="FLIGHT">Flight</option>
            <option value="HOTEL">Hotel</option>
            <option value="CAR">Car</option>
            <option value="GROUND">Ground</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={travelerId} onChange={(e) => setTravelerId(e.target.value)} className="field">
            <option value="">Trip-level / Unassigned</option>
            {trip.travelers.map((t) => <option key={t.traveler.id} value={t.traveler.id}>{t.traveler.fullName}</option>)}
          </select>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Provider" className="field" />
          <input value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} placeholder="Confirmation #" className="field" />
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin" className="field" />
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="field" />
          <input value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="Estimated cost" type="number" step="0.01" className="field" />
          <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">Add Segment</button>
        </form>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Traveler</th>
              <th className="px-4 py-3 font-semibold">Provider</th>
              <th className="px-4 py-3 font-semibold">Route</th>
              <th className="px-4 py-3 font-semibold">Confirmation</th>
              <th className="px-4 py-3 font-semibold">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{s.segmentType}</td>
                <td className="px-4 py-4">{s.traveler?.fullName || '—'}</td>
                <td className="px-4 py-4">{s.provider || '—'}</td>
                <td className="px-4 py-4">{s.origin || '—'} → {s.destination || '—'}</td>
                <td className="px-4 py-4">{s.confirmationCode || '—'}</td>
                <td className="px-4 py-4">{s.estimatedCost ?? '—'}</td>
              </tr>
            ))}
            {segments.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No segments yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
