"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type MapTrip = {
  id: string;
  name: string;
  status: string;
  destinations?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  travelers: string[];
  map: {
    label?: string | null;
    segmentType?: string | null;
    provider?: string | null;
    startAt?: string | null;
  };
};

type RiskAlert = {
  severity: string;
  source: string;
  travelerNames: string[];
  tripId: string;
  tripName: string;
  location: string;
  reason: string;
  recommendedAction: string;
};

const statusColors: Record<string, string> = {
  PRE_TRAVEL: 'bg-sky-100 text-sky-700 border-sky-200',
  IN_TRANSIT: 'bg-amber-100 text-amber-700 border-amber-200',
  ON_SITE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  RETURNED: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELED: 'bg-rose-100 text-rose-700 border-rose-200',
  PLANNING: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export default function TravelMapPage() {
  const [items, setItems] = useState<MapTrip[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);

  async function load() {
    const [mapRes, riskRes] = await Promise.all([fetch('/api/travel/map'), fetch('/api/travel/risk')]);
    if (mapRes.ok) setItems(await mapRes.json());
    if (riskRes.ok) {
      const payload = await riskRes.json();
      setAlerts(Array.isArray(payload?.alerts) ? payload.alerts : []);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Travel Map</h1>
      <p className="text-sm text-slate-500">Live travel visibility and risk snapshot.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Active Traveler Map Feed (Map-ready data)</h2>
        <p className="text-xs text-slate-500">Phase 1 map feed. Hook this into Google Maps or Mapbox in next step.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {items.map((trip) => (
            <article key={trip.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{trip.name}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[trip.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{trip.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">Location: {trip.map?.label || trip.destinations || '—'}</p>
              <p className="text-xs text-slate-500">Travelers: {trip.travelers.join(', ') || '—'}</p>
              <p className="text-xs text-slate-500">Segment: {trip.map?.segmentType || '—'} {trip.map?.provider ? `• ${trip.map.provider}` : ''}</p>
            </article>
          ))}
          {items.length === 0 ? <p className="text-sm text-slate-500">No active trips in pre-travel/transit/on-site statuses.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Risk Alerts (Phase 2 Placeholder)</h2>
        <p className="text-xs text-slate-500">Rule-based placeholder until external intelligence feeds are integrated.</p>
        <div className="mt-3 space-y-2">
          {alerts.map((a, idx) => (
            <article key={`${a.tripId}-${idx}`} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-semibold text-rose-800">{a.tripName} • {a.location}</p>
              <p className="text-xs text-rose-700">Travelers: {a.travelerNames.join(', ')}</p>
              <p className="text-xs text-rose-700">Reason: {a.reason}</p>
              <p className="text-xs text-rose-700">Action: {a.recommendedAction}</p>
            </article>
          ))}
          {alerts.length === 0 ? <p className="text-sm text-slate-500">No current placeholder alerts.</p> : null}
        </div>
      </section>
    </main>
  );
}
