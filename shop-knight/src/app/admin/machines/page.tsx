"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Machine = {
  id: string;
  name: string;
  costPerMinute: string | number;
  setupMinutes: number | null;
  hourlyCapacity: number | null;
  notes: string | null;
  active: boolean;
};

export default function MachinesAdminPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function handleArchive(machineId: string) {
    if (archivingId) return;
    const ok = window.confirm(showArchived ? 'Restore this machine?' : 'Archive this machine?');
    if (!ok) return;

    try {
      setArchivingId(machineId);
      const res = await fetch(`/api/admin/machines/${machineId}`, {
        method: showArchived ? 'POST' : 'DELETE',
        headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
        body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Failed to ${showArchived ? 'restore' : 'archive'} machine`);
      }

      setMachines((prev) => prev.filter((item) => item.id !== machineId));
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${showArchived ? 'restore' : 'archive'} machine`;
      window.alert(message);
    } finally {
      setArchivingId(null);
    }
  }

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/admin/machines?archived=${showArchived ? 'only' : 'active'}`);
      if (!res.ok) return;
      setMachines(await res.json());
    };

    run();
  }, [showArchived]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Machine Admin</h1>
          <p className="text-sm text-slate-500">Manage production machines and baseline costing values.</p>
        </div>
        {!showArchived ? (
          <Link href="/admin/machines/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
            Create Machine
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
              <th className="px-4 py-3 font-semibold">Machine</th>
              <th className="px-4 py-3 font-semibold">Cost / Minute</th>
              <th className="px-4 py-3 font-semibold">Setup Minutes</th>
              <th className="px-4 py-3 font-semibold">Hourly Capacity</th>
              <th className="px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{m.name}</td>
                <td className="px-4 py-4">{m.costPerMinute}</td>
                <td className="px-4 py-4">{m.setupMinutes ?? '—'}</td>
                <td className="px-4 py-4">{m.hourlyCapacity ?? '—'}</td>
                <td className="px-4 py-4">{m.notes || '—'}</td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleArchive(m.id)}
                    disabled={archivingId === m.id}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {archivingId === m.id ? (showArchived ? 'Restoring…' : 'Archiving…') : (showArchived ? 'Restore' : 'Archive')}
                  </button>
                </td>
              </tr>
            ))}
            {machines.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No machines yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
