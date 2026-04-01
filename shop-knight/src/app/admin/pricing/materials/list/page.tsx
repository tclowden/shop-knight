"use client";

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import {
  MATERIAL_FIXED_SIDE_OPTIONS,
  MATERIAL_FORMULA_OPTIONS,
  MATERIAL_QB_ITEM_TYPE_OPTIONS,
  MATERIAL_UNIT_OPTIONS,
  MATERIAL_WEIGHT_UOM_OPTIONS,
} from '@/lib/admin-pricing-options';

type Option = { id: string; name: string };
type Account = { id: string; code: string; name: string };
type MaterialRow = { id: string; name: string; externalName?: string | null; materialType?: Option | null; materialCategory?: Option | null };

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function MaterialListPage() {
  const [materialTypes, setMaterialTypes] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [discounts, setDiscounts] = useState<Option[]>([]);
  const [cogAccounts, setCogAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<MaterialRow[]>([]);

  const load = async () => {
    const [optionsRes, materialsRes] = await Promise.all([
      fetch('/api/admin/pricing/materials/options'),
      fetch('/api/admin/pricing/materials'),
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
    load();
  }, []);

  return (
    <PricingPageShell title="Material List" description="Material create/edit with DB persistence for dev validation.">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const payload = {
            name: String(formData.get('name') || ''),
            externalName: String(formData.get('externalName') || ''),
            materialTypeId: String(formData.get('materialTypeId') || ''),
            materialCategoryId: String(formData.get('materialCategoryId') || ''),
            sellingUnit: String(formData.get('sellingUnit') || ''),
            buyingUnit: String(formData.get('buyingUnit') || ''),
            sellBuyRatio: String(formData.get('sellBuyRatio') || ''),
            sheetWidth: String(formData.get('sheetWidth') || ''),
            sheetHeight: String(formData.get('sheetHeight') || ''),
            sheetCost: String(formData.get('sheetCost') || ''),
            partNumber: String(formData.get('partNumber') || ''),
            weight: String(formData.get('weight') || ''),
            weightUom: String(formData.get('weightUom') || ''),
            cost: String(formData.get('cost') || ''),
            price: String(formData.get('price') || ''),
            multiplier: String(formData.get('multiplier') || ''),
            setupCharge: String(formData.get('setupCharge') || ''),
            laborCharge: String(formData.get('laborCharge') || ''),
            machineCharge: String(formData.get('machineCharge') || ''),
            otherCharge: String(formData.get('otherCharge') || ''),
            formula: String(formData.get('formula') || ''),
            discountId: String(formData.get('discountId') || ''),
            includeInBasePrice: formData.get('includeInBasePrice') === 'on',
            quickbooksItemType: String(formData.get('quickbooksItemType') || ''),
            cogAccountId: String(formData.get('cogAccountId') || ''),
            perLiUnit: formData.get('perLiUnit') === 'on',
            fixedSide: String(formData.get('fixedSide') || ''),
            wastageMarkup: String(formData.get('wastageMarkup') || ''),
            calculateWastage: formData.get('calculateWastage') === 'on',
            notes: String(formData.get('notes') || ''),
          };

          const res = await fetch('/api/admin/pricing/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            event.currentTarget.reset();
            await load();
          } else {
            alert('Could not save material');
          }
        }}
      >
        <Card title="Basic Info">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldLabel label="Name"><input name="name" required className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="External Name"><input name="externalName" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Material Type">
              <select name="materialTypeId" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                <option value="">Select type</option>
                {materialTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Category">
              <select name="materialCategoryId" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                <option value="">Select category</option>
                {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </FieldLabel>
          </div>
        </Card>

        <Card title="Selling Info">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Selling Units"><select name="sellingUnit" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{MATERIAL_UNIT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
            <FieldLabel label="Buying Units"><select name="buyingUnit" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{MATERIAL_UNIT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
            <FieldLabel label="Sell/Buy Ratio (unit)"><input name="sellBuyRatio" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
          </div>
        </Card>

        <Card title="Package Details">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Sheet Width"><input name="sheetWidth" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Sheet Height"><input name="sheetHeight" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Sheet Cost"><input name="sheetCost" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Part Number"><input name="partNumber" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Weight"><input name="weight" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Weight UOM"><select name="weightUom" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{MATERIAL_WEIGHT_UOM_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
          </div>
        </Card>

        <Card title="Costs"><div className="grid gap-4 md:grid-cols-4">{['cost', 'price', 'multiplier', 'setupCharge', 'laborCharge', 'machineCharge', 'otherCharge'].map((field) => (<FieldLabel key={field} label={field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}><input name={field} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>))}</div></Card>

        <Card title="Calculations">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Formula"><select name="formula" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{MATERIAL_FORMULA_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
            <FieldLabel label="Discount"><select name="discountId" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{discounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FieldLabel>
            <FieldLabel label="Multiplier"><input name="multiplier" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="QuickBooks Item Type"><select name="quickbooksItemType" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{MATERIAL_QB_ITEM_TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
            <FieldLabel label="COG Account"><select name="cogAccountId" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{cogAccounts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></FieldLabel>
            <FieldLabel label="Per LI Unit"><input name="perLiUnit" type="checkbox" className="h-5 w-5 rounded border-slate-300" /></FieldLabel>
            <FieldLabel label="Include in Base Price"><input name="includeInBasePrice" type="checkbox" className="h-5 w-5 rounded border-slate-300" /></FieldLabel>
          </div>
        </Card>

        <Card title="Wastage">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Fixed Side"><select name="fixedSide" className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="" />{MATERIAL_FIXED_SIDE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></FieldLabel>
            <FieldLabel label="Wastage Markup"><input name="wastageMarkup" className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Calculate Wastage"><input name="calculateWastage" type="checkbox" className="h-5 w-5 rounded border-slate-300" /></FieldLabel>
          </div>
        </Card>

        <Card title="Notes"><FieldLabel label="Notes"><textarea name="notes" className="min-h-32 w-full rounded-lg border border-slate-300 p-3" /></FieldLabel></Card>

        <div><button type="submit" className="inline-flex h-11 items-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white">Save Material</button></div>
      </form>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">External Name</th><th className="px-4 py-3 font-semibold">Type</th><th className="px-4 py-3 font-semibold">Category</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.externalName || '—'}</td><td className="px-4 py-3">{row.materialType?.name || '—'}</td><td className="px-4 py-3">{row.materialCategory?.name || '—'}</td></tr>
            ))}
            {rows.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No materials yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
