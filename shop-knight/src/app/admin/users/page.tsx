"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type User = {
  id: string;
  name: string;
  email: string;
  type: string;
  active: boolean;
};

const userTypes = ['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE'];

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState('SALES');
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return;
    setUsers(await res.json());
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, type }),
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
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">User Admin</h1>
      <p className="text-sm text-zinc-400">Manage users, user types, and status.</p>
      <Nav />

      <form onSubmit={createUser} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temp password" type="password" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          {userTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="rounded bg-blue-600 px-3 py-2">Create User</button>
      </form>

      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.type}</td>
                <td className="p-3">{u.active ? 'Active' : 'Disabled'}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-400" colSpan={4}>No users found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
