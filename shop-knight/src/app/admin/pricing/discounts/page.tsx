"use client";

import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';

type Discount = { id: string; name: string };

export default function DiscountsPage() {
  const [rows, setRows] = useState<Discount[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/pricing/discounts');
    if (res.ok) setRows(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <PricingPageShell title="Discounts" description="Create, edit, and archive discounts for material calculations.">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Discount name" className="h-11 w-full max-w-md rounded-lg border border-slate-300 px-3" />
          <button
            type="button"
            className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
            onClick={async () => {
              if (!name.trim()) return;
              const method = editingId ? 'PATCH' : 'POST';
              const url = editingId ? `/api/admin/pricing/discounts/${editingId}` : '/api/admin/pricing/discounts';
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
              });
              if (res.ok) {
                setName('');
                setEditingId(null);
                await load();
              }
            }}
          >
            {editingId ? 'Update Discount' : 'Create Discount'}
          </button>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="mr-3 text-sm font-semibold text-sky-700" onClick={() => { setEditingId(row.id); setName(row.name); }}>Edit</button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-rose-700"
                    onClick={async () => {
                      const res = await fetch(`/api/admin/pricing/discounts/${row.id}`, { method: 'DELETE' });
                      if (res.ok) await load();
                    }}
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={2}>No discounts yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
