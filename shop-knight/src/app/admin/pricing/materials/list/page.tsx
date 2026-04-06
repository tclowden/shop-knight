"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { useToast } from '@/components/toast-provider';
import {
  MATERIAL_FIXED_SIDE_OPTIONS,
  MATERIAL_FORMULA_OPTIONS,
  MATERIAL_QB_ITEM_TYPE_OPTIONS,
  MATERIAL_UNIT_OPTIONS,
  MATERIAL_WEIGHT_UOM_OPTIONS,
} from '@/lib/admin-pricing-options';

type Option = { id: string; name: string; materialTypeId?: string };
type Account = { id: string; code: string; name: string };
type Material = Record<string, unknown>;
type Scope = 'active' | 'archived' | 'all';

type FormState = {
  name: string;
  externalName: string;
  materialTypeId: string;
  materialCategoryId: string;
  sellingUnit: string;
  buyingUnit: string;
  sellBuyRatio: string;
  sheetWidth: string;
  sheetHeight: string;
  sheetCost: string;
  partNumber: string;
  weight: string;
  weightUom: string;
  cost: string;
  price: string;
  multiplier: string;
  setupCharge: string;
  laborCharge: string;
  machineCharge: string;
  otherCharge: string;
  formula: string;
  discountId: string;
  includeInBasePrice: boolean;
  quickbooksItemType: string;
  cogAccountId: string;
  perLiUnit: boolean;
  fixedSide: string;
  wastageMarkup: string;
  calculateWastage: boolean;
  notes: string;
};

const blank: FormState = {
  name: '',
  externalName: '',
  materialTypeId: '',
  materialCategoryId: '',
  sellingUnit: '',
  buyingUnit: '',
  sellBuyRatio: '',
  sheetWidth: '',
  sheetHeight: '',
  sheetCost: '',
  partNumber: '',
  weight: '',
  weightUom: '',
  cost: '',
  price: '',
  multiplier: '',
  setupCharge: '',
  laborCharge: '',
  machineCharge: '',
  otherCharge: '',
  formula: '',
  discountId: '',
  includeInBasePrice: false,
  quickbooksItemType: '',
  cogAccountId: '',
  perLiUnit: false,
  fixedSide: '',
  wastageMarkup: '',
  calculateWastage: false,
  notes: '',
};

const numericKeys: (keyof FormState)[] = [
  'sellBuyRatio',
  'sheetWidth',
  'sheetHeight',
  'sheetCost',
  'weight',
  'cost',
  'price',
  'multiplier',
  'setupCharge',
  'laborCharge',
  'machineCharge',
  'otherCharge',
  'wastageMarkup',
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-800">{title}</h4>
      {children}
    </div>
  );
}

const inputCls = 'h-11 w-full rounded-lg border border-slate-300 px-3 text-sm';
const selectCls = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm';

export default function MaterialListPage() {
  const { push } = useToast();
  const [scope, setScope] = useState<Scope>('active');
  const [materialTypes, setMaterialTypes] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [discounts, setDiscounts] = useState<Option[]>([]);
  const [cogAccounts, setCogAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<Material[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [quickTypeName, setQuickTypeName] = useState('');
  const [quickCategoryName, setQuickCategoryName] = useState('');

  const visibleCategories = useMemo(() => {
    if (!form.materialTypeId) return categories;
    return categories.filter((c) => !c.materialTypeId || c.materialTypeId === form.materialTypeId);
  }, [categories, form.materialTypeId]);

  const load = async (nextScope: Scope = scope) => {
    const [optionsRes, materialsRes] = await Promise.all([
      fetch('/api/admin/pricing/materials/options'),
      fetch(`/api/admin/pricing/materials?archived=${nextScope}`),
    ]);

    if (optionsRes.ok) {
      const options = await optionsRes.json();
      setMaterialTypes(options.materialTypes || []);
      setCategories(options.materialCategories || []);
      setDiscounts(options.discounts || []);
      setCogAccounts(options.cogAccounts || []);
    }
    if (materialsRes.ok) setRows(await materialsRes.json());
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const [optionsRes, materialsRes] = await Promise.all([
        fetch('/api/admin/pricing/materials/options'),
        fetch(`/api/admin/pricing/materials?archived=${scope}`),
      ]);

      if (cancelled) return;

      if (optionsRes.ok) {
        const options = await optionsRes.json();
        if (cancelled) return;
        setMaterialTypes(options.materialTypes || []);
        setCategories(options.materialCategories || []);
        setDiscounts(options.discounts || []);
        setCogAccounts(options.cogAccounts || []);
      }

      if (materialsRes.ok) {
        const materials = await materialsRes.json();
        if (!cancelled) setRows(materials);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const resetForm = () => {
    setEditingId(null);
    setForm(blank);
    setShowMaterialForm(false);
    setShowAdvanced(false);
    setQuickTypeName('');
    setQuickCategoryName('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.materialTypeId) return 'Material type is required.';
    if (!form.materialCategoryId) return 'Category is required.';
    for (const key of numericKeys) {
      const value = form[key];
      if (value === '') continue;
      const num = Number(value);
      if (!Number.isFinite(num)) return `${key} must be a valid number.`;
      if (num < 0) return `${key} cannot be negative.`;
    }
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) return push(error, 'error');

    const url = editingId ? `/api/admin/pricing/materials/${editingId}` : '/api/admin/pricing/materials';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) return push('Could not save material.', 'error');

    await load();
    resetForm();
    push(editingId ? 'Material updated.' : 'Material created.', 'success');
  };

  return (
    <PricingPageShell title="Material List" description="Create, edit, and archive materials.">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Material Setup</h2>
            <p className="text-sm text-slate-500">Keep this focused: start with core fields, then open advanced when needed.</p>
          </div>

          {showMaterialForm ? (
            <button className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600" onClick={resetForm}>
              {editingId ? 'Cancel Edit' : 'Cancel'}
            </button>
          ) : (
            <button
              className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
              onClick={() => {
                setEditingId(null);
                setForm(blank);
                setShowMaterialForm(true);
              }}
            >
              Create Material
            </button>
          )}
        </div>

        {showMaterialForm ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <h3 className="text-sm font-semibold text-slate-800">{editingId ? 'Edit Material' : 'Create Material'}</h3>
              <button
                className="text-xs font-semibold text-sky-700 hover:text-sky-800"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? 'Hide Advanced Fields' : 'Show Advanced Fields'}
              </button>
            </div>

            <details className="rounded-lg border border-slate-200">
              <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-700">Manage Material Type / Category</summary>
              <div className="grid gap-4 border-t border-slate-200 p-3 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Create Type</h4>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      value={quickTypeName}
                      onChange={(e) => setQuickTypeName(e.target.value)}
                      placeholder="New material type"
                      className={inputCls}
                    />
                    <button
                      className="h-11 rounded bg-emerald-600 px-3 text-sm font-semibold text-white"
                      onClick={async () => {
                        if (!quickTypeName.trim()) return push('Material type name is required.', 'error');
                        const res = await fetch('/api/admin/pricing/material-types', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: quickTypeName.trim() }),
                        });
                        if (!res.ok) return push('Could not create material type.', 'error');
                        const created = await res.json().catch(() => null);
                        setQuickTypeName('');
                        await load();
                        if (created?.id) {
                          setForm((prev) => ({ ...prev, materialTypeId: created.id, materialCategoryId: '' }));
                        }
                        push('Material type created.', 'success');
                      }}
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Create Category</h4>
                  <div className="grid gap-2">
                    <select
                      value={form.materialTypeId}
                      onChange={(e) => setForm({ ...form, materialTypeId: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">Select material type</option>
                      {materialTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <input
                        value={quickCategoryName}
                        onChange={(e) => setQuickCategoryName(e.target.value)}
                        placeholder="New category name"
                        className={inputCls}
                      />
                      <button
                        className="h-11 rounded bg-emerald-600 px-3 text-sm font-semibold text-white"
                        onClick={async () => {
                          if (!form.materialTypeId || !quickCategoryName.trim()) {
                            return push('Pick a type and category name.', 'error');
                          }
                          const res = await fetch('/api/admin/pricing/material-categories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ materialTypeId: form.materialTypeId, name: quickCategoryName.trim() }),
                          });
                          if (!res.ok) return push('Could not create category.', 'error');
                          setQuickCategoryName('');
                          await load();
                          push('Category created.', 'success');
                        }}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </details>

            <Section title="Basic Info">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                </Field>
                <Field label="External Name">
                  <input value={form.externalName} onChange={(e) => setForm({ ...form, externalName: e.target.value })} className={inputCls} />
                </Field>
              </div>
            </Section>

            <Section title="Classification">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Material Type">
                  <select
                    value={form.materialTypeId}
                    onChange={(e) => setForm({ ...form, materialTypeId: e.target.value, materialCategoryId: '' })}
                    className={selectCls}
                  >
                    <option value="">Select material type</option>
                    {materialTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category">
                  <select
                    value={form.materialCategoryId}
                    onChange={(e) => setForm({ ...form, materialCategoryId: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Select category</option>
                    {visibleCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            {showAdvanced ? (
              <>
                <Section title="Units & Dimensions">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Selling Units">
                      <select value={form.sellingUnit} onChange={(e) => setForm({ ...form, sellingUnit: e.target.value })} className={selectCls}>
                        <option value="">Select</option>
                        {MATERIAL_UNIT_OPTIONS.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Buying Units">
                      <select value={form.buyingUnit} onChange={(e) => setForm({ ...form, buyingUnit: e.target.value })} className={selectCls}>
                        <option value="">Select</option>
                        {MATERIAL_UNIT_OPTIONS.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Sell/Buy Ratio">
                      <input value={form.sellBuyRatio} onChange={(e) => setForm({ ...form, sellBuyRatio: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Sheet Width">
                      <input value={form.sheetWidth} onChange={(e) => setForm({ ...form, sheetWidth: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Sheet Height">
                      <input value={form.sheetHeight} onChange={(e) => setForm({ ...form, sheetHeight: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Sheet Cost">
                      <input value={form.sheetCost} onChange={(e) => setForm({ ...form, sheetCost: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Part Number">
                      <input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Weight">
                      <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Weight UOM">
                      <select value={form.weightUom} onChange={(e) => setForm({ ...form, weightUom: e.target.value })} className={selectCls}>
                        <option value="">Select</option>
                        {MATERIAL_WEIGHT_UOM_OPTIONS.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                <Section title="Pricing & Charges">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Cost">
                      <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Price">
                      <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Multiplier">
                      <input value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Setup Charge">
                      <input value={form.setupCharge} onChange={(e) => setForm({ ...form, setupCharge: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Labor Charge">
                      <input value={form.laborCharge} onChange={(e) => setForm({ ...form, laborCharge: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Machine Charge">
                      <input value={form.machineCharge} onChange={(e) => setForm({ ...form, machineCharge: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Other Charge">
                      <input value={form.otherCharge} onChange={(e) => setForm({ ...form, otherCharge: e.target.value })} className={inputCls} />
                    </Field>
                  </div>
                </Section>

                <Section title="Accounting & Formula">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Formula">
                      <select value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} className={selectCls}>
                        <option value="">Select formula</option>
                        {MATERIAL_FORMULA_OPTIONS.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Discount">
                      <select value={form.discountId} onChange={(e) => setForm({ ...form, discountId: e.target.value })} className={selectCls}>
                        <option value="">Select discount</option>
                        {discounts.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="QuickBooks Item Type">
                      <select value={form.quickbooksItemType} onChange={(e) => setForm({ ...form, quickbooksItemType: e.target.value })} className={selectCls}>
                        <option value="">Select item type</option>
                        {MATERIAL_QB_ITEM_TYPE_OPTIONS.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="COG Account">
                      <select value={form.cogAccountId} onChange={(e) => setForm({ ...form, cogAccountId: e.target.value })} className={selectCls}>
                        <option value="">Select account</option>
                        {cogAccounts.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.code} · {x.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                <Section title="Rules & Notes">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Fixed Side">
                      <select value={form.fixedSide} onChange={(e) => setForm({ ...form, fixedSide: e.target.value })} className={selectCls}>
                        <option value="">Select</option>
                        {MATERIAL_FIXED_SIDE_OPTIONS.map((x) => (
                          <option key={x.value} value={x.value}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Wastage Markup">
                      <input value={form.wastageMarkup} onChange={(e) => setForm({ ...form, wastageMarkup: e.target.value })} className={inputCls} />
                    </Field>
                    <div className="flex items-end">
                      <div className="space-y-2 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={form.includeInBasePrice} onChange={(e) => setForm({ ...form, includeInBasePrice: e.target.checked })} />
                          <span>Include in Base Price</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={form.perLiUnit} onChange={(e) => setForm({ ...form, perLiUnit: e.target.checked })} />
                          <span>Per LI Unit</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={form.calculateWastage} onChange={(e) => setForm({ ...form, calculateWastage: e.target.checked })} />
                          <span>Calculate Wastage</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <Field label="Notes">
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" />
                  </Field>
                </Section>
              </>
            ) : null}

            <div className="flex items-center justify-end">
              <button type="button" onClick={submit} className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white">
                {editingId ? 'Update Material' : 'Save Material'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Click <span className="font-semibold text-slate-700">Create Material</span> to open a simplified setup form.</p>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <h3 className="font-semibold">Materials</h3>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="h-9 rounded border border-slate-300 bg-white px-2 text-sm">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">External</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)} className="border-t border-slate-100">
                <td className="px-4 py-3">{String(row.name ?? '—')}</td>
                <td className="px-4 py-3">{String(row.externalName ?? '—')}</td>
                <td className="px-4 py-3">{String((row.materialType as { name?: string } | null)?.name ?? '—')}</td>
                <td className="px-4 py-3">{String((row.materialCategory as { name?: string } | null)?.name ?? '—')}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="mr-3 text-sm font-semibold text-sky-700"
                    onClick={() => {
                      setEditingId(String(row.id));
                      setShowMaterialForm(true);
                      setShowAdvanced(true);
                      setForm({
                        name: String(row.name ?? ''),
                        externalName: String(row.externalName ?? ''),
                        materialTypeId: String(row.materialTypeId ?? ''),
                        materialCategoryId: String(row.materialCategoryId ?? ''),
                        sellingUnit: String(row.sellingUnit ?? ''),
                        buyingUnit: String(row.buyingUnit ?? ''),
                        sellBuyRatio: row.sellBuyRatio != null ? String(row.sellBuyRatio) : '',
                        sheetWidth: row.sheetWidth != null ? String(row.sheetWidth) : '',
                        sheetHeight: row.sheetHeight != null ? String(row.sheetHeight) : '',
                        sheetCost: row.sheetCost != null ? String(row.sheetCost) : '',
                        partNumber: String(row.partNumber ?? ''),
                        weight: row.weight != null ? String(row.weight) : '',
                        weightUom: String(row.weightUom ?? ''),
                        cost: row.cost != null ? String(row.cost) : '',
                        price: row.price != null ? String(row.price) : '',
                        multiplier: row.multiplier != null ? String(row.multiplier) : '',
                        setupCharge: row.setupCharge != null ? String(row.setupCharge) : '',
                        laborCharge: row.laborCharge != null ? String(row.laborCharge) : '',
                        machineCharge: row.machineCharge != null ? String(row.machineCharge) : '',
                        otherCharge: row.otherCharge != null ? String(row.otherCharge) : '',
                        formula: String(row.formula ?? ''),
                        discountId: String(row.discountId ?? ''),
                        includeInBasePrice: Boolean(row.includeInBasePrice),
                        quickbooksItemType: String(row.quickbooksItemType ?? ''),
                        cogAccountId: String(row.cogAccountId ?? ''),
                        perLiUnit: Boolean(row.perLiUnit),
                        fixedSide: String(row.fixedSide ?? ''),
                        wastageMarkup: row.wastageMarkup != null ? String(row.wastageMarkup) : '',
                        calculateWastage: Boolean(row.calculateWastage),
                        notes: String(row.notes ?? ''),
                      });
                      push('Loaded material for editing.', 'info');
                    }}
                  >
                    Edit
                  </button>

                  {(row.active as boolean | undefined) !== false ? (
                    <button
                      className="text-sm font-semibold text-rose-700"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/pricing/materials/${String(row.id)}`, { method: 'DELETE' });
                        if (res.ok) {
                          await load();
                          push('Material archived.', 'success');
                        } else {
                          push('Could not archive material.', 'error');
                        }
                      }}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      className="text-sm font-semibold text-emerald-700"
                      onClick={async () => {
                        const res = await fetch(`/api/admin/pricing/materials/${String(row.id)}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ active: true }),
                        });
                        if (res.ok) {
                          await load();
                          push('Material restored.', 'success');
                        } else {
                          push('Could not restore material.', 'error');
                        }
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
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  No materials found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
