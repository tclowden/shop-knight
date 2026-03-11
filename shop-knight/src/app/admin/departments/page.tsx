"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Department = { id: string; name: string; active: boolean };

export default function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/admin/departments');
    if (!res.ok) return;
    setItems(await res.json());
  }

  async function createDepartment(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(payload?.error || 'Failed to create department');
      return;
    }
    setName('');
    setMessage('Department created.');
    await load();
  }

  async function toggleActive(item: Department) {
    const res = await fetch(`/api/admin/departments/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    });
    if (!res.ok) return;
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Departments</h1>
      <p className="text-sm text-slate-500">Manage departments used across users and sales records.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Create Department</h2>
        <form onSubmit={createDepartment} className="mt-3 flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="field w-72" required />
          <button disabled={saving} className="inline-flex h-11 items-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create'}</button>
        </form>
        {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Action</th></tr></thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-4 font-medium">{d.name}</td>
                <td className="px-4 py-4">{d.active ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-4"><button onClick={() => toggleActive(d)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">{d.active ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No departments yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
