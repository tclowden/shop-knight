"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Traveler = { id: string; fullName: string };
type TravelerOption = { id: string; fullName: string };
type Trip = {
  id: string;
  name: string;
  destinations?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
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
  const [travelersMessage, setTravelersMessage] = useState('');
  const [segmentType, setSegmentType] = useState('FLIGHT');
  const [status, setStatus] = useState('PLANNING');
  const [tripName, setTripName] = useState('');
  const [tripDestinations, setTripDestinations] = useState('');
  const [tripPurpose, setTripPurpose] = useState('');
  const [tripStartDate, setTripStartDate] = useState('');
  const [tripEndDate, setTripEndDate] = useState('');
  const [tripBillable, setTripBillable] = useState(false);
  const [tripSalesOrderRef, setTripSalesOrderRef] = useState('');
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripMessage, setTripMessage] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [savingDestination, setSavingDestination] = useState(false);
  const [destinationMessage, setDestinationMessage] = useState('');
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
      setTripName(tripData.name || '');
      setTripDestinations(tripData.destinations || '');
      setTripPurpose(tripData.purpose || '');
      setTripStartDate(tripData.startDate ? String(tripData.startDate).slice(0, 10) : '');
      setTripEndDate(tripData.endDate ? String(tripData.endDate).slice(0, 10) : '');
      setTripBillable(Boolean(tripData.billable));
      setTripSalesOrderRef(tripData.salesOrderRef || '');
      setDestinationCity(tripData.destinationCity || '');
      setDestinationState(tripData.destinationState || '');
      setSelectedTravelerIds((tripData.travelers || []).map((t: { traveler: { id: string } }) => t.traveler.id));
    }
    if (segmentRes.ok) setSegments(await segmentRes.json());
  }

  async function saveTravelers(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;

    setSavingTravelers(true);
    setTravelersMessage('');
    const res = await fetch(`/api/travel/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ travelerIds: selectedTravelerIds }),
    });
    setSavingTravelers(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setTravelersMessage(payload?.error || 'Failed to save travelers');
      return;
    }
    setTravelersMessage('Travelers saved.');
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

  async function saveTripDetails(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;

    setSavingTrip(true);
    setTripMessage('');
    const res = await fetch(`/api/travel/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tripName,
        destinations: tripDestinations || null,
        purpose: tripPurpose || null,
        startDate: tripStartDate || null,
        endDate: tripEndDate || null,
        billable: tripBillable,
        salesOrderRef: tripSalesOrderRef || null,
      }),
    });
    setSavingTrip(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setTripMessage(payload?.error || 'Failed to save trip details');
      return;
    }

    setTripMessage('Trip details saved.');
    await load(trip.id);
  }

  async function saveDestination(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;

    setSavingDestination(true);
    setDestinationMessage('');
    const res = await fetch(`/api/travel/trips/${trip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationCity: destinationCity || null, destinationState: destinationState || null }),
    });
    setSavingDestination(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setDestinationMessage(payload?.error || 'Failed to save destination');
      return;
    }
    setDestinationMessage('Destination saved.');
    await load(trip.id);
  }

  async function generatePerDiem() {
    if (!trip) return;
    setLoadingPerDiem(true);
    setPerDiemMessage('');

    const res = await fetch(`/api/travel/trips/${trip.id}/per-diem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationCity, destinationState }),
    });
    const payload = await res.json().catch(() => ({}));
    setLoadingPerDiem(false);

    if (!res.ok) {
      setPerDiemMessage(payload?.error || 'Failed to generate per-diem draft');
      return;
    }

    if (trip) await load(trip.id);

    setPerDiemMessage(`Per-diem request created (${payload.requestStatus}): ${payload.total} for ${payload.travelerCount} traveler(s), ${payload.days} day(s) at ${payload.dailyRate}/day.`);
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
        <h2 className="text-lg font-semibold">Trip Details</h2>
        <form onSubmit={saveTripDetails} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={tripName} onChange={(e) => setTripName(e.target.value)} placeholder="Trip name" className="field" required />
          <input value={tripDestinations} onChange={(e) => setTripDestinations(e.target.value)} placeholder="Destinations" className="field" />
          <input value={tripPurpose} onChange={(e) => setTripPurpose(e.target.value)} placeholder="Purpose" className="field" />
          <label className="field inline-flex items-center gap-2"><input type="checkbox" checked={tripBillable} onChange={(e) => setTripBillable(e.target.checked)} /> Billable</label>
          <input value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)} type="date" className="field" />
          <input value={tripEndDate} onChange={(e) => setTripEndDate(e.target.value)} type="date" className="field" />
          <input value={tripSalesOrderRef} onChange={(e) => setTripSalesOrderRef(e.target.value)} placeholder="Sales order ref" className="field" />
          <button disabled={savingTrip} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{savingTrip ? 'Saving…' : 'Save Trip Details'}</button>
        </form>
        {tripMessage ? <p className="mt-2 text-xs text-slate-600">{tripMessage}</p> : null}
      </section>

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
            <p>Destination: <span className="font-medium">{trip.destinationCity && trip.destinationState ? `${trip.destinationCity}, ${trip.destinationState}` : '—'}</span></p>
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
        <h2 className="text-lg font-semibold">Destination for Per-Diem</h2>
        <form onSubmit={saveDestination} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} placeholder="City" className="field" />
          <select value={destinationState} onChange={(e) => setDestinationState(e.target.value)} className="field">
            <option value="">State…</option>
            {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'].map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <div className="md:col-span-2">
            <button disabled={savingDestination} className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{savingDestination ? 'Saving…' : 'Save Destination'}</button>
            {destinationMessage ? <p className="mt-2 text-xs text-slate-600">{destinationMessage}</p> : null}
          </div>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Travelers</h2>
        <p className="mt-1 text-xs text-slate-500">Select traveler profiles to attach to this trip, then save.</p>
        <form onSubmit={saveTravelers} className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {allTravelers.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTravelerIds.includes(t.id)}
                  onChange={(e) => {
                    setSelectedTravelerIds((prev) => {
                      if (e.target.checked) return prev.includes(t.id) ? prev : [...prev, t.id];
                      return prev.filter((id) => id !== t.id);
                    });
                  }}
                />
                <span>{t.fullName}</span>
              </label>
            ))}
          </div>
          {allTravelers.length === 0 ? <p className="text-xs text-slate-500">No traveler profiles found. Add them in Travel → Manage Travelers.</p> : null}
          <div className="flex items-center gap-3">
            <button disabled={savingTravelers} className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{savingTravelers ? 'Saving…' : 'Save Travelers'}</button>
            {travelersMessage ? <p className="text-xs text-slate-600">{travelersMessage}</p> : null}
          </div>
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
