"use client";

import { useEffect, useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { useToast } from '@/components/toast-provider';

type ProductOption = {
  id: string;
  name: string;
  sku: string;
};

type ProfileOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

type AssignmentRow = {
  id: string;
  productId: string;
  profileId: string;
  isDefault: boolean;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  profile?: {
    id: string;
    name: string;
    isDefault: boolean;
  };
};

const emptyForm = {
  productId: '',
  profileId: '',
  isDefault: false,
};

export default function ProductPricingProfilesPage() {
  const { push } = useToast();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const res = await fetch('/api/admin/pricing/product-pricing-profiles');
    if (!res.ok) return;
    const data = await res.json();
    setAssignments(data.assignments || []);
    setProducts(data.products || []);
    setProfiles(data.profiles || []);
    setForm((current) => ({
      ...current,
      productId: current.productId || data.products?.[0]?.id || '',
      profileId: current.profileId || data.profiles?.[0]?.id || '',
    }));
  };

  useEffect(() => {
    load();
  }, []);

  const canSave = useMemo(() => form.productId && form.profileId, [form.productId, form.profileId]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      productId: products[0]?.id || '',
      profileId: profiles[0]?.id || '',
      isDefault: false,
    });
  };

  return (
    <PricingPageShell title="Product Pricing Profiles" description="Assign pricing profiles to products and toggle product-level defaults for testing.">
      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <p className="mt-1 text-sm text-slate-500">Products and profiles are loaded alphabetically from the active company.</p>

          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Product</span>
              <select
                value={form.productId}
                onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Pricing Profile</span>
              <select
                value={form.profileId}
                onChange={(event) => setForm((current) => ({ ...current, profileId: event.target.value }))}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}{profile.isDefault ? ' (Company Default)' : ''}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Set as default for this product</span>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={!canSave}
              className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                if (!canSave) return;
                const url = '/api/admin/pricing/product-pricing-profiles';
                const method = editingId ? 'PATCH' : 'POST';
                const body = editingId
                  ? { assignmentId: editingId, profileId: form.profileId, isDefault: form.isDefault }
                  : { productId: form.productId, profileId: form.profileId, isDefault: form.isDefault };
                const res = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                });
                if (!res.ok) return push('Could not save product pricing profile assignment.', 'error');
                await load();
                resetForm();
                push(editingId ? 'Product pricing profile assignment updated.' : 'Product pricing profile assignment created.', 'success');
              }}
            >
              {editingId ? 'Save Assignment' : 'Create Assignment'}
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
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-base font-semibold text-slate-900">Current Assignments</h3>
            <p className="text-sm text-slate-500">Use edit to move an assignment to another profile or promote it to the product default.</p>
          </div>

          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Profile</th>
                <th className="px-4 py-3 font-semibold">Default</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{row.product?.name || 'Unknown Product'}</div>
                    <div className="text-xs text-slate-500">{row.product?.sku || 'No SKU'}</div>
                  </td>
                  <td className="px-4 py-3">{row.profile?.name || 'Unknown Profile'}</td>
                  <td className="px-4 py-3">{row.isDefault ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-3 text-sm font-semibold text-sky-700"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          productId: row.productId,
                          profileId: row.profileId,
                          isDefault: row.isDefault,
                        });
                      }}
                    >
                      Edit
                    </button>
                    {!row.isDefault ? (
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-700"
                        onClick={async () => {
                          const res = await fetch('/api/admin/pricing/product-pricing-profiles', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assignmentId: row.id, isDefault: true }),
                          });
                          if (!res.ok) return push('Could not set default assignment.', 'error');
                          await load();
                          push('Product default pricing profile updated.', 'success');
                        }}
                      >
                        Make Default
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {assignments.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No product pricing profile assignments found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </PricingPageShell>
  );
}
