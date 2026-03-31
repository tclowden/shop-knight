"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PricingPageShell } from '@/components/admin-pricing';
import { labelFromOption, MODIFIER_TYPE_OPTIONS, MODIFIER_UNIT_OPTIONS } from '@/lib/admin-pricing-options';

type Modifier = {
  id: string;
  name: string;
  systemLookupName: string;
  type: string;
  units: string;
  showInternally: boolean;
  showCustomer: boolean;
  defaultValue: string;
};

export default function ModifiersPage() {
  const [rows, setRows] = useState<Modifier[]>([]);

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/admin/pricing/modifiers');
      if (!res.ok) return;
      setRows(await res.json());
    };
    run();
  }, []);

  return (
    <PricingPageShell title="Modifiers" description="Manage pricing modifiers and display settings.">
      <div className="mb-3 flex justify-end">
        <Link href="/admin/pricing/modifiers/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
          Create Modifier
        </Link>
      </div>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">System Lookup Name</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Units</th>
              <th className="px-4 py-3 font-semibold">Show Internally</th>
              <th className="px-4 py-3 font-semibold">Show Customer</th>
              <th className="px-4 py-3 font-semibold">Default Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{row.name}</td>
                <td className="px-4 py-4">{row.systemLookupName}</td>
                <td className="px-4 py-4">{labelFromOption(MODIFIER_TYPE_OPTIONS, row.type)}</td>
                <td className="px-4 py-4">{labelFromOption(MODIFIER_UNIT_OPTIONS, row.units)}</td>
                <td className="px-4 py-4">{row.showInternally ? 'Yes' : 'No'}</td>
                <td className="px-4 py-4">{row.showCustomer ? 'Yes' : 'No'}</td>
                <td className="px-4 py-4">{row.defaultValue}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No modifiers yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </PricingPageShell>
  );
}
