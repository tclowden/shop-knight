"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type User = { id: string; name: string; email: string; type: string; active: boolean };

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [user, setUser] = useState<User | null>(null);

  async function load(userId: string) {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return;
    const users = await res.json();
    setUser(users.find((u: User) => u.id === userId) || null);
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
      <p className="text-sm text-zinc-400">{user.email} • {user.type} • {user.active ? 'Active' : 'Disabled'}</p>
      <Nav />
      <ModuleNotesTasks entityType="USER" entityId={id} />
    </main>
  );
}
