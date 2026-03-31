"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { labelFromOption, PRICING_FORMULA_OPTIONS, PRICING_RATE_PER_OPTIONS, PRICING_RATE_UNIT_OPTIONS } from '@/lib/admin-pricing-options';

type MachineRate = {
  id: string;
  name: string;
  cost: string;
  price: string;
  markup: string;
  units: string;
  setupCharge: string;
  laborCharge: string;
  otherCharge: string;
  formula: string;
  productionRate: string;
  rateUnit: string;
  per: string;
};

export default function MachineRatesPage() {
  const [rows, setRows] = useState<MachineRate[]>([]);

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/admin/pricing/machine-rates');
      if (!res.ok) return;
      setRows(await res.json());
    };
    run();
  }, []);

  return (
    <PricingPageShell title="Machine Rates" description="Manage machine rate schedules used by pricing calculations.">
      <div className="mb-3 flex justify-end">
        <Link href="/admin/pricing/machine-rates/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
          Create Machine Rate
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
              <th className="px-4 py-3 font-semibold">Units ID</th>
              <th className="px-4 py-3 font-semibold">Formula</th>
              <th className="px-4 py-3 font-semibold">Rate Units</th>
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
                <td className="px-4 py-4">{row.units}</td>
                <td className="px-4 py-4">{labelFromOption(PRICING_FORMULA_OPTIONS, row.formula)}</td>
                <td className="px-4 py-4">{labelFromOption(PRICING_RATE_UNIT_OPTIONS, row.rateUnit)}</td>
                <td className="px-4 py-4">{labelFromOption(PRICING_RATE_PER_OPTIONS, row.per)}</td>
                <td className="px-4 py-4 text-right">
                  <Link href={`/admin/pricing/machine-rates/${row.id}`} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">Edit</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>No machine rates yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
