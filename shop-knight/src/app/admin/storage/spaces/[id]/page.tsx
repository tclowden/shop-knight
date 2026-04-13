"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type Rack = { id: string; name: string };

export default function EditSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [racks, setRacks] = useState<Rack[]>([]);
  const [rackId, setRackId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/admin/storage/racks').then((r) => r.ok ? r.json() : []).then((rows: Rack[]) => setRacks(rows));
    params.then(async ({ id }) => { setId(id); const res = await fetch(`/api/admin/storage/spaces/${id}`); if (!res.ok) return; const row = await res.json(); setRackId(row.rackId || ''); setName(row.name || ''); setCode(row.code || ''); });
  }, [params]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/admin/storage/spaces/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rackId, name, code }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d?.error || 'Failed to save space'); return; }
    router.push('/admin/storage'); router.refresh();
  }

  return <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800"><div className="mb-2 flex items-start justify-between"><h1 className="text-3xl font-semibold tracking-tight">Edit Space</h1><Link href="/admin/storage" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Back to Storage</Link></div><Nav />
  <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><label className="block text-sm font-medium text-slate-700">Rack<select className="field mt-1" value={rackId} onChange={(e) => setRackId(e.target.value)} required>{racks.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label className="mt-3 block text-sm font-medium text-slate-700">Space Name<input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="mt-3 block text-sm font-medium text-slate-700">Code<input className="field mt-1" value={code} onChange={(e) => setCode(e.target.value)} /></label>{error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}<div className="mt-4 flex gap-2"><button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">Save Changes</button><Link href="/admin/storage" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</Link></div></form></main>;
}
