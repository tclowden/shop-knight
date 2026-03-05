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
  customRoleId?: string | null;
  customRole?: { name: string } | null;
};

type CustomRole = { id: string; name: string; active: boolean };

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [customRoleId, setCustomRoleId] = useState('');
  const [active, setActive] = useState(true);

  async function load(userId: string) {
    const [usersRes, rolesRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/custom-roles'),
    ]);
    if (!usersRes.ok) return;
    const users = await usersRes.json();
    const found = users.find((u: User) => u.id === userId) || null;
    setUser(found);
    setCustomRoleId(found?.customRoleId || '');
    setActive(Boolean(found?.active));
    if (rolesRes.ok) setRoles(await rolesRes.json());
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customRoleId: customRoleId || null, active }),
    });
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

      <form onSubmit={saveUser} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-3">
        <select value={customRoleId} onChange={(e) => setCustomRoleId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="">No custom role</option>
          {roles.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
        <button className="rounded bg-blue-600 px-3 py-2">Save User</button>
      </form>

      <ModuleNotesTasks entityType="USER" entityId={id} />
    </main>
  );
}
