"use client";

import { useEffect, useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { useToast } from '@/components/toast-provider';

type Scope = 'active' | 'archived' | 'all';

type ProfileRow = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  active: boolean;
  _count?: {
    components: number;
    products: number;
  };
};

const emptyForm = {
  name: '',
  description: '',
  isDefault: false,
};

export default function PricingProfilesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [scope, setScope] = useState<Scope>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async (nextScope: Scope = scope) => {
    const res = await fetch(`/api/admin/pricing/pricing-profiles?archived=${nextScope}`);
    if (res.ok) {
      setRows(await res.json());
    }
  };

  useEffect(() => {
    load();
  }, [scope]);

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <PricingPageShell title="Pricing Profiles" description="Create and archive reusable pricing profiles for configurable print pricing.">
      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Pricing Profile' : 'Create Pricing Profile'}</h2>
          <p className="mt-1 text-sm text-slate-500">Profile names are company-scoped and sorted alphabetically.</p>

          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-emerald-500 focus:ring"
                placeholder="e.g. Standard Flatbed"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring"
                placeholder="Optional notes for manual testing."
              />
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Set as company default profile</span>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={!canSave}
              className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                if (!canSave) return;
                const url = editingId ? `/api/admin/pricing/pricing-profiles/${editingId}` : '/api/admin/pricing/pricing-profiles';
                const method = editingId ? 'PATCH' : 'POST';
                const res = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    isDefault: form.isDefault,
                  }),
                });
                if (!res.ok) return push('Could not save pricing profile.', 'error');
                await load();
                resetForm();
                push(editingId ? 'Pricing profile updated.' : 'Pricing profile created.', 'success');
              }}
            >
              {editingId ? 'Save Profile' : 'Create Profile'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
                onClick={resetForm}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Existing Profiles</h3>
              <p className="text-sm text-slate-500">Active and archived profiles for manual verification.</p>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Status</span>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Default</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.description || '—'}</td>
                  <td className="px-4 py-3">{row.isDefault ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {(row._count?.components || 0).toLocaleString()} components / {(row._count?.products || 0).toLocaleString()} products
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-3 text-sm font-semibold text-sky-700"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          name: row.name,
                          description: row.description || '',
                          isDefault: row.isDefault,
                        });
                      }}
                    >
                      Edit
                    </button>
                    {row.active ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-rose-700"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/pricing/pricing-profiles/${row.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: false }),
                          });
                          if (!res.ok) return push('Could not archive pricing profile.', 'error');
                          await load();
                          if (editingId === row.id) resetForm();
                          push('Pricing profile archived.', 'success');
                        }}
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-700"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/pricing/pricing-profiles/${row.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: true }),
                          });
                          if (!res.ok) return push('Could not restore pricing profile.', 'error');
                          await load();
                          push('Pricing profile restored.', 'success');
                        }}
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No pricing profiles found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </PricingPageShell>
  );
}
