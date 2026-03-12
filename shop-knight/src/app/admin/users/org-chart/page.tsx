"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav';

type OrgUser = {
  id: string;
  name: string;
  email: string;
  title: string;
  customRoles: string[];
};

type OrgDepartment = {
  id: string;
  name: string;
  users: OrgUser[];
};

type OrgResponse = {
  company: { id: string; name: string };
  departments: OrgDepartment[];
};

export default function OrgChartPage() {
  const [data, setData] = useState<OrgResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      const res = await fetch('/api/admin/users/org-chart');
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error || 'Failed to load org chart');
        setLoading(false);
        return;
      }

      setData(await res.json());
      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Company Org Chart</h1>
      <p className="text-sm text-slate-500">Grouped by department for the currently active company.</p>
      <Nav />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">{data?.company?.name ? `Company: ${data.company.name}` : 'Loading company...'}</p>
        <Link href="/admin/users" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Back to Users
        </Link>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading org chart…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-max items-start gap-4">
            {data?.departments.map((department) => (
              <div key={department.id} className="w-72 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h2 className="mb-3 text-sm font-semibold text-slate-700">{department.name}</h2>
                <div className="space-y-2">
                  {department.users.map((user) => (
                    <article key={user.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      {user.customRoles.length ? (
                        <p className="mt-2 text-xs text-sky-700">Roles: {user.customRoles.join(', ')}</p>
                      ) : null}
                    </article>
                  ))}
                  {department.users.length === 0 ? <p className="text-xs text-slate-500">No users assigned.</p> : null}
                </div>
              </div>
            ))}
            {data?.departments.length === 0 ? <p className="text-sm text-slate-500">No active users found for this company.</p> : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
