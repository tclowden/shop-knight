"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type User = {
  id: string;
  name: string;
  email: string;
  type: string;
  active: boolean;
  activeCompanyId?: string | null;
  customRoles?: Array<{ roleId: string; role: { id: string; name: string } }>;
};

type CustomRole = { id: string; name: string; active: boolean };
type Company = { id: string; name: string; slug: string };

const userTypes = ['ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'];

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('SALES');
  const [active, setActive] = useState(true);
  const [customRoleIds, setCustomRoleIds] = useState<string[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function load(userId: string) {
    const [usersRes, rolesRes, companiesRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/custom-roles'),
      fetch('/api/admin/companies'),
    ]);

    if (!usersRes.ok) return;
    const users: User[] = await usersRes.json();
    const found = users.find((u) => u.id === userId) || null;
    setUser(found);

    setName(found?.name || '');
    setEmail(found?.email || '');
    setType(found?.type || 'SALES');
    setCustomRoleIds(found?.customRoles?.map((entry) => entry.roleId) || []);
    setActive(Boolean(found?.active));

    if (rolesRes.ok) setRoles(await rolesRes.json());

    if (companiesRes.ok) {
      const payload = await companiesRes.json();
      const companyList: Company[] = Array.isArray(payload?.companies) ? payload.companies : [];
      setCompanies(companyList.map((c) => ({ id: c.id, name: c.name, slug: c.slug })));

      const memberships = companyList
        .filter((company) => Array.isArray((company as unknown as { members?: unknown[] }).members) && (company as unknown as { members: Array<{ id: string }> }).members.some((m) => m.id === userId))
        .map((company) => company.id);

      setCompanyIds(memberships);
      setActiveCompanyId((found?.activeCompanyId && memberships.includes(found.activeCompanyId)) ? found.activeCompanyId : memberships[0] || '');
    }
  }

  function toggleRole(roleId: string) {
    setCustomRoleIds((prev) => (prev.includes(roleId) ? prev.filter((value) => value !== roleId) : [...prev, roleId]));
  }

  function toggleCompany(companyId: string) {
    setCompanyIds((prev) => {
      const next = prev.includes(companyId) ? prev.filter((value) => value !== companyId) : [...prev, companyId];
      if (next.length === 0) {
        setActiveCompanyId('');
      } else if (!next.includes(activeCompanyId)) {
        setActiveCompanyId(next[0]);
      }
      return next;
    });
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaved('');

    if (companyIds.length === 0) {
      setError('Select at least one company.');
      return;
    }

    if (!activeCompanyId || !companyIds.includes(activeCompanyId)) {
      setError('Select an active company from assigned companies.');
      return;
    }

    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        type,
        active,
        customRoleIds,
        companyIds,
        activeCompanyId,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to save user');
      return;
    }

    setSaved('Saved');
    await load(id);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  if (!user) return <main className="mx-auto max-w-5xl p-8">Loading user...</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">User: {user.name}</h1>
      <p className="text-sm text-zinc-400">{user.email} • {user.type}</p>
      <Nav />

      <form onSubmit={saveUser} className="mb-4 rounded border border-zinc-800 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            {userTypes.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-300">Custom Roles</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {roles.filter((r) => r.active).map((r) => (
              <label key={r.id} className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                <input type="checkbox" checked={customRoleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-300">Company Membership</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {companies.map((company) => (
              <label key={company.id} className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                <input type="checkbox" checked={companyIds.includes(company.id)} onChange={() => toggleCompany(company.id)} />
                {company.name}
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm text-zinc-300">Active Company</label>
            <select value={activeCompanyId} onChange={(e) => setActiveCompanyId(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              {companyIds.map((companyId) => {
                const company = companies.find((c) => c.id === companyId);
                return <option key={companyId} value={companyId}>{company?.name || companyId}</option>;
              })}
            </select>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        {saved ? <p className="mt-3 text-sm text-emerald-400">{saved}</p> : null}

        <div className="mt-3">
          <button className="rounded bg-blue-600 px-3 py-2">Save User</button>
        </div>
      </form>

      <ModuleNotesTasks entityType="USER" entityId={id} />
    </main>
  );
}
