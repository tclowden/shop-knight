"use client";

import { useEffect, useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';

type MaterialType = { id: string; name: string };

export default function MaterialTypesPage() {
  const [name, setName] = useState('');
  const [rows, setRows] = useState<MaterialType[]>([]);

  const load = async () => {
    const res = await fetch('/api/admin/pricing/material-types');
    if (res.ok) setRows(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  return (
    <PricingPageShell title="Material Types" description="Material type should be just a name.">
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Material Type</h2>
          <p className="mt-1 text-sm text-slate-500">Simple name-only type records.</p>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring" placeholder="e.g. Acrylic" />
            </label>
            <div>
              <button
                type="button"
                disabled={!canCreate}
                onClick={async () => {
                  if (!canCreate) return;
                  const res = await fetch('/api/admin/pricing/material-types', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim() }),
                  });
                  if (res.ok) {
                    setName('');
                    await load();
                  } else {
                    alert('Could not create material type');
                  }
                }}
                className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Material Type
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Existing Types</div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-4">{row.name}</td></tr>
              ))}
              {rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500">No material types yet.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
    </PricingPageShell>
  );
}
