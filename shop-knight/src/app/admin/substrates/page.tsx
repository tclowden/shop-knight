"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Substrate = {
  id: string;
  name: string;
  addOnPrice: string | number;
  notes: string | null;
  active: boolean;
};

export default function SubstratesAdminPage() {
  const [substrates, setSubstrates] = useState<Substrate[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function handleArchive(substrateId: string) {
    if (archivingId) return;
    const ok = window.confirm(showArchived ? 'Restore this substrate?' : 'Archive this substrate?');
    if (!ok) return;

    try {
      setArchivingId(substrateId);
      const res = await fetch(`/api/admin/substrates/${substrateId}`, {
        method: showArchived ? 'POST' : 'DELETE',
        headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
        body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to ${showArchived ? 'restore' : 'archive'} substrate`);
      }

      setSubstrates((prev) => prev.filter((item) => item.id !== substrateId));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${showArchived ? 'restore' : 'archive'} substrate`;
      window.alert(message);
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/admin/substrates?archived=${showArchived ? 'only' : 'active'}`);
      if (!res.ok) return;
      setSubstrates(await res.json());
    };

    run();
  }, [showArchived]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Substrate Admin</h1>
          <p className="text-sm text-slate-500">Manage substrate options and pricing add-ons used by product pricing builders.</p>
        </div>
        {!showArchived ? (
          <Link href="/admin/substrates/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
            Create Substrate
          </Link>
        ) : null}
      </div>

      <Nav />

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowArchived((prev) => !prev)}
          className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Substrate</th>
              <th className="px-4 py-3 font-semibold">Add-on Price</th>
              <th className="px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {substrates.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{s.name}</td>
                <td className="px-4 py-4">{Number(s.addOnPrice).toFixed(2)}</td>
                <td className="px-4 py-4">{s.notes || '—'}</td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleArchive(s.id)}
                    disabled={archivingId === s.id}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {archivingId === s.id ? (showArchived ? 'Restoring…' : 'Archiving…') : (showArchived ? 'Restore' : 'Archive')}
                  </button>
                </td>
              </tr>
            ))}
            {substrates.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No substrates yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
