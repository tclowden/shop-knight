"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Rack = { id: string; name: string };
type Space = { id: string; name: string; rackId: string; rack: { id: string; name: string } | null };
type Bin = { id: string; name: string; spaceId: string; space: { id: string; name: string; rack: { id: string; name: string } | null } | null };
type Customer = { id: string; name: string };
type Item = {
  id: string;
  itemNumber: string;
  name: string;
  description: string | null;
  rackId: string | null;
  spaceId: string | null;
  binId: string | null;
  photoUrl: string | null;
  ownerCustomerId: string | null;
  pointOfContact: string | null;
  pointOfContactEmail: string | null;
  pointOfContactPhone: string | null;
  dateEnteredStorage: string | null;
};

export default function EditStorageItemPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [itemNumber, setItemNumber] = useState('');
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredSpaces = useMemo(() => spaces.filter((s) => !rackId || s.rackId === rackId), [spaces, rackId]);
  const filteredBins = useMemo(() => bins.filter((b) => !spaceId || b.spaceId === spaceId), [bins, spaceId]);

  async function loadAll(itemId: string) {
    const [itemRes, rRes, sRes, bRes, cRes] = await Promise.all([
      fetch(`/api/admin/storage/items/${itemId}`),
      fetch('/api/admin/storage/racks'),
      fetch('/api/admin/storage/spaces'),
      fetch('/api/admin/storage/bins'),
      fetch('/api/customers'),
    ]);

    if (!itemRes.ok) {
      setError('Failed to load storage item');
      return;
    }

    const item = (await itemRes.json()) as Item;
    const rackRows = rRes.ok ? ((await rRes.json()) as Rack[]) : [];
    const spaceRows = sRes.ok ? ((await sRes.json()) as Space[]) : [];
    const binRows = bRes.ok ? ((await bRes.json()) as Bin[]) : [];
    const customerRows = cRes.ok ? ((await cRes.json()) as Customer[]) : [];

    setRacks([...rackRows].sort((a, b) => a.name.localeCompare(b.name)));
    setSpaces([...spaceRows].sort((a, b) => a.name.localeCompare(b.name)));
    setBins([...binRows].sort((a, b) => a.name.localeCompare(b.name)));
    setCustomers([...customerRows].sort((a, b) => a.name.localeCompare(b.name)));

    setItemNumber(item.itemNumber || '');
    setName(item.name || '');
    setDescription(item.description || '');
    setRackId(item.rackId || (item.spaceId ? (spaceRows.find((s) => s.id === item.spaceId)?.rackId || '') : ''));
    setSpaceId(item.spaceId || '');
    setBinId(item.binId || '');
    setOwnerCustomerId(item.ownerCustomerId || '');
    setPointOfContact(item.pointOfContact || '');
    setPointOfContactEmail(item.pointOfContactEmail || '');
    setPointOfContactPhone(item.pointOfContactPhone || '');
    setDateEnteredStorage(item.dateEnteredStorage ? item.dateEnteredStorage.slice(0, 10) : '');
    setPhotoUrl(item.photoUrl || null);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      void loadAll(p.id);
    });
  }, [params]);

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
    if (saving || !id) return;
    setSaving(true);
    setError('');

    const form = new FormData();
    form.set('itemNumber', itemNumber);
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
    form.set('clearPhoto', clearPhoto ? 'true' : 'false');
    if (photo) form.set('photo', photo);

    const res = await fetch(`/api/admin/storage/items/${id}`, { method: 'PATCH', body: form });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error || 'Failed to save storage item');
      return;
    }

    router.push('/admin/storage/items');
    router.refresh();
  }

  return <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800"><div className="mb-2 flex items-start justify-between"><h1 className="text-3xl font-semibold tracking-tight">Edit Storage Item</h1><Link href="/admin/storage/items" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Back to Storage Items</Link></div><Nav />
  <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Item Number</span><input className="field" value={itemNumber} onChange={(e) => setItemNumber(e.target.value)} required /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Storage Item Name</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Bay</span><select className="field" value={rackId} onChange={(e) => setRackId(e.target.value)} required>{racks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Shelf</span><select className="field" value={spaceId} onChange={(e) => setSpaceId(e.target.value)} required>{filteredSpaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Pallet (optional)</span><select className="field" value={binId} onChange={(e) => setBinId(e.target.value)}><option value="">No Pallet</option>{filteredBins.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Owner (Customer)</span><select className="field" value={ownerCustomerId} onChange={(e) => setOwnerCustomerId(e.target.value)}><option value="">No Owner</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Point of Contact</span><input className="field" value={pointOfContact} onChange={(e) => setPointOfContact(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Point of Contact Email</span><input type="email" className="field" value={pointOfContactEmail} onChange={(e) => setPointOfContactEmail(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Point of Contact Phone</span><input className="field" value={pointOfContactPhone} onChange={(e) => setPointOfContactPhone(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700"><span className="mb-1 block">Date Entered Storage</span><input type="date" className="field" value={dateEnteredStorage} onChange={(e) => setDateEnteredStorage(e.target.value)} /></label>
    <label className="text-sm font-medium text-slate-700 md:col-span-2"><span className="mb-1 block">Description</span><textarea className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
    <div className="md:col-span-2">
      <span className="mb-1 block text-sm font-medium text-slate-700">Photo</span>
      {photoUrl && !clearPhoto ? <img src={photoUrl} alt="Storage item" className="mb-2 h-24 w-24 rounded border border-slate-200 object-cover" /> : <p className="mb-2 text-sm text-slate-500">No photo uploaded.</p>}
      <input type="file" accept="image/*" className="block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
      {photoUrl ? <label className="mt-2 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={clearPhoto} onChange={(e) => setClearPhoto(e.target.checked)} /> Remove current photo</label> : null}
    </div>
  </div>{error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}<div className="mt-4 flex gap-2"><button disabled={saving} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">{saving ? 'Saving…' : 'Save Changes'}</button><Link href="/admin/storage/items" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</Link></div></form></main>;
}
