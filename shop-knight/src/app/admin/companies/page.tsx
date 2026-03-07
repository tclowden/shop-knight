"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type User = {
  id: string;
  name: string;
  email: string;
};

type CompanyMember = {
  id: string;
  name: string;
  email: string;
  isActiveCompany: boolean;
};

type Company = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  members: CompanyMember[];
};

export default function CompaniesAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  async function load() {
    const res = await fetch('/api/admin/companies');
    if (!res.ok) return;

    const data = await res.json();
    setUsers(Array.isArray(data?.users) ? data.users : []);
    setCompanies(Array.isArray(data?.companies) ? data.companies : []);
  }

  async function createCompany(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create company');
      return;
    }

    setName('');
    setSlug('');
    await load();
  }

  async function toggleMembership(companyId: string, userId: string, checked: boolean) {
    const key = `${companyId}:${userId}`;
    setBusyKey(key);
    setError('');

    const res = await fetch(`/api/admin/companies/${companyId}/members`, {
      method: checked ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, makeActive: checked }),
    });

    setBusyKey('');

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to update membership');
      return;
    }

    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const membershipMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const company of companies) {
      map.set(company.id, new Set(company.members.map((m) => m.id)));
    }
    return map;
  }, [companies]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Company Admin</h1>
      <p className="text-sm text-slate-500">Create companies and manage user membership.</p>
      <Nav />

      <form onSubmit={createCompany} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" className="field" required />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug (optional)" className="field" />
          <button className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 md:col-span-1">Create Company</button>
        </div>
      </form>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <div className="space-y-4">
        {companies.map((company) => (
          <section key={company.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold">{company.name}</h2>
              <p className="text-xs text-slate-500">slug: {company.slug}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => {
                const isMember = membershipMap.get(company.id)?.has(user.id) ?? false;
                const isBusy = busyKey === `${company.id}:${user.id}`;
                const activeMarker = company.members.find((m) => m.id === user.id)?.isActiveCompany;

                return (
                  <label key={user.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800">
                    <input type="checkbox" checked={isMember} disabled={isBusy} onChange={(e) => toggleMembership(company.id, user.id, e.target.checked)} />
                    <span>
                      <span className="block text-sm font-medium">{user.name}</span>
                      <span className="block text-xs text-slate-500">{user.email}</span>
                      {activeMarker ? <span className="block text-xs text-sky-700">Active company</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}

        {companies.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No companies yet.</div>
        ) : null}
      </div>
    </main>
  );
}
