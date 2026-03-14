"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Customer = { id: string; name: string; email: string | null; phone: string | null; paymentTerms?: string | null; additionalFeePercent?: string | number | null };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [additionalFeePercent, setAdditionalFeePercent] = useState('0');

  async function load() {
    const res = await fetch('/api/customers');
    if (res.ok) setItems(await res.json());
  }

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setPaymentTerms('Net 30');
    setAdditionalFeePercent('0');
  }

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, paymentTerms, additionalFeePercent }),
    });
    resetForm();
    setShowCreateModal(false);
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

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Customers</h2>
          <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">+ Add Customer</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Phone</th><th className="px-4 py-3 font-semibold">Payment Terms</th><th className="px-4 py-3 font-semibold">Additional Fee %</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/customers/${c.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">{c.name}</Link></td>
                <td className="px-4 py-4">{c.email || '—'}</td>
                <td className="px-4 py-4">{c.phone || '—'}</td>
                <td className="px-4 py-4">{c.paymentTerms || '—'}</td>
                <td className="px-4 py-4">{Number(c.additionalFeePercent || 0).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Customer</h3>
              <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <form onSubmit={createCustomer} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="field" required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Terms</span>
                <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Payment Terms" className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Additional Fee %</span>
                <input value={additionalFeePercent} onChange={(e) => setAdditionalFeePercent(e.target.value)} type="number" min="0" step="0.01" placeholder="Additional Fee %" className="field" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">Cancel</button>
                <button className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Create Customer</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
