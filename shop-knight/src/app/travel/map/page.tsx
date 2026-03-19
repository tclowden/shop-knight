"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Nav } from '@/components/nav';

type MapTrip = {
  id: string;
  name: string;
  status: string;
  destinations?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  salesOrderRef?: string | null;
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

const statusOptions = ['ALL', 'PLANNING', 'PRE_TRAVEL', 'IN_TRANSIT', 'ON_SITE', 'RETURNED', 'CANCELED'];

type LeafletLib = {
  map: (el: HTMLElement) => { setView: (coords: [number, number], zoom: number) => void; remove: () => void; fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => void };
  tileLayer: (url: string, opts: { attribution: string; maxZoom?: number }) => { addTo: (map: unknown) => void };
  marker: (coords: [number, number]) => { addTo: (map: unknown) => { bindPopup: (html: string) => void } };
  latLngBounds: (coords: Array<[number, number]>) => unknown;
};

declare global { interface Window { L?: LeafletLib } }

async function loadLeaflet(): Promise<LeafletLib | null> {
  if (typeof window === 'undefined') return null;
  if (window.L) return window.L;

  if (!document.querySelector('link[data-leaflet="1"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '1');
    document.head.appendChild(link);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-leaflet="1"]') as HTMLScriptElement | null;
    if (existing) {
      if (window.L) resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Leaflet')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.setAttribute('data-leaflet', '1');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Leaflet'));
    document.body.appendChild(script);
  });

  return window.L || null;
}

export default function TravelMapPage() {
  const [items, setItems] = useState<MapTrip[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<{ setView: (coords: [number, number], zoom: number) => void; remove: () => void; fitBounds: (bounds: unknown, options?: { padding?: [number, number] }) => void } | null>(null);

  const load = useCallback(async () => {
    const statusQuery = statusFilter === 'ACTIVE' || statusFilter === 'ALL' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
    const [mapRes, riskRes] = await Promise.all([fetch(`/api/travel/map${statusQuery}`), fetch('/api/travel/risk')]);
    if (mapRes.ok) setItems(await mapRes.json());
    if (riskRes.ok) {
      const payload = await riskRes.json();
      setAlerts(Array.isArray(payload?.alerts) ? payload.alerts : []);
    }
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    let base = items;
    if (statusFilter === 'ACTIVE') base = items.filter((t) => ['PRE_TRAVEL', 'IN_TRANSIT', 'ON_SITE'].includes(t.status));
    if (!text) return base;
    return base.filter((trip) => {
      const haystack = [
        trip.name,
        trip.map?.label || '',
        trip.destinations || '',
        trip.destinationCity || '',
        trip.destinationState || '',
        trip.salesOrderRef || '',
        ...(trip.travelers || []),
      ].join(' ').toLowerCase();
      return haystack.includes(text);
    });
  }, [items, search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!mapRef.current) return;
      const L = await loadLeaflet();
      if (!L || cancelled || !mapRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapRef.current);
      leafletMapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      const geocodeItems = filtered
        .map((trip) => ({ id: trip.id, location: trip.map?.label || trip.destinations || '' }))
        .filter((item) => item.location);

      const res = await fetch('/api/travel/map/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: geocodeItems }),
      });
      const payload = await res.json().catch(() => ({}));
      const points = Array.isArray(payload?.points) ? payload.points : [];

      if (!points.length) {
        map.setView([39.5, -98.35], 4);
        return;
      }

      const bounds: Array<[number, number]> = [];
      for (const point of points) {
        const trip = filtered.find((t) => t.id === point.id);
        if (!trip) continue;
        bounds.push([point.lat, point.lon]);
        const marker = L.marker([point.lat, point.lon]).addTo(map);
        marker.bindPopup(`<strong>${trip.name}</strong><br/>${point.location}<br/>Status: ${trip.status}`);
      }

      if (bounds.length === 1) map.setView(bounds[0], 7);
      else map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
    }

    renderMap();
    return () => { cancelled = true; };
  }, [filtered]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Travel Map</h1>
      <p className="text-sm text-slate-500">Operational trip map feed with quick destination links.</p>
      <Nav />

      <section className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-10 w-52">
          <option value="ACTIVE">Active (default)</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trip, traveler, destination, SO ref..." className="field max-w-md" />
        <button onClick={load} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Refresh</button>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Interactive Map</h2>
        <p className="text-xs text-slate-500">Pins are based on current trip location labels/destinations.</p>
        <div ref={mapRef} className="mt-3 h-[420px] w-full rounded-lg border border-slate-200" />
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Trip Location Feed</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {filtered.map((trip) => {
            const location = trip.map?.label || trip.destinations || '';
            const mapsUrl = location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : '';
            return (
              <article key={trip.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{trip.name}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[trip.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{trip.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">Location: {location || '—'}</p>
                <p className="text-xs text-slate-500">Travelers: {trip.travelers.join(', ') || '—'}</p>
                <p className="text-xs text-slate-500">Segment: {trip.map?.segmentType || '—'} {trip.map?.provider ? `• ${trip.map.provider}` : ''}</p>
                <p className="text-xs text-slate-500">SO Ref: {trip.salesOrderRef || '—'}</p>
                {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-medium text-sky-700 hover:underline">Open in Google Maps ↗</a> : null}
              </article>
            );
          })}
          {filtered.length === 0 ? <p className="text-sm text-slate-500">No trips for the current filters.</p> : null}
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
