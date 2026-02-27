"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type Vendor = { id: string; name: string; email: string | null; phone: string | null };

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [item, setItem] = useState<Vendor | null>(null);

  async function load(vendorId: string) {
    const res = await fetch(`/api/vendors/${vendorId}`);
    if (res.ok) setItem(await res.json());
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  if (!item) return <main className="mx-auto max-w-5xl p-8">Loading vendor...</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Vendor: {item.name}</h1>
      <p className="text-sm text-zinc-400">{item.email || '—'} • {item.phone || '—'}</p>
      <Nav />
      <ModuleNotesTasks entityType="VENDOR" entityId={id} />
    </main>
  );
}
