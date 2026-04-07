"use client";

import { useEffect, useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { useToast } from '@/components/toast-provider';

type Scope = 'active' | 'archived' | 'all';

type ProfileOption = {
  id: string;
  name: string;
  isDefault?: boolean;
};

type ComponentRow = {
  id: string;
  profileId: string;
  name: string;
  componentType: string;
  valueType: string;
  formulaType: string | null;
  rateUnit: string | null;
  ratePer: string | null;
  amount: string | number;
  sortOrder: number;
  metadata: unknown;
  active: boolean;
  profile?: {
    id: string;
    name: string;
    active: boolean;
  };
};

const componentTypes = ['CUSTOM', 'INK', 'LABOR', 'MACHINE', 'MODIFIER', 'OVERHEAD', 'SUBSTRATE'] as const;
const valueTypes = ['FIXED', 'PERCENT', 'RATE'] as const;
const formulaTypes = ['AREA', 'CYL_VOL', 'CYLINDRICAL_SURFACE_AREA', 'FIXED', 'HEIGHT', 'LENGTH', 'NORECALC', 'NONE', 'PBASE', 'PERMITER', 'TOTAL_AREA', 'UNIT', 'VOLUME', 'WIDTH'] as const;
const rateUnits = ['CU_IN', 'CU_FT', 'FEET', 'INCHES', 'SQ_IN', 'SQ_FT', 'UNIT'] as const;
const ratePers = ['HR', 'MIN', 'UNIT'] as const;

const emptyForm = {
  profileId: '',
  name: '',
  componentType: 'CUSTOM',
  valueType: 'RATE',
  formulaType: '',
  rateUnit: '',
  ratePer: '',
  amount: '0',
  sortOrder: '0',
  metadata: '',
};

export default function PricingProfileComponentsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<ComponentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [scope, setScope] = useState<Scope>('active');
  const [filterProfileId, setFilterProfileId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async (nextScope: Scope = scope, nextProfileId: string = filterProfileId) => {
    const params = new URLSearchParams({ archived: nextScope });
    if (nextProfileId) params.set('profileId', nextProfileId);
    const res = await fetch(`/api/admin/pricing/pricing-profile-components?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setRows(data.items || []);
    setProfiles(data.profiles || []);
    setForm((current) => ({
      ...current,
      profileId: current.profileId || data.profiles?.[0]?.id || '',
    }));
  };

  useEffect(() => {
    load();
  }, [scope, filterProfileId]);

  const canSave = useMemo(() => form.profileId && form.name.trim(), [form.profileId, form.name]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      profileId: profiles[0]?.id || '',
    });
  };

  const serializeMetadata = () => {
    if (!form.metadata.trim()) return null;
    try {
      return JSON.parse(form.metadata);
    } catch {
      throw new Error('Metadata must be valid JSON.');
    }
  };

  return (
    <PricingPageShell title="Pricing Profile Components" description="Create, edit, and archive the component rows attached to pricing profiles.">
      <div className="grid gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Component' : 'Create Component'}</h2>
          <p className="mt-1 text-sm text-slate-500">Use this page to dev-test component combinations without deeper UI dependencies.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Pricing Profile</span>
              <select
                value={form.profileId}
                onChange={(event) => setForm((current) => ({ ...current, profileId: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}{profile.isDefault ? ' (Default)' : ''}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="e.g. White Ink Coverage"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Component Type</span>
              <select
                value={form.componentType}
                onChange={(event) => setForm((current) => ({ ...current, componentType: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {componentTypes.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Value Type</span>
              <select
                value={form.valueType}
                onChange={(event) => setForm((current) => ({ ...current, valueType: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {valueTypes.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Formula Type</span>
              <select
                value={form.formulaType}
                onChange={(event) => setForm((current) => ({ ...current, formulaType: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">None</option>
                {formulaTypes.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Rate Unit</span>
              <select
                value={form.rateUnit}
                onChange={(event) => setForm((current) => ({ ...current, rateUnit: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">None</option>
                {rateUnits.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Rate Per</span>
              <select
                value={form.ratePer}
                onChange={(event) => setForm((current) => ({ ...current, ratePer: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">None</option>
                {ratePers.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Sort Order</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Metadata JSON</span>
              <textarea
                value={form.metadata}
                onChange={(event) => setForm((current) => ({ ...current, metadata: event.target.value }))}
                className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder='Optional JSON, e.g. {"coverage":"heavy"}'
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={!canSave}
              className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                if (!canSave) return;

                let metadata: unknown = null;
                try {
                  metadata = serializeMetadata();
                } catch (error) {
                  return push(error instanceof Error ? error.message : 'Metadata must be valid JSON.', 'error');
                }

                const url = editingId
                  ? `/api/admin/pricing/pricing-profile-components/${editingId}`
                  : '/api/admin/pricing/pricing-profile-components';
                const method = editingId ? 'PATCH' : 'POST';
                const res = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    profileId: form.profileId,
                    name: form.name.trim(),
                    componentType: form.componentType,
                    valueType: form.valueType,
                    formulaType: form.formulaType || null,
                    rateUnit: form.rateUnit || null,
                    ratePer: form.ratePer || null,
                    amount: form.amount,
                    sortOrder: form.sortOrder,
                    metadata,
                  }),
                });
                if (!res.ok) return push('Could not save pricing profile component.', 'error');
                await load();
                resetForm();
                push(editingId ? 'Pricing profile component updated.' : 'Pricing profile component created.', 'success');
              }}
            >
              {editingId ? 'Save Component' : 'Create Component'}
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
          <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Status</span>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as Scope)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Profile Filter</span>
              <select
                value={filterProfileId}
                onChange={(event) => setFilterProfileId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">All Profiles</option>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </label>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Profile</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Sort</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.profile?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.componentType} / {row.valueType}</td>
                  <td className="px-4 py-3">{String(row.amount)}</td>
                  <td className="px-4 py-3">{row.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-3 text-sm font-semibold text-sky-700"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          profileId: row.profileId,
                          name: row.name,
                          componentType: row.componentType,
                          valueType: row.valueType,
                          formulaType: row.formulaType || '',
                          rateUnit: row.rateUnit || '',
                          ratePer: row.ratePer || '',
                          amount: String(row.amount),
                          sortOrder: String(row.sortOrder),
                          metadata: row.metadata ? JSON.stringify(row.metadata, null, 2) : '',
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
                          const res = await fetch(`/api/admin/pricing/pricing-profile-components/${row.id}`, { method: 'DELETE' });
                          if (!res.ok) return push('Could not archive pricing profile component.', 'error');
                          await load();
                          if (editingId === row.id) resetForm();
                          push('Pricing profile component archived.', 'success');
                        }}
                      >
                        Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-700"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/pricing/pricing-profile-components/${row.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ active: true }),
                          });
                          if (!res.ok) return push('Could not restore pricing profile component.', 'error');
                          await load();
                          push('Pricing profile component restored.', 'success');
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
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No pricing profile components found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </PricingPageShell>
  );
}
