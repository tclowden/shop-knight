"use client";

import type { ReactNode } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import {
  MATERIAL_FIXED_SIDE_OPTIONS,
  MATERIAL_FORMULA_OPTIONS,
  MATERIAL_QB_ITEM_TYPE_OPTIONS,
  MATERIAL_UNIT_OPTIONS,
  MATERIAL_WEIGHT_UOM_OPTIONS,
} from '@/lib/admin-pricing-options';

const MATERIAL_TYPE_OPTIONS = ['Paper', 'Vinyl', 'Substrate'];
const CATEGORY_OPTIONS = ['Cardstock', 'Cast Vinyl', 'Corrugated'];
const DISCOUNT_OPTIONS = ['None', 'Wholesale 10%', 'Promo 15%'];
const COG_ACCOUNT_OPTIONS = ['5000 · Cost of Goods Sold', '5100 · Materials COGS'];

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
  return (
    <PricingPageShell title="Material List" description="Material create/edit layout for dev validation.">
      <div className="grid gap-4">
        <Card title="Basic Info">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldLabel label="Name"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="External Name"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Material Type">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_TYPE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Category">
              <div className="flex gap-2">
                <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                  {CATEGORY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
                <button type="button" className="rounded-lg border border-slate-300 px-3 text-sm font-semibold">+ Category</button>
              </div>
            </FieldLabel>
          </div>
        </Card>

        <Card title="Selling Info">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Selling Units">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_UNIT_OPTIONS.map((item) => <option key={item.value}>{item.label}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Buying Units">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_UNIT_OPTIONS.map((item) => <option key={item.value}>{item.label}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Sell/Buy Ratio (unit)"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
          </div>
        </Card>

        <Card title="Package Details">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Sheet Width"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Sheet Height"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Sheet Cost"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Part Number"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Weight"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Weight UOM">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_WEIGHT_UOM_OPTIONS.map((item) => <option key={item.value}>{item.label}</option>)}
              </select>
            </FieldLabel>
          </div>
        </Card>

        <Card title="Costs">
          <div className="grid gap-4 md:grid-cols-4">
            {['Cost', 'Price', 'Multiplier', 'Setup Charge', 'Labor Charge', 'Machine Charge', 'Other Charge'].map((field) => (
              <FieldLabel key={field} label={field}><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            ))}
          </div>
        </Card>

        <Card title="Calculations">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Formula">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_FORMULA_OPTIONS.map((item) => <option key={item.value}>{item.label}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Discount">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {DISCOUNT_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Multiplier"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="QuickBooks Item Type">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_QB_ITEM_TYPE_OPTIONS.map((item) => <option key={item.value}>{item.label}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="COG Account">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {COG_ACCOUNT_OPTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Per LI Unit"><input type="checkbox" className="h-5 w-5 rounded border-slate-300" /></FieldLabel>
            <FieldLabel label="Include in Base Price"><input type="checkbox" className="h-5 w-5 rounded border-slate-300" /></FieldLabel>
          </div>
        </Card>

        <Card title="Wastage">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldLabel label="Fixed Side">
              <select className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
                {MATERIAL_FIXED_SIDE_OPTIONS.map((item) => <option key={item.value}>{item.label}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Wastage Markup"><input className="h-11 w-full rounded-lg border border-slate-300 px-3" /></FieldLabel>
            <FieldLabel label="Calculate Wastage"><input type="checkbox" className="h-5 w-5 rounded border-slate-300" /></FieldLabel>
          </div>
        </Card>

        <Card title="Notes">
          <FieldLabel label="Notes">
            <textarea className="min-h-32 w-full rounded-lg border border-slate-300 p-3" />
          </FieldLabel>
        </Card>
      </div>
    </PricingPageShell>
  );
}
