"use client";

import { useEffect, useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';

type MaterialType = { id: string; name: string };
type MaterialCategory = { id: string; name: string; materialType: MaterialType };

export default function MaterialCategoriesPage() {
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [materialTypeId, setMaterialTypeId] = useState('');
  const [name, setName] = useState('');
  const [rows, setRows] = useState<MaterialCategory[]>([]);

  const load = async () => {
    const [typesRes, catsRes] = await Promise.all([
      fetch('/api/admin/pricing/material-types'),
      fetch('/api/admin/pricing/material-categories'),
    ]);
    if (typesRes.ok) {
      const data = await typesRes.json();
      setTypes(data);
      if (!materialTypeId && data.length > 0) setMaterialTypeId(data[0].id);
    }
    if (catsRes.ok) setRows(await catsRes.json());
  };

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => name.trim().length > 0 && materialTypeId.length > 0, [name, materialTypeId]);

  return (
    <PricingPageShell title="Material Categories" description="Categories have a Material Type dropdown and a Name field.">
      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Material Category</h2>
          <p className="mt-1 text-sm text-slate-500">Each category belongs to one material type.</p>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Material Type</span>
              <select value={materialTypeId} onChange={(event) => setMaterialTypeId(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring">
                {types.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring" placeholder="e.g. Corrugated" />
            </label>
          </div>
          <div className="mt-4">
            <button
              type="button"
              disabled={!canCreate}
              onClick={async () => {
                if (!canCreate) return;
                const res = await fetch('/api/admin/pricing/material-categories', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ materialTypeId, name: name.trim() }),
                });
                if (res.ok) {
                  setName('');
                  await load();
                } else {
                  alert('Could not create category');
                }
              }}
              className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Category
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Existing Categories</div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Material Type</th><th className="px-4 py-3 font-semibold">Name</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-4">{row.materialType?.name}</td><td className="px-4 py-4">{row.name}</td></tr>
              ))}
              {rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={2}>No categories yet.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
    </PricingPageShell>
  );
}
