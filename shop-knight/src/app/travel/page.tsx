"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function TravelPage() {
  const [items, setItems] = useState<Trip[]>([]);

  async function load() {
    const res = await fetch('/api/travel/trips');
    if (!res.ok) return;
    setItems(await res.json());
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

      <section className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-600">Phase 1 foundation is live: travelers + trips.</div>
        <Link href="/travel/travelers" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage Travelers</Link>
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
                <td className="px-4 py-4 font-medium">{trip.name}</td>
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
