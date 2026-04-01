"use client";

import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { useToast } from '@/components/toast-provider';

type Row = { id: string; name: string; formula: string; uom: string; createdAt: string };

export default function PricingFormulasPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', formula: '', uom: '' });

  const load = async () => {
    const res = await fetch('/api/admin/pricing/formulas');
    if (res.ok) setRows(await res.json());
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.formula.trim() || !form.uom.trim()) {
      return push('Name, Formula, and UOM are required.', 'error');
    }

    const url = editingId ? `/api/admin/pricing/formulas/${editingId}` : '/api/admin/pricing/formulas';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) return push('Could not save pricing formula.', 'error');

    setForm({ name: '', formula: '', uom: '' });
    setEditingId(null);
    await load();
    push(editingId ? 'Pricing formula updated.' : 'Pricing formula created.', 'success');
  };

  return (
    <PricingPageShell title="Pricing Formulas" description="Create and manage pricing formulas.">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Formula' : 'Create Formula'}</h2>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={async () => {
              const res = await fetch('/api/admin/pricing/formulas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seedDefaults: true }),
              });
              if (!res.ok) return push('Could not seed default formulas.', 'error');
              await load();
              push('Default formulas loaded (Area, Board_Feet, Total_Area).', 'success');
            }}
          >
            Load Required Defaults
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Name
            <input className="field mt-1" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </label>
          <label className="text-sm font-medium text-slate-700">Formula
            <input className="field mt-1" value={form.formula} onChange={(e) => setForm((s) => ({ ...s, formula: e.target.value }))} />
          </label>
          <label className="text-sm font-medium text-slate-700">UOM
            <input className="field mt-1" value={form.uom} onChange={(e) => setForm((s) => ({ ...s, uom: e.target.value }))} />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={save} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
            {editingId ? 'Save Formula' : 'Create Formula'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm({ name: '', formula: '', uom: '' }); }}
              className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Formula</th>
              <th className="px-4 py-3 font-semibold">UOM</th>
              <th className="px-4 py-3 font-semibold">Created At</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                <td className="px-4 py-3">{row.formula}</td>
                <td className="px-4 py-3">{row.uom}</td>
                <td className="px-4 py-3">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="mr-3 text-sm font-semibold text-sky-700"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({ name: row.name, formula: row.formula, uom: row.uom });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-sm font-semibold text-rose-700"
                    onClick={async () => {
                      const res = await fetch(`/api/admin/pricing/formulas/${row.id}`, { method: 'DELETE' });
                      if (!res.ok) return push('Could not archive formula.', 'error');
                      await load();
                      push('Pricing formula archived.', 'success');
                    }}
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No pricing formulas yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
