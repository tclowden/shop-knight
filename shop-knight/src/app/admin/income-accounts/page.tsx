"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Item = { id: string; code: string; name: string; description: string | null; active: boolean };

export default function IncomeAccountsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/admin/income-accounts');
    if (!res.ok) return;
    setItems(await res.json());
  }

  async function createItem(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/income-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name, description }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(payload?.error || 'Failed to create income account');
      return;
    }
    setCode('');
    setName('');
    setDescription('');
    setMessage('Income account created.');
    await load();
  }

  async function toggleActive(item: Item) {
    const res = await fetch(`/api/admin/income-accounts/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    });
    if (!res.ok) return;
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Income Accounts</h1>
      <p className="text-sm text-slate-500">Map products to accounting income accounts.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Create Income Account</h2>
        <form onSubmit={createItem} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (e.g. 4010)" className="field" required />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="field" required />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="field" />
          <button disabled={saving} className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create'}</button>
        </form>
        {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Code</th><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Action</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-4 font-medium">{item.code}</td>
                <td className="px-4 py-4">{item.name}</td>
                <td className="px-4 py-4">{item.active ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-4"><button onClick={() => toggleActive(item)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">{item.active ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No income accounts yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
