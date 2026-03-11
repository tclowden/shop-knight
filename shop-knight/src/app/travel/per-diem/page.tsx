"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Trip = {
  id: string;
  name: string;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinations?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  travelers: Array<{ traveler: { id: string; fullName: string } }>;
};

type PerDiemResult = {
  dailyRate: number;
  lodgingRate?: number | null;
  days: number;
  travelerCount: number;
  total: number;
  year: number;
  county?: string | null;
  destination: string;
};

export default function PerDiemRequestsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingId, setLoadingId] = useState('');
  const [results, setResults] = useState<Record<string, PerDiemResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch('/api/travel/trips');
    if (!res.ok) return;
    setTrips(await res.json());
  }

  async function generateForTrip(trip: Trip) {
    setLoadingId(trip.id);
    setErrors((prev) => ({ ...prev, [trip.id]: '' }));

    const res = await fetch(`/api/travel/trips/${trip.id}/per-diem`, { method: 'POST' });
    const payload = await res.json().catch(() => ({}));
    setLoadingId('');

    if (!res.ok) {
      setErrors((prev) => ({ ...prev, [trip.id]: payload?.error || 'Failed to generate per-diem' }));
      return;
    }

    setResults((prev) => ({ ...prev, [trip.id]: payload }));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Per-Diem Requests</h1>
      <p className="text-sm text-slate-500">Manage per-diem generation by trip.</p>
      <Nav />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">Dates</th>
              <th className="px-4 py-3 font-semibold">Travelers</th>
              <th className="px-4 py-3 font-semibold">Per-Diem</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => {
              const result = results[trip.id];
              const error = errors[trip.id];
              return (
                <tr key={trip.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                  <td className="px-4 py-4 font-medium">
                    <Link href={`/travel/${trip.id}`} className="text-sky-700 hover:underline">{trip.name}</Link>
                    <p className="text-xs text-slate-500">{trip.status}</p>
                  </td>
                  <td className="px-4 py-4">{trip.destinationCity && trip.destinationState ? `${trip.destinationCity}, ${trip.destinationState}` : (trip.destinations || '—')}</td>
                  <td className="px-4 py-4 text-slate-600">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '—'} → {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-4">{trip.travelers.map((t) => t.traveler.fullName).join(', ') || '—'}</td>
                  <td className="px-4 py-4 text-xs">
                    {result ? (
                      <div className="space-y-1 text-slate-700">
                        <p><span className="font-semibold">M&IE:</span> ${result.dailyRate}/day</p>
                        <p><span className="font-semibold">Lodging:</span> {result.lodgingRate ? `$${result.lodgingRate}/night` : '—'}</p>
                        <p><span className="font-semibold">Total:</span> ${result.total}</p>
                        <p className="text-slate-500">{result.destination} • {result.year}{result.county ? ` • ${result.county} County` : ''}</p>
                      </div>
                    ) : (
                      <span className="text-slate-500">Not generated</span>
                    )}
                    {error ? <p className="mt-1 text-rose-600">{error}</p> : null}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => generateForTrip(trip)}
                      disabled={loadingId === trip.id}
                      className="inline-flex h-9 items-center rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      {loadingId === trip.id ? 'Generating…' : 'Generate'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No trips found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
