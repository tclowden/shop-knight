"use client";

import { useSession } from 'next-auth/react';

export function CompanySwitcher() {
  const { data: session, update } = useSession();
  const companies = session?.user?.companies || [];
  const active = session?.user?.companyId || '';

  if (companies.length <= 1) return null;

  return (
    <select
      value={active}
      onChange={async (e) => {
        await fetch('/api/companies/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyId: e.target.value }),
        });
        await update();
        window.location.reload();
      }}
      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-zinc-100"
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id} className="text-zinc-900">
          {c.name}
        </option>
      ))}
    </select>
  );
}
