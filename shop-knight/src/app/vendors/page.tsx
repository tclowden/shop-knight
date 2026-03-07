"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Vendor = { id: string; name: string; email: string | null; phone: string | null };

export default function VendorsPage() {
  const [items, setItems] = useState<Vendor[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  async function load() {
    const res = await fetch('/api/vendors');
    if (res.ok) setItems(await res.json());
  }

  async function createVendor(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/vendors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone }),
    });
    setName(''); setEmail(''); setPhone('');
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Vendors</h1>
      <p className="text-sm text-slate-500">Vendor module with notes + tasks on detail pages.</p>
      <Nav />

      <form onSubmit={createVendor} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="field" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="field" />
        <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">Create Vendor</button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Phone</th></tr></thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/vendors/${v.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">{v.name}</Link></td>
                <td className="px-4 py-4">{v.email || '—'}</td>
                <td className="px-4 py-4">{v.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
