"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { APP_PERMISSIONS } from '@/lib/rbac';

type Role = { id: string; name: string; active: boolean; permissions?: string[] | null };

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/admin/custom-roles');
    if (!res.ok) return;
    setRoles(await res.json());
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission]
    );
  }

  async function createRole(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/custom-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, permissions: selectedPermissions }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to create role');
      return;
    }
    setName('');
    setSelectedPermissions([]);
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Custom Roles</h1>
      <p className="text-sm text-zinc-400">Create custom roles and choose which app areas they can access.</p>
      <Nav />

      <form onSubmit={createRole} className="mb-4 rounded border border-zinc-800 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          <button className="rounded bg-blue-600 px-3 py-2">Create Role</button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {APP_PERMISSIONS.map((permission) => (
            <label key={permission} className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                checked={selectedPermissions.includes(permission)}
                onChange={() => togglePermission(permission)}
              />
              {permission}
            </label>
          ))}
        </div>
      </form>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Role</th><th className="p-3">Permissions</th><th className="p-3">Active</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-xs text-zinc-300">{Array.isArray(r.permissions) && r.permissions.length > 0 ? r.permissions.join(', ') : '—'}</td>
                <td className="p-3">{r.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
