"use client";

import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { useToast } from '@/components/toast-provider';

type Discount = { id: string; name: string; active?: boolean };
type Scope = 'active' | 'archived' | 'all';

export default function DiscountsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<Discount[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('active');

  const load = async (nextScope: Scope = scope) => {
    const res = await fetch(`/api/admin/pricing/discounts?archived=${nextScope}`);
    if (res.ok) setRows(await res.json());
  };

  useEffect(() => { load(); }, [scope]);

  return (
    <PricingPageShell title="Discounts" description="Create, edit, and archive discounts for material calculations.">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Discount name" className="h-11 w-full max-w-md rounded-lg border border-slate-300 px-3" />
          <button
            type="button"
            className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
            onClick={async () => {
              if (!name.trim()) return push('Discount name is required.', 'error');
              const method = editingId ? 'PATCH' : 'POST';
              const url = editingId ? `/api/admin/pricing/discounts/${editingId}` : '/api/admin/pricing/discounts';
              const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
              });
              if (!res.ok) return push('Could not save discount.', 'error');
              setName('');
              setEditingId(null);
              await load();
              push(editingId ? 'Discount updated.' : 'Discount created.', 'success');
            }}
          >
            {editingId ? 'Update Discount' : 'Create Discount'}
          </button>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <h3 className="font-semibold">Discounts</h3>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="h-9 rounded border border-slate-300 bg-white px-2 text-sm">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="mr-3 text-sm font-semibold text-sky-700" onClick={() => { setEditingId(row.id); setName(row.name); push('Loaded discount for editing.', 'info'); }}>Edit</button>
                  {row.active !== false ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-rose-700"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/pricing/discounts/${row.id}`, { method: 'DELETE' });
                        if (!res.ok) return push('Could not archive discount.', 'error');
                        await load();
                        push('Discount archived.', 'success');
                      }}
                    >Archive</button>
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-semibold text-emerald-700"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/pricing/discounts/${row.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ active: true }),
                        });
                        if (!res.ok) return push('Could not restore discount.', 'error');
                        await load();
                        push('Discount restored.', 'success');
                      }}
                    >Restore</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={2}>No discounts found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
