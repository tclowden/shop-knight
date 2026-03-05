"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { APP_PERMISSIONS } from '@/lib/rbac';

type Role = { id: string; name: string; active: boolean; permissions?: string[] | null };

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [editingRoleId, setEditingRoleId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editActive, setEditActive] = useState(true);

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

  function toggleEditPermission(permission: string) {
    setEditPermissions((prev) =>
      prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission]
    );
  }

  function startEdit(role: Role) {
    setEditingRoleId(role.id);
    setEditName(role.name);
    setEditPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    setEditActive(role.active);
  }

  function cancelEdit() {
    setEditingRoleId('');
    setEditName('');
    setEditPermissions([]);
    setEditActive(true);
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

  async function saveRoleEdits(e: FormEvent) {
    e.preventDefault();
    if (!editingRoleId) return;
    setError('');

    const res = await fetch(`/api/admin/custom-roles/${editingRoleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editName,
        active: editActive,
        permissions: editPermissions,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data?.error || 'Failed to update role');
      return;
    }

    cancelEdit();
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Custom Roles</h1>
      <p className="text-sm text-zinc-400">Create and edit roles, including permission access by page.</p>
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

      {editingRoleId ? (
        <form onSubmit={saveRoleEdits} className="mb-4 rounded border border-orange-500/40 bg-orange-500/5 p-3">
          <p className="mb-2 text-sm text-orange-200">Editing existing role</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Role name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
            <label className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
              Active
            </label>
            <button className="rounded bg-orange-600 px-3 py-2">Save Changes</button>
            <button type="button" onClick={cancelEdit} className="rounded border border-zinc-600 px-3 py-2">Cancel</button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {APP_PERMISSIONS.map((permission) => (
              <label key={permission} className="flex items-center gap-2 rounded border border-zinc-700 bg-white p-2 text-sm text-zinc-900">
                <input
                  type="checkbox"
                  checked={editPermissions.includes(permission)}
                  onChange={() => toggleEditPermission(permission)}
                />
                {permission}
              </label>
            ))}
          </div>
        </form>
      ) : null}

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="p-3">Role</th><th className="p-3">Permissions</th><th className="p-3">Active</th><th className="p-3">Action</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-xs text-zinc-300">{Array.isArray(r.permissions) && r.permissions.length > 0 ? r.permissions.join(', ') : '—'}</td>
                <td className="p-3">{r.active ? 'Yes' : 'No'}</td>
                <td className="p-3">
                  <button type="button" onClick={() => startEdit(r)} className="rounded border border-zinc-600 px-2 py-1 text-xs hover:border-orange-300/40 hover:bg-orange-400/10">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
