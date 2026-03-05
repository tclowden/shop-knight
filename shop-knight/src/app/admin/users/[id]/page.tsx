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
  customRoles?: Array<{ roleId: string; role: { id: string; name: string } }>;
};

type CustomRole = { id: string; name: string; active: boolean };

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [customRoleIds, setCustomRoleIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  async function load(userId: string) {
    const [usersRes, rolesRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/custom-roles'),
    ]);
    if (!usersRes.ok) return;
    const users: User[] = await usersRes.json();
    const found = users.find((u) => u.id === userId) || null;
    setUser(found);
    setCustomRoleIds(found?.customRoles?.map((entry) => entry.roleId) || []);
    setActive(Boolean(found?.active));
    if (rolesRes.ok) setRoles(await rolesRes.json());
  }

  function toggleRole(roleId: string) {
    setCustomRoleIds((prev) => (prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]));
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customRoleIds, active }),
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

      <form onSubmit={saveUser} className="mb-4 rounded border border-zinc-800 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
          <button className="rounded bg-blue-600 px-3 py-2">Save User</button>
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

      <ModuleNotesTasks entityType="USER" entityId={id} />
    </main>
  );
}
