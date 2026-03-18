"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Entry = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  clockInAt: string;
  clockOutAt: string | null;
  minutesWorked: number | null;
  notes?: string | null;
  user: { id: string; name: string; email: string };
  salesOrder?: { orderNumber: string } | null;
  quote?: { quoteNumber: string } | null;
  job?: { name: string } | null;
};

export default function AdminTimePage() {
  const [scope, setScope] = useState<'team' | 'all'>('team');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    const res = await fetch(`/api/time?scope=${scope}${statusFilter ? `&status=${statusFilter}` : ''}`);
    const data = await res.json().catch(() => []);
    setEntries(Array.isArray(data) ? data : []);
  }

  async function updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    await fetch(`/api/time/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  useEffect(() => { load(); }, [scope, statusFilter]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Time Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Manager + HR review, approvals, and corrections.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select value={scope} onChange={(e) => setScope(e.target.value as 'team' | 'all')} className="field h-11">
            <option value="team">My Team</option>
            <option value="all">HR Admin (All Employees)</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-11">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{entry.user.name}</td>
                <td className="px-4 py-3">{entry.salesOrder?.orderNumber || entry.quote?.quoteNumber || entry.job?.name || '—'}</td>
                <td className="px-4 py-3">{new Date(entry.clockInAt).toLocaleString()}</td>
                <td className="px-4 py-3">{entry.clockOutAt ? new Date(entry.clockOutAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">{entry.minutesWorked ? (entry.minutesWorked / 60).toFixed(2) : '—'}</td>
                <td className="px-4 py-3">{entry.status}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => updateStatus(entry.id, 'APPROVED')} className="mr-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Approve</button>
                  <button onClick={() => updateStatus(entry.id, 'REJECTED')} className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
