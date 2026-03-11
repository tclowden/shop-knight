"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Traveler = { id: string; fullName: string };
type TravelerOption = { id: string; fullName: string };
type Trip = {
  id: string;
  name: string;
  destinations?: string | null;
  purpose?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  billable: boolean;
  salesOrderRef?: string | null;
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
  const [allTravelers, setAllTravelers] = useState<TravelerOption[]>([]);
  const [selectedTravelerIds, setSelectedTravelerIds] = useState<string[]>([]);
  const [savingTravelers, setSavingTravelers] = useState(false);
  const [segmentType, setSegmentType] = useState('FLIGHT');
  const [status, setStatus] = useState('PLANNING');
  const [loadingPerDiem, setLoadingPerDiem] = useState(false);
  const [perDiemMessage, setPerDiemMessage] = useState('');
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
    if (tripRes.ok) {
      const tripData = await tripRes.json();
      setTrip(tripData);
      setStatus(tripData.status || 'PLANNING');
      setSelectedTravelerIds((tripData.travelers || []).map((t: { traveler: { id: string } }) => t.traveler.id));
    }
    if (segmentRes.ok) setSegments(await segmentRes.json());
  }

  async function saveTravelers(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;

    setSavingTravelers(true);
    const res = await fetch(`/api/travel/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ travelerIds: selectedTravelerIds }),
    });
    setSavingTravelers(false);
    if (!res.ok) return;
    await load(trip.id);
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

  async function saveStatus(nextStatus: string) {
    if (!trip) return;
    const res = await fetch(`/api/travel/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) return;
    await load(trip.id);
  }

  async function generatePerDiem() {
    if (!trip) return;
    setLoadingPerDiem(true);
    setPerDiemMessage('');

    const res = await fetch(`/api/travel/trips/${trip.id}/per-diem`, { method: 'POST' });
    const payload = await res.json().catch(() => ({}));
    setLoadingPerDiem(false);

    if (!res.ok) {
      setPerDiemMessage(payload?.error || 'Failed to generate per-diem draft');
      return;
    }

    setPerDiemMessage(`Per-diem draft ready: ${payload.total} for ${payload.travelerCount} traveler(s), ${payload.days} day(s) at ${payload.dailyRate}/day (reviewer: ${payload.reviewer}).`);
  }

  useEffect(() => {
    params.then((p) => load(p.id));
    fetch('/api/travel/travelers').then(async (res) => {
      if (!res.ok) return;
      setAllTravelers(await res.json());
    });
  }, [params]);

  if (!trip) return <main className="mx-auto max-w-7xl p-8">Loading trip…</main>;

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <Nav />
      <h1 className="text-3xl font-semibold tracking-tight">{trip.name}</h1>
      <p className="text-sm text-slate-500">{trip.destinations || 'No destination'} • {trip.status}</p>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Trip Status</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); saveStatus(e.target.value); }} className="field">
              <option value="PLANNING">Planning</option>
              <option value="PRE_TRAVEL">Pre-Travel</option>
              <option value="IN_TRANSIT">In-Transit</option>
              <option value="ON_SITE">On-Site</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </label>

          <div className="text-sm text-slate-600">
            <p>Billing: <span className="font-medium">{trip.billable ? 'Billable' : 'Non-billable'}</span></p>
            <p>SO Ref: <span className="font-medium">{trip.salesOrderRef || '—'}</span></p>
          </div>

          <div>
            <button type="button" onClick={generatePerDiem} disabled={loadingPerDiem} className="inline-flex h-11 items-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
              {loadingPerDiem ? 'Generating…' : 'Generate Per-Diem Draft'}
            </button>
            {perDiemMessage ? <p className="mt-2 text-xs text-slate-600">{perDiemMessage}</p> : null}
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Travelers</h2>
        <form onSubmit={saveTravelers} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            multiple
            value={selectedTravelerIds}
            onChange={(e) => setSelectedTravelerIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="field h-24 md:col-span-3"
          >
            {allTravelers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
          <button disabled={savingTravelers} className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{savingTravelers ? 'Saving…' : 'Save Travelers'}</button>
        </form>
      </section>

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
