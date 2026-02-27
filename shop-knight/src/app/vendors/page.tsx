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
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Vendors</h1>
      <p className="text-sm text-zinc-400">Vendor module with notes + tasks on detail pages.</p>
      <Nav />

      <form onSubmit={createVendor} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <button className="rounded bg-blue-600 px-3 py-2">Create Vendor</button>
      </form>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th></tr></thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t border-zinc-800">
                <td className="p-3"><Link href={`/vendors/${v.id}`} className="text-blue-400">{v.name}</Link></td>
                <td className="p-3">{v.email || '—'}</td>
                <td className="p-3">{v.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
