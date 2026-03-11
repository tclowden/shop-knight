"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

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
  travelers: Array<{ traveler: { fullName: string } }>;
};

type TravelerOption = { id: string; fullName: string };

export default function TravelPage() {
  const [items, setItems] = useState<Trip[]>([]);
  const [travelers, setTravelers] = useState<TravelerOption[]>([]);
  const [name, setName] = useState('');
  const [destinations, setDestinations] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billable, setBillable] = useState(false);
  const [salesOrderRef, setSalesOrderRef] = useState('');
  const [selectedTravelerIds, setSelectedTravelerIds] = useState<string[]>([]);

  async function load() {
    const [tripRes, travelerRes] = await Promise.all([
      fetch('/api/travel/trips'),
      fetch('/api/travel/travelers'),
    ]);

    if (tripRes.ok) setItems(await tripRes.json());
    if (travelerRes.ok) setTravelers(await travelerRes.json());
  }

  async function createTrip(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/travel/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        destinations,
        purpose,
        startDate: startDate || null,
        endDate: endDate || null,
        billable,
        salesOrderRef: billable ? (salesOrderRef || null) : null,
        travelerIds: selectedTravelerIds,
      }),
    });
    if (!res.ok) return;

    setName('');
    setDestinations('');
    setPurpose('');
    setStartDate('');
    setEndDate('');
    setBillable(false);
    setSalesOrderRef('');
    setSelectedTravelerIds([]);
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Travel Tracker</h1>
      <p className="text-sm text-slate-500">Trip management and traveler visibility.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-slate-600">Phase 1 foundation is live: travelers + trips.</div>
          <div className="flex items-center gap-2">
            <Link href="/travel/map" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Travel Map</Link>
            <Link href="/travel/travelers" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage Travelers</Link>
          </div>
        </div>

        <form onSubmit={createTrip} className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip name" className="field" required />
          <input value={destinations} onChange={(e) => setDestinations(e.target.value)} placeholder="Destinations" className="field" />
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose" className="field" />
          <div className="grid grid-cols-2 gap-2">
            <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="field" />
            <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="field" />
          </div>

          <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
            <input type="checkbox" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
            Billable
          </label>
          {billable ? <input value={salesOrderRef} onChange={(e) => setSalesOrderRef(e.target.value)} placeholder="Sales Order #" className="field" /> : <div />}

          <select
            multiple
            value={selectedTravelerIds}
            onChange={(e) => setSelectedTravelerIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="field md:col-span-2 h-24"
          >
            {travelers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>

          <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 md:col-span-1">Create Trip</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">Dates</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Travelers</th>
              <th className="px-4 py-3 font-semibold">Billing</th>
            </tr>
          </thead>
          <tbody>
            {items.map((trip) => (
              <tr key={trip.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4 font-medium"><Link href={`/travel/${trip.id}`} className="text-sky-700 hover:underline">{trip.name}</Link></td>
                <td className="px-4 py-4">{trip.destinations || '—'}</td>
                <td className="px-4 py-4 text-slate-600">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '—'} → {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-4">{trip.status}</td>
                <td className="px-4 py-4">{trip.travelers.map((t) => t.traveler.fullName).join(', ') || '—'}</td>
                <td className="px-4 py-4">{trip.billable ? `Billable${trip.salesOrderRef ? ` (${trip.salesOrderRef})` : ''}` : 'Non-billable'}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No trips yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
