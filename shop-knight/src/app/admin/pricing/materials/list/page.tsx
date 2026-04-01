"use client";

import { useEffect, useMemo, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { MATERIAL_FIXED_SIDE_OPTIONS, MATERIAL_FORMULA_OPTIONS, MATERIAL_QB_ITEM_TYPE_OPTIONS, MATERIAL_UNIT_OPTIONS, MATERIAL_WEIGHT_UOM_OPTIONS } from '@/lib/admin-pricing-options';

type Option = { id: string; name: string; materialTypeId?: string };
type Account = { id: string; code: string; name: string };
type Material = Record<string, any>;

type FormState = {
  name: string; externalName: string; materialTypeId: string; materialCategoryId: string;
  sellingUnit: string; buyingUnit: string; sellBuyRatio: string;
  sheetWidth: string; sheetHeight: string; sheetCost: string; partNumber: string; weight: string; weightUom: string;
  cost: string; price: string; multiplier: string; setupCharge: string; laborCharge: string; machineCharge: string; otherCharge: string;
  formula: string; discountId: string; includeInBasePrice: boolean; quickbooksItemType: string; cogAccountId: string; perLiUnit: boolean;
  fixedSide: string; wastageMarkup: string; calculateWastage: boolean; notes: string;
};

const blank: FormState = {
  name: '', externalName: '', materialTypeId: '', materialCategoryId: '',
  sellingUnit: '', buyingUnit: '', sellBuyRatio: '',
  sheetWidth: '', sheetHeight: '', sheetCost: '', partNumber: '', weight: '', weightUom: '',
  cost: '', price: '', multiplier: '', setupCharge: '', laborCharge: '', machineCharge: '', otherCharge: '',
  formula: '', discountId: '', includeInBasePrice: false, quickbooksItemType: '', cogAccountId: '', perLiUnit: false,
  fixedSide: '', wastageMarkup: '', calculateWastage: false, notes: '',
};

export default function MaterialListPage() {
  const [materialTypes, setMaterialTypes] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [discounts, setDiscounts] = useState<Option[]>([]);
  const [cogAccounts, setCogAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<Material[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);

  const visibleCategories = useMemo(() => {
    if (!form.materialTypeId) return categories;
    return categories.filter((c) => !c.materialTypeId || c.materialTypeId === form.materialTypeId);
  }, [categories, form.materialTypeId]);

  const load = async () => {
    const [optionsRes, materialsRes] = await Promise.all([fetch('/api/admin/pricing/materials/options'), fetch('/api/admin/pricing/materials')]);
    if (optionsRes.ok) {
      const options = await optionsRes.json();
      setMaterialTypes(options.materialTypes || []);
      setCategories(options.materialCategories || []);
      setDiscounts(options.discounts || []);
      setCogAccounts(options.cogAccounts || []);
    }
    if (materialsRes.ok) setRows(await materialsRes.json());
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    const url = editingId ? `/api/admin/pricing/materials/${editingId}` : '/api/admin/pricing/materials';
    const method = editingId ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) return alert('Could not save material');
    setForm(blank);
    setEditingId(null);
    await load();
  };

  return (
    <PricingPageShell title="Material List" description="Create, edit, and archive materials.">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? 'Edit Material' : 'Create Material'}</h2>{editingId ? <button className="text-sm font-semibold text-slate-600" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel Edit</button> : null}</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="External Name" value={form.externalName} onChange={(e) => setForm({ ...form, externalName: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <select value={form.materialTypeId} onChange={(e) => setForm({ ...form, materialTypeId: e.target.value, materialCategoryId: '' })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Material Type</option>{materialTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={form.materialCategoryId} onChange={(e) => setForm({ ...form, materialCategoryId: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Category</option>{visibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={form.sellingUnit} onChange={(e) => setForm({ ...form, sellingUnit: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Selling Units</option>{MATERIAL_UNIT_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          <select value={form.buyingUnit} onChange={(e) => setForm({ ...form, buyingUnit: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Buying Units</option>{MATERIAL_UNIT_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          <input placeholder="Sell/Buy Ratio" value={form.sellBuyRatio} onChange={(e) => setForm({ ...form, sellBuyRatio: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Sheet Width" value={form.sheetWidth} onChange={(e) => setForm({ ...form, sheetWidth: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Sheet Height" value={form.sheetHeight} onChange={(e) => setForm({ ...form, sheetHeight: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Sheet Cost" value={form.sheetCost} onChange={(e) => setForm({ ...form, sheetCost: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Part Number" value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <select value={form.weightUom} onChange={(e) => setForm({ ...form, weightUom: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Weight UOM</option>{MATERIAL_WEIGHT_UOM_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          <input placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Multiplier" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Setup Charge" value={form.setupCharge} onChange={(e) => setForm({ ...form, setupCharge: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Labor Charge" value={form.laborCharge} onChange={(e) => setForm({ ...form, laborCharge: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Machine Charge" value={form.machineCharge} onChange={(e) => setForm({ ...form, machineCharge: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <input placeholder="Other Charge" value={form.otherCharge} onChange={(e) => setForm({ ...form, otherCharge: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
          <select value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Formula</option>{MATERIAL_FORMULA_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          <select value={form.discountId} onChange={(e) => setForm({ ...form, discountId: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Discount</option>{discounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select value={form.quickbooksItemType} onChange={(e) => setForm({ ...form, quickbooksItemType: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">QuickBooks Item Type</option>{MATERIAL_QB_ITEM_TYPE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          <select value={form.cogAccountId} onChange={(e) => setForm({ ...form, cogAccountId: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">COG Account</option>{cogAccounts.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
          <select value={form.fixedSide} onChange={(e) => setForm({ ...form, fixedSide: e.target.value })} className="h-11 rounded-lg border border-slate-300 bg-white px-3"><option value="">Fixed Side</option>{MATERIAL_FIXED_SIDE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
          <input placeholder="Wastage Markup" value={form.wastageMarkup} onChange={(e) => setForm({ ...form, wastageMarkup: e.target.value })} className="h-11 rounded-lg border border-slate-300 px-3" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.includeInBasePrice} onChange={(e) => setForm({ ...form, includeInBasePrice: e.target.checked })} /> Include in Base Price</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.perLiUnit} onChange={(e) => setForm({ ...form, perLiUnit: e.target.checked })} /> Per LI Unit</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.calculateWastage} onChange={(e) => setForm({ ...form, calculateWastage: e.target.checked })} /> Calculate Wastage</label>
        </div>
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 p-3" />
        <div className="mt-3"><button type="button" onClick={submit} className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white">{editingId ? 'Update Material' : 'Save Material'}</button></div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">External</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.externalName || '—'}</td><td className="px-4 py-3">{row.materialType?.name || '—'}</td><td className="px-4 py-3">{row.materialCategory?.name || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button className="mr-3 text-sm font-semibold text-sky-700" onClick={() => {
                    setEditingId(row.id);
                    setForm({
                      name: row.name || '', externalName: row.externalName || '', materialTypeId: row.materialTypeId || '', materialCategoryId: row.materialCategoryId || '',
                      sellingUnit: row.sellingUnit || '', buyingUnit: row.buyingUnit || '', sellBuyRatio: row.sellBuyRatio?.toString?.() || '',
                      sheetWidth: row.sheetWidth?.toString?.() || '', sheetHeight: row.sheetHeight?.toString?.() || '', sheetCost: row.sheetCost?.toString?.() || '', partNumber: row.partNumber || '', weight: row.weight?.toString?.() || '', weightUom: row.weightUom || '',
                      cost: row.cost?.toString?.() || '', price: row.price?.toString?.() || '', multiplier: row.multiplier?.toString?.() || '', setupCharge: row.setupCharge?.toString?.() || '', laborCharge: row.laborCharge?.toString?.() || '', machineCharge: row.machineCharge?.toString?.() || '', otherCharge: row.otherCharge?.toString?.() || '',
                      formula: row.formula || '', discountId: row.discountId || '', includeInBasePrice: !!row.includeInBasePrice, quickbooksItemType: row.quickbooksItemType || '', cogAccountId: row.cogAccountId || '', perLiUnit: !!row.perLiUnit,
                      fixedSide: row.fixedSide || '', wastageMarkup: row.wastageMarkup?.toString?.() || '', calculateWastage: !!row.calculateWastage, notes: row.notes || '',
                    });
                  }}>Edit</button>
                  <button className="text-sm font-semibold text-rose-700" onClick={async () => { const res = await fetch(`/api/admin/pricing/materials/${row.id}`, { method: 'DELETE' }); if (res.ok) await load(); }}>Archive</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No materials yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
