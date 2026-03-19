"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Traveler = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  knownTravelerNumber?: string | null;
  loyaltyAirline?: string | null;
  loyaltyHotel?: string | null;
};

type Trip = {
  id: string;
  name: string;
  destinationCity?: string | null;
  destinationState?: string | null;
  destinations?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  salesOrderRef?: string | null;
  status: 'PLANNING' | 'PRE_TRAVEL' | 'IN_TRANSIT' | 'ON_SITE' | 'RETURNED' | 'CANCELED';
  travelers: Array<{ traveler: Traveler }>;
};

const statuses = ['PLANNING', 'PRE_TRAVEL', 'IN_TRANSIT', 'ON_SITE', 'RETURNED', 'CANCELED'] as const;

export default function TravelBookingPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/travel/trips');
    if (!res.ok) return;
    setTrips(await res.json());
  }

  async function updateStatus(tripId: string, status: string) {
    setSavingId(tripId);
    setMessage('');
    const res = await fetch(`/api/travel/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => ({}));
    setSavingId('');

    if (!res.ok) {
      setMessage(payload?.error || 'Failed to update trip status');
      return;
    }

    setMessage('Trip status updated.');
    await load();
  }

  const filteredTrips = useMemo(() => {
    if (statusFilter === 'OPEN') return trips.filter((t) => !['RETURNED', 'CANCELED'].includes(t.status));
    if (statusFilter === 'ALL') return trips;
    return trips.filter((t) => t.status === statusFilter);
  }, [trips, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Travel Booking Board</h1>
      <p className="text-sm text-slate-500">Flight-booking view with traveler KTN and rewards details.</p>
      <Nav />

      <section className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">Status filter</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-10 w-56">
          <option value="OPEN">Open (default)</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="ALL">All</option>
        </select>
      </section>

      {message ? <p className="mb-3 text-xs text-slate-600">{message}</p> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Trip</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">Dates</th>
              <th className="px-4 py-3 font-semibold">SO Ref</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Traveler Booking Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.map((trip) => (
              <tr key={trip.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                <td className="px-4 py-4 font-medium">{trip.name}</td>
                <td className="px-4 py-4">{trip.destinationCity && trip.destinationState ? `${trip.destinationCity}, ${trip.destinationState}` : (trip.destinations || '—')}</td>
                <td className="px-4 py-4 text-slate-600">{trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '—'} → {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-4">{trip.salesOrderRef || '—'}</td>
                <td className="px-4 py-4">
                  <select
                    value={trip.status}
                    onChange={(e) => updateStatus(trip.id, e.target.value)}
                    className="field h-9 text-xs"
                    disabled={savingId === trip.id}
                  >
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-4">
                  <div className="space-y-2">
                    {trip.travelers.map((entry) => (
                      <div key={entry.traveler.id} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
                        <p className="font-semibold text-slate-800">{entry.traveler.fullName}</p>
                        <p className="text-slate-600">Email: {entry.traveler.email || '—'} • Phone: {entry.traveler.phone || '—'}</p>
                        <p className="text-slate-600">KTN: {entry.traveler.knownTravelerNumber || '—'}</p>
                        <p className="text-slate-600">Airline Rewards: {entry.traveler.loyaltyAirline || '—'}</p>
                        <p className="text-slate-600">Hotel Rewards: {entry.traveler.loyaltyHotel || '—'}</p>
                      </div>
                    ))}
                    {trip.travelers.length === 0 ? <p className="text-xs text-slate-500">No travelers assigned.</p> : null}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTrips.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No trips found for this filter.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
