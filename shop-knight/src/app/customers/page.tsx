"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Customer = { id: string; name: string; email: string | null; phone: string | null; paymentTerms?: string | null };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  async function load() {
    const res = await fetch('/api/customers');
    if (res.ok) setItems(await res.json());
  }

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, paymentTerms }),
    });
    setName(''); setEmail(''); setPhone(''); setPaymentTerms('Net 30');
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <p className="text-sm text-zinc-400">Customer module with notes + tasks on detail pages.</p>
      <Nav />

      <form onSubmit={createCustomer} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Payment Terms" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <button className="rounded bg-blue-600 px-3 py-2">Create Customer</button>
      </form>

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Payment Terms</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800">
                <td className="p-3"><Link href={`/customers/${c.id}`} className="text-blue-400">{c.name}</Link></td>
                <td className="p-3">{c.email || '—'}</td>
                <td className="p-3">{c.phone || '—'}</td>
                <td className="p-3">{c.paymentTerms || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
