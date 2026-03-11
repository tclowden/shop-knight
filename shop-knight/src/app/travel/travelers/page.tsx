"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Traveler = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  knownTravelerNumber?: string | null;
  passportExpiration?: string | null;
  user?: { id: string; name: string; email?: string | null } | null;
  manager?: { id: string; name: string; email?: string | null } | null;
};

type UserOption = { id: string; name: string; email?: string | null; type?: string };

export default function TravelersPage() {
  const [items, setItems] = useState<Traveler[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [knownTravelerNumber, setKnownTravelerNumber] = useState('');
  const [userId, setUserId] = useState('');
  const [managerUserId, setManagerUserId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [travelerRes, userRes] = await Promise.all([
      fetch('/api/travel/travelers'),
      fetch('/api/users'),
    ]);
    if (travelerRes.ok) setItems(await travelerRes.json());
    if (userRes.ok) setUsers(await userRes.json());
  }

  async function createTraveler(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/travel/travelers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, phone, knownTravelerNumber, userId, managerUserId: managerUserId || null }),
    });

    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(payload?.error || 'Failed to add traveler');
      return;
    }

    setFullName('');
    setEmail('');
    setPhone('');
    setKnownTravelerNumber('');
    setUserId('');
    setManagerUserId('');
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Travelers</h1>
      <p className="text-sm text-slate-500">Persistent traveler profiles used across trips.</p>
      <Nav />

      <form onSubmit={createTraveler} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <select value={userId} onChange={(e) => { const next = e.target.value; setUserId(next); const u = users.find((item) => item.id === next); if (u) { setFullName(u.name || ''); setEmail(u.email || ''); } }} className="field" required>
          <option value="">Link to existing user…</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ''}</option>)}
        </select>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="field" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="field" />
        <input value={knownTravelerNumber} onChange={(e) => setKnownTravelerNumber(e.target.value)} placeholder="Known traveler #" className="field" />
        <select value={managerUserId} onChange={(e) => setManagerUserId(e.target.value)} className="field">
          <option value="">Manager (optional)</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 md:col-span-3">{saving ? 'Saving…' : 'Add Traveler'}</button>
      </form>
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Linked User</th>
              <th className="px-4 py-3 font-semibold">Known Traveler #</th>
              <th className="px-4 py-3 font-semibold">Manager</th>
              <th className="px-4 py-3 font-semibold">Passport Exp.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4 font-medium">{t.fullName}</td>
                <td className="px-4 py-4">{t.email || '—'}</td>
                <td className="px-4 py-4">{t.phone || '—'}</td>
                <td className="px-4 py-4">{t.user?.name || '—'}</td>
                <td className="px-4 py-4">{t.knownTravelerNumber || '—'}</td>
                <td className="px-4 py-4">{t.manager?.name || '—'}</td>
                <td className="px-4 py-4">{t.passportExpiration ? new Date(t.passportExpiration).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No travelers yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
