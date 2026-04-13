"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Rack = { id: string; name: string };
type Space = { id: string; name: string; rackId: string; rack: { id: string; name: string } | null };
type Bin = { id: string; name: string; spaceId: string; space: { id: string; name: string; rack: { id: string; name: string } | null } | null };
type Customer = { id: string; name: string };

export default function NewStorageItemPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rackId, setRackId] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [binId, setBinId] = useState('');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [pointOfContact, setPointOfContact] = useState('');
  const [pointOfContactEmail, setPointOfContactEmail] = useState('');
  const [pointOfContactPhone, setPointOfContactPhone] = useState('');
  const [dateEnteredStorage, setDateEnteredStorage] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const [rRes, sRes, bRes, cRes] = await Promise.all([
        fetch('/api/admin/storage/racks'),
        fetch('/api/admin/storage/spaces'),
        fetch('/api/admin/storage/bins'),
        fetch('/api/customers'),
      ]);
      const rackRows = rRes.ok ? ((await rRes.json()) as Rack[]) : [];
      const spaceRows = sRes.ok ? ((await sRes.json()) as Space[]) : [];
      const binRows = bRes.ok ? ((await bRes.json()) as Bin[]) : [];
      const customerRows = cRes.ok ? ((await cRes.json()) as Customer[]) : [];
      setRacks([...rackRows].sort((a, b) => a.name.localeCompare(b.name)));
      setSpaces([...spaceRows].sort((a, b) => a.name.localeCompare(b.name)));
      setBins([...binRows].sort((a, b) => a.name.localeCompare(b.name)));
      setCustomers([...customerRows].sort((a, b) => a.name.localeCompare(b.name)));
      if (spaceRows[0]) {
        setRackId(spaceRows[0].rackId);
        setSpaceId(spaceRows[0].id);
      }
    }
    void load();
  }, []);

  const filteredSpaces = useMemo(() => spaces.filter((s) => !rackId || s.rackId === rackId), [spaces, rackId]);
  const filteredBins = useMemo(() => bins.filter((b) => !spaceId || b.spaceId === spaceId), [bins, spaceId]);

  useEffect(() => {
    if (spaceId && !filteredSpaces.some((s) => s.id === spaceId)) {
      setSpaceId(filteredSpaces[0]?.id || '');
    }
  }, [filteredSpaces, spaceId]);

  useEffect(() => {
    if (binId && !filteredBins.some((b) => b.id === binId)) {
      setBinId('');
    }
  }, [filteredBins, binId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');

    const form = new FormData();
    form.set('name', name);
    form.set('description', description);
    form.set('rackId', rackId);
    form.set('spaceId', spaceId);
    form.set('binId', binId);
    form.set('ownerCustomerId', ownerCustomerId);
    form.set('pointOfContact', pointOfContact);
    form.set('pointOfContactEmail', pointOfContactEmail);
    form.set('pointOfContactPhone', pointOfContactPhone);
    form.set('dateEnteredStorage', dateEnteredStorage);
    if (photo) form.set('photo', photo);

    const res = await fetch('/api/admin/storage/items', { method: 'POST', body: form });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error || 'Failed to create storage item');
      return;
    }

    router.push('/admin/storage/items');
    router.refresh();
  }

  return <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800"><div className="mb-2 flex items-start justify-between"><h1 className="text-3xl font-semibold tracking-tight">Create Storage Item</h1><Link href="/admin/storage/items" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Back to Storage Items</Link></div><Nav />
  <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Storage Item Name</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Rack</span><select className="field" value={rackId} onChange={(e) => setRackId(e.target.value)} required>{filteredSpaces.length === 0 ? <option value="">No racks</option> : racks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Space</span><select className="field" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} required>{filteredSpaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Bin (optional)</span><select className="field" value={binId} onChange={(e) => setBinId(e.target.value)}><option value="">No Bin</option>{filteredBins.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Owner (Customer)</span><select className="field" value={ownerCustomerId} onChange={(e) => setOwnerCustomerId(e.target.value)}><option value="">No Owner</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Point of Contact</span><input className="field" value={pointOfContact} onChange={(e) => setPointOfContact(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Point of Contact Email</span><input type="email" className="field" value={pointOfContactEmail} onChange={(e) => setPointOfContactEmail(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Point of Contact Phone</span><input className="field" value={pointOfContactPhone} onChange={(e) => setPointOfContactPhone(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Date Entered Storage</span><input type="date" className="field" value={dateEnteredStorage} onChange={(e) => setDateEnteredStorage(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700 md:col-span-2"><span className="mb-1 block">Description</span><textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700 md:col-span-2"><span className="mb-1 block">Photo</span><input type="file" accept="image/*" className="block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /></label>
  </div>{error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}<div className="mt-4 flex gap-2"><button disabled={saving} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">{saving ? 'Creating…' : 'Create Storage Item'}</button><Link href="/admin/storage/items" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</Link></div></form></main>;
}
