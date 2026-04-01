"use client";

import { useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';

type MaterialCategory = {
  id: string;
  materialType: string;
  name: string;
};

const MATERIAL_TYPE_OPTIONS = ['Paper', 'Vinyl', 'Substrate', 'Ink'];

export default function MaterialCategoriesPage() {
  const [materialType, setMaterialType] = useState(MATERIAL_TYPE_OPTIONS[0]);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<MaterialCategory[]>([
    { id: '1', materialType: 'Paper', name: 'Cardstock' },
    { id: '2', materialType: 'Vinyl', name: 'Cast Vinyl' },
  ]);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  return (
    <PricingPageShell title="Material Categories" description="Categories have a Material Type dropdown and a Name field.">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create Material Category</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Material Type</span>
            <select
              value={materialType}
              onChange={(event) => setMaterialType(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring"
            >
              {MATERIAL_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring"
              placeholder="e.g. Corrugated"
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate) return;
              setRows((current) => [
                ...current,
                { id: `${Date.now()}`, materialType, name: name.trim() },
              ]);
              setName('');
            }}
            className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Category
          </button>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Material Type</th>
              <th className="px-4 py-3 font-semibold">Name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-4">{row.materialType}</td>
                <td className="px-4 py-4">{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
