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
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
      <p className="text-sm text-slate-500">Customer module with notes + tasks on detail pages.</p>
      <Nav />

      <form onSubmit={createCustomer} className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="field" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="field" />
        <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Payment Terms" className="field" />
        <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">Create Customer</button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Phone</th><th className="px-4 py-3 font-semibold">Payment Terms</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/customers/${c.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">{c.name}</Link></td>
                <td className="px-4 py-4">{c.email || '—'}</td>
                <td className="px-4 py-4">{c.phone || '—'}</td>
                <td className="px-4 py-4">{c.paymentTerms || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
