"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type Customer = { id: string; name: string; email: string | null; phone: string | null };

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [item, setItem] = useState<Customer | null>(null);

  async function load(customerId: string) {
    const res = await fetch(`/api/customers/${customerId}`);
    if (res.ok) setItem(await res.json());
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  if (!item) return <main className="mx-auto max-w-5xl p-8">Loading customer...</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Customer: {item.name}</h1>
      <p className="text-sm text-zinc-400">{item.email || '—'} • {item.phone || '—'}</p>
      <Nav />
      <ModuleNotesTasks entityType="CUSTOMER" entityId={id} />
    </main>
  );
}
