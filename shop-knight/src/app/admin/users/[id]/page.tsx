"use client";

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type User = {
  id: string;
  name: string;
  email: string;
  type: string;
  phone?: string | null;
  knownTravelerNumber?: string | null;
  rewardMarriottNumber?: string | null;
  rewardUnitedNumber?: string | null;
  rewardDeltaNumber?: string | null;
  rewardAmericanNumber?: string | null;
  active: boolean;
  activeCompanyId?: string | null;
  customRoles?: Array<{ roleId: string; role: { id: string; name: string } }>;
};

type CustomRole = { id: string; name: string; active: boolean };
type Company = { id: string; name: string; slug: string };

const userTypes = ['ADMIN', 'SALES', 'SALES_REP', 'PROJECT_MANAGER', 'DESIGNER', 'OPERATIONS', 'PURCHASING', 'FINANCE'];

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block text-sm text-slate-800">{value}</span>
    </p>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('SALES');
  const [phone, setPhone] = useState('');
  const [knownTravelerNumber, setKnownTravelerNumber] = useState('');
  const [rewardMarriottNumber, setRewardMarriottNumber] = useState('');
  const [rewardUnitedNumber, setRewardUnitedNumber] = useState('');
  const [rewardDeltaNumber, setRewardDeltaNumber] = useState('');
  const [rewardAmericanNumber, setRewardAmericanNumber] = useState('');
  const [active, setActive] = useState(true);
  const [customRoleIds, setCustomRoleIds] = useState<string[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [editing, setEditing] = useState(false);

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
    setPhone(found?.phone || '');
    setKnownTravelerNumber(found?.knownTravelerNumber || '');
    setRewardMarriottNumber(found?.rewardMarriottNumber || '');
    setRewardUnitedNumber(found?.rewardUnitedNumber || '');
    setRewardDeltaNumber(found?.rewardDeltaNumber || '');
    setRewardAmericanNumber(found?.rewardAmericanNumber || '');
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
        phone,
        knownTravelerNumber,
        rewardMarriottNumber,
        rewardUnitedNumber,
        rewardDeltaNumber,
        rewardAmericanNumber,
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
    setEditing(false);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  if (!user) return <main className="mx-auto max-w-5xl p-8">Loading user...</main>;

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <Nav />
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">User: {user.name}</h1>
          <p className="text-sm text-slate-500">{user.email} • {user.type}</p>
        </div>
      </header>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!editing ? (
          <>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => { setSaved(''); setError(''); setEditing(true); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit User</button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <ReadField label="Name" value={name || '—'} />
              <ReadField label="Email" value={email || '—'} />
              <ReadField label="Type" value={type || '—'} />
              <ReadField label="Status" value={active ? 'Active' : 'Disabled'} />
              <ReadField label="Phone" value={phone || '—'} />
              <ReadField label="Known Traveler Number" value={knownTravelerNumber || '—'} />
              <ReadField label="Marriott #" value={rewardMarriottNumber || '—'} />
              <ReadField label="United #" value={rewardUnitedNumber || '—'} />
              <ReadField label="Delta #" value={rewardDeltaNumber || '—'} />
              <ReadField label="American #" value={rewardAmericanNumber || '—'} />
              <ReadField label="Custom Roles" value={roles.filter((r) => customRoleIds.includes(r.id)).map((r) => r.name).join(', ') || '—'} />
              <ReadField label="Company Membership" value={companies.filter((c) => companyIds.includes(c.id)).map((c) => c.name).join(', ') || '—'} />
              <ReadField label="Active Company" value={companies.find((c) => c.id === activeCompanyId)?.name || '—'} />
            </div>
          </>
        ) : (
          <form onSubmit={saveUser} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="field" required /></FormField>
            <FormField label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="field" required /></FormField>
            <FormField label="Type"><select value={type} onChange={(e) => setType(e.target.value)} className="field">{userTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></FormField>
            <FormField label="Status"><label className="field inline-flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label></FormField>
            <FormField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" /></FormField>
            <FormField label="Known Traveler Number"><input value={knownTravelerNumber} onChange={(e) => setKnownTravelerNumber(e.target.value)} className="field" /></FormField>
            <FormField label="Marriott #"><input value={rewardMarriottNumber} onChange={(e) => setRewardMarriottNumber(e.target.value)} className="field" /></FormField>
            <FormField label="United #"><input value={rewardUnitedNumber} onChange={(e) => setRewardUnitedNumber(e.target.value)} className="field" /></FormField>
            <FormField label="Delta #"><input value={rewardDeltaNumber} onChange={(e) => setRewardDeltaNumber(e.target.value)} className="field" /></FormField>
            <FormField label="American #"><input value={rewardAmericanNumber} onChange={(e) => setRewardAmericanNumber(e.target.value)} className="field" /></FormField>

            <div className="md:col-span-2">
              <FormField label="Custom Roles">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {roles.filter((r) => r.active).map((r) => (
                    <label key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <input type="checkbox" checked={customRoleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                      {r.name}
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Company Membership">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {companies.map((company) => (
                    <label key={company.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <input type="checkbox" checked={companyIds.includes(company.id)} onChange={() => toggleCompany(company.id)} />
                      {company.name}
                    </label>
                  ))}
                </div>
              </FormField>
            </div>

            <FormField label="Active Company">
              <select value={activeCompanyId} onChange={(e) => setActiveCompanyId(e.target.value)} className="field">
                {companyIds.map((companyId) => {
                  const company = companies.find((c) => c.id === companyId);
                  return <option key={companyId} value={companyId}>{company?.name || companyId}</option>;
                })}
              </select>
            </FormField>

            {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
            {saved ? <p className="md:col-span-2 text-sm text-emerald-600">{saved}</p> : null}

            <div className="md:col-span-2 flex gap-2 pt-2">
              <button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Save User</button>
              <button type="button" onClick={() => { setEditing(false); setError(''); setSaved(''); load(id); }} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        )}
      </section>

      <ModuleNotesTasks entityType="USER" entityId={id} />
    </main>
  );
}
