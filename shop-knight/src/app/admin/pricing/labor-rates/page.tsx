"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { labelFromOption, PRICING_FORMULA_OPTIONS, PRICING_RATE_PER_OPTIONS, PRICING_RATE_UNIT_OPTIONS } from '@/lib/admin-pricing-options';

type LaborRate = {
  id: string;
  name: string;
  cost: string;
  price: string;
  markup: string;
  setupCharge: string;
  machineCharge: string;
  otherCharge: string;
  formula: string;
  productionRate: string;
  units: string;
  per: string;
};

export default function LaborRatesPage() {
  const [rows, setRows] = useState<LaborRate[]>([]);

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/admin/pricing/labor-rates');
      if (!res.ok) return;
      setRows(await res.json());
    };
    run();
  }, []);

  return (
    <PricingPageShell title="Labor Rates" description="Manage labor rate schedules used by pricing calculations.">
      <div className="mb-3 flex justify-end">
        <Link href="/admin/pricing/labor-rates/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
          Create Labor Rate
        </Link>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Cost</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Markup</th>
              <th className="px-4 py-3 font-semibold">Formula</th>
              <th className="px-4 py-3 font-semibold">Production</th>
              <th className="px-4 py-3 font-semibold">Units</th>
              <th className="px-4 py-3 font-semibold">Per</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{row.name}</td>
                <td className="px-4 py-4">{row.cost}</td>
                <td className="px-4 py-4">{row.price}</td>
                <td className="px-4 py-4">{row.markup}</td>
                <td className="px-4 py-4">{labelFromOption(PRICING_FORMULA_OPTIONS, row.formula)}</td>
                <td className="px-4 py-4">{row.productionRate}</td>
                <td className="px-4 py-4">{labelFromOption(PRICING_RATE_UNIT_OPTIONS, row.units)}</td>
                <td className="px-4 py-4">{labelFromOption(PRICING_RATE_PER_OPTIONS, row.per)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>No labor rates yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
