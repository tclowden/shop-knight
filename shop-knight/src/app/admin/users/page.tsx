"use client";

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/nav';

type User = {
  id: string;
  name: string;
  email: string;
  type: string;
  active: boolean;
  activeCompanyId?: string | null;
  isEmployee?: boolean;
  reportsToId?: string | null;
  reportsTo?: { id: string; name: string } | null;
  titleId?: string | null;
  title?: { id: string; name: string } | null;
  customRoles?: Array<{ roleId: string; role: { id: string; name: string } }>;
};

type CustomRole = { id: string; name: string; active: boolean };
type Company = { id: string; name: string; slug: string };
type Title = { id: string; name: string; active: boolean };

const userTypes = ['SUPER_ADMIN', 'ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'];

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function UsersAdminPage() {
  const { data: session, update } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('SALES');
  const [companyId, setCompanyId] = useState('');
  const [titleId, setTitleId] = useState('');
  const [isEmployee, setIsEmployee] = useState(true);
  const [reportsToId, setReportsToId] = useState('');
  const [customRoleIds, setCustomRoleIds] = useState<string[]>([]);
  const [rowTypes, setRowTypes] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState('');
  const [emulatingUserId, setEmulatingUserId] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const role = String(session?.user?.role || '');
  const sessionRoles = Array.isArray(session?.user?.roles) ? session.user.roles.map(String) : [];
  const isSuperAdmin = role === 'SUPER_ADMIN' || sessionRoles.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || role === 'ADMIN' || sessionRoles.includes('ADMIN');
  const availableUserTypes = isSuperAdmin ? userTypes : userTypes.filter((t) => t !== 'SUPER_ADMIN');

  function canEmulateUser(target: User) {
    if (!isAdmin || !session?.user?.id) return false;
    if (session.user.id === target.id) return false;
    if (target.type === 'SUPER_ADMIN' && !isSuperAdmin) return false;
    if (!isSuperAdmin) {
      if (!session.user.companyId || !target.activeCompanyId || target.activeCompanyId !== session.user.companyId) return false;
    }
    return true;
  }

  async function loadTitles(nextCompanyId: string) {
    if (!nextCompanyId) {
      setTitles([]);
      setTitleId('');
      return;
    }

    const res = await fetch(`/api/admin/titles?companyId=${encodeURIComponent(nextCompanyId)}`);
    if (!res.ok) {
      setTitles([]);
      setTitleId('');
      return;
    }

    const nextTitles: Title[] = await res.json();
    setTitles(nextTitles);
    setTitleId((prev) => (prev && nextTitles.some((t) => t.id === prev) ? prev : ''));
  }

  async function load() {
    const [usersRes, rolesRes, companiesRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/custom-roles'),
      fetch('/api/admin/companies'),
    ]);
    if (usersRes.ok) {
      const userData = await usersRes.json();
      setUsers(userData);
      const nextRowTypes: Record<string, string> = {};
      for (const u of userData as User[]) nextRowTypes[u.id] = u.type;
      setRowTypes(nextRowTypes);
    }
    if (rolesRes.ok) setRoles(await rolesRes.json());
    if (companiesRes.ok) {
      const data = await companiesRes.json();
      const list = Array.isArray(data?.companies) ? data.companies : [];
      const mapped = list.map((c: { id: string; name: string; slug: string }) => ({ id: c.id, name: c.name, slug: c.slug }));
      setCompanies(mapped);
      setCompanyId((prev) => prev || mapped[0]?.id || '');
    }
  }

  function toggleRole(roleId: string) {
    setCustomRoleIds((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));
  }

  async function saveUserType(userId: string) {
    setError('');
    setSavingUserId(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: rowTypes[userId] }),
    });
    setSavingUserId('');

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Failed to update user type');
      return;
    }

    await load();
  }

  async function setUserActive(userId: string, nextActive: boolean) {
    setError('');
    setSavingUserId(userId);

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nextActive }),
    });

    setSavingUserId('');

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || `Failed to ${nextActive ? 'activate' : 'deactivate'} user`);
      return;
    }

    await load();
  }

  async function beginEmulation(targetUserId: string) {
    setError('');
    setEmulatingUserId(targetUserId);

    const res = await fetch('/api/admin/emulation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    });

    const payload = await res.json().catch(() => ({}));
    setEmulatingUserId('');

    if (!res.ok) {
      setError(payload?.error || 'Failed to start emulation');
      return;
    }

    await update();
    window.location.assign('/dashboard');
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        type,
        companyId,
        titleId: titleId || null,
        isEmployee,
        reportsToId: isEmployee && reportsToId ? reportsToId : null,
        customRoleIds,
      }),
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
    setTitleId('');
    setIsEmployee(true);
    setReportsToId('');
    setCustomRoleIds([]);
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    loadTitles(companyId);
  }, [companyId]);

  const totalUsers = users.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedUsers = users.slice(pageStart, pageStart + pageSize);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">User Admin</h1>
      <p className="text-sm text-slate-500">Assign base type plus multiple custom roles for page access.</p>
      <Nav />
      <div className="mb-4">
        <Link href="/admin/users/org-chart" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          View Org Chart
        </Link>
      </div>

      <form onSubmit={createUser} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="field" required /></FormField>
          <FormField label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="field" required /></FormField>
          <FormField label="Temporary Password"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="field" required /></FormField>
          <FormField label="Base Role"><select value={type} onChange={(e) => setType(e.target.value)} className="field">{availableUserTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select></FormField>
          <FormField label="Company"><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="field" required>
            <option value="" disabled>Select company</option>
            {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select></FormField>
          <FormField label="Title"><select value={titleId} onChange={(e) => setTitleId(e.target.value)} className="field">
            <option value="">No title</option>
            {titles.filter((t) => t.active).map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select></FormField>
          <FormField label="Employee Status"><label className="field inline-flex items-center gap-2"><input type="checkbox" checked={isEmployee} onChange={(e) => { setIsEmployee(e.target.checked); if (!e.target.checked) setReportsToId(''); }} /> Is Employee</label></FormField>
          <FormField label="Reports To"><select value={reportsToId} onChange={(e) => setReportsToId(e.target.value)} className="field" disabled={!isEmployee}>
            <option value="">No manager</option>
            {users.filter((u) => u.active && (u.isEmployee ?? true)).map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
          </select></FormField>
          <button className="inline-flex h-11 items-center justify-center self-end rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600" disabled={!companyId || companies.length === 0}>Create User</button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {roles.filter((r) => r.active).map((r) => (
            <label key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800">
              <input type="checkbox" checked={customRoleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
              {r.name}
            </label>
          ))}
        </div>
      </form>

      {companies.length === 0 ? <p className="mb-3 text-sm text-amber-600">Create a company first in Admin → Companies.</p> : null}
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Reports To</th>
              <th className="px-4 py-3 font-semibold">Custom Roles</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/admin/users/${u.id}`} className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-200">{u.name}</Link></td>
                <td className="px-4 py-4">{u.email}</td>
                <td className="px-4 py-4">
                  {u.type === 'SUPER_ADMIN' && !isSuperAdmin ? (
                    <span className="text-xs font-semibold text-slate-700">SUPER_ADMIN</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select value={rowTypes[u.id] || u.type} onChange={(e) => setRowTypes((prev) => ({ ...prev, [u.id]: e.target.value }))} className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-900">
                        {availableUserTypes.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                      <button type="button" onClick={() => saveUserType(u.id)} disabled={savingUserId === u.id || (rowTypes[u.id] || u.type) === u.type} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50">
                        {savingUserId === u.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">{u.title?.name || '—'}</td>
                <td className="px-4 py-4">{u.isEmployee === false ? 'No' : 'Yes'}</td>
                <td className="px-4 py-4">{u.reportsTo?.name || '—'}</td>
                <td className="px-4 py-4">{u.customRoles?.map((entry) => entry.role.name).join(', ') || '—'}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span>{u.active ? 'Active' : 'Disabled'}</span>
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => setUserActive(u.id, !u.active)}
                        disabled={savingUserId === u.id}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      >
                        {savingUserId === u.id ? 'Saving...' : u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {canEmulateUser(u) ? (
                    <button
                      type="button"
                      onClick={() => beginEmulation(u.id)}
                      disabled={emulatingUserId === u.id}
                      className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {emulatingUserId === u.id ? 'Starting…' : 'Emulate'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={9}>No users found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          Showing {totalUsers === 0 ? 0 : pageStart + 1}-{Math.min(pageStart + pageSize, totalUsers)} of {totalUsers}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Per page</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
          >
            {[25, 50, 75, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-1">Page {currentPage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
