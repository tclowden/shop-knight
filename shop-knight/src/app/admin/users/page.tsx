"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type User = {
  id: string;
  name: string;
  email: string;
  type: string;
  active: boolean;
  customRoles?: Array<{ roleId: string; role: { id: string; name: string } }>;
};

type CustomRole = { id: string; name: string; active: boolean };
type Company = { id: string; name: string; slug: string };

const userTypes = ['ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'];

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('SALES');
  const [companyId, setCompanyId] = useState('');
  const [customRoleIds, setCustomRoleIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const [usersRes, rolesRes, companiesRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/custom-roles'),
      fetch('/api/admin/companies'),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (rolesRes.ok) setRoles(await rolesRes.json());
    if (companiesRes.ok) {
      const data = await companiesRes.json();
      const list = Array.isArray(data?.companies) ? data.companies : [];
      setCompanies(list.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })));
      setCompanyId((prev) => prev || list[0]?.id || '');
    }
  }

  function toggleRole(roleId: string) {
    setCustomRoleIds((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, type, companyId, customRoleIds }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create user');
      return;
    }

    setName('');
    setEmail('');
    setPassword('');
    setType('SALES');
    setCustomRoleIds([]);
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">User Admin</h1>
      <p className="text-sm text-zinc-400">Assign base type plus multiple custom roles for page access.</p>
      <Nav />

      <form onSubmit={createUser} className="mb-4 rounded border border-zinc-800 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password" type="password" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            {userTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required>
            <option value="" disabled>Select company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button className="rounded bg-blue-600 px-3 py-2" disabled={!companyId || companies.length === 0}>Create User</button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {roles.filter((r) => r.active).map((r) => (
            <label key={r.id} className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <input type="checkbox" checked={customRoleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      </form>

      {companies.length === 0 ? <p className="mb-3 text-sm text-amber-300">Create a company first in Admin → Companies.</p> : null}
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Type</th>
              <th className="p-3">Custom Roles</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800">
                <td className="p-3"><Link href={`/admin/users/${u.id}`} className="text-blue-400">{u.name}</Link></td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.type}</td>
                <td className="p-3">{u.customRoles?.map((entry) => entry.role.name).join(', ') || '—'}</td>
                <td className="p-3">{u.active ? 'Active' : 'Disabled'}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={5}>No users found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
