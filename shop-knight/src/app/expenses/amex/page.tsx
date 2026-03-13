"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Txn = {
  id: string;
  postedAt: string;
  merchant: string;
  amount: string | number;
  currency: string;
  reference: string | null;
  status: 'UNMATCHED' | 'MATCHED' | 'IGNORED';
  expenseLine?: { id: string; merchant: string; amount: string | number } | null;
};

export default function AmexQueuePage() {
  const [items, setItems] = useState<Txn[]>([]);
  const [statusFilter, setStatusFilter] = useState('UNMATCHED');

  const [postedAt, setPostedAt] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [currency, setCurrency] = useState('USD');
  const [reference, setReference] = useState('');

  async function load() {
    const res = await fetch(`/api/expenses/amex?status=${statusFilter}`);
    if (!res.ok) return;
    setItems(await res.json());
  }

  async function addTxn(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/expenses/amex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postedAt, merchant, amount, currency, reference, source: 'manual' }),
    });
    if (!res.ok) return;
    setPostedAt('');
    setMerchant('');
    setAmount('0.00');
    setCurrency('USD');
    setReference('');
    await load();
  }

  async function ignoreTxn(id: string) {
    await fetch(`/api/expenses/amex/${id}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseLineId: '' }),
    });
    await load();
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Amex Transaction Queue</h1>
      <p className="text-sm text-slate-500">Staging area for card transactions before full Amex account sync is connected.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Add Transaction (Manual)</h2>
        <form onSubmit={addTxn} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
          <input type="date" value={postedAt} onChange={(e) => setPostedAt(e.target.value)} className="field" required />
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} className="field" placeholder="Merchant" required />
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="field" placeholder="Amount" required />
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="field" placeholder="Currency" />
          <input value={reference} onChange={(e) => setReference(e.target.value)} className="field" placeholder="Reference" />
          <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 md:col-span-5">Add Transaction</button>
        </form>
      </section>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">Status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-10 w-56">
          <option value="UNMATCHED">Unmatched</option>
          <option value="MATCHED">Matched</option>
          <option value="IGNORED">Ignored</option>
          <option value="ALL">All</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Merchant</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Matched Line</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{new Date(t.postedAt).toLocaleDateString()}</td>
                <td className="px-4 py-4">{t.merchant}</td>
                <td className="px-4 py-4">{t.currency} {Number(t.amount).toFixed(2)}</td>
                <td className="px-4 py-4">{t.reference || '—'}</td>
                <td className="px-4 py-4">{t.status}</td>
                <td className="px-4 py-4">{t.expenseLine ? `${t.expenseLine.merchant} ($${Number(t.expenseLine.amount).toFixed(2)})` : '—'}</td>
                <td className="px-4 py-4 text-right">
                  {t.status === 'UNMATCHED' ? <button type="button" onClick={() => ignoreTxn(t.id)} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Ignore</button> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No Amex transactions found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
