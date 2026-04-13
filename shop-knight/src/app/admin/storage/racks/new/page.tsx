"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

export default function NewRackPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/storage/racks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code }) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error || 'Failed to create rack');
      return;
    }
    router.push('/admin/storage');
    router.refresh();
  }

  return <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800"><div className="mb-2 flex items-start justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">Create Rack</h1></div><Link href="/admin/storage" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Back to Storage</Link></div><Nav />
  <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><label className="block text-sm font-medium text-slate-700">Rack Name<input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="mt-3 block text-sm font-medium text-slate-700">Code<input className="field mt-1" value={code} onChange={(e) => setCode(e.target.value)} /></label>{error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}<div className="mt-4 flex gap-2"><button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white">Create Rack</button><Link href="/admin/storage" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold">Cancel</Link></div></form></main>;
}
