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
  approvalNote?: string | null;
  approvedAt?: string | null;
  lastEditedAt?: string | null;
  user: { id: string; name: string; email: string };
  approvedBy?: { id: string; name: string } | null;
  lastEditedBy?: { id: string; name: string } | null;
  salesOrder?: { orderNumber: string } | null;
  quote?: { quoteNumber: string } | null;
  job?: { name: string } | null;
};

export default function AdminTimePage() {
  const [scope, setScope] = useState<'team' | 'all'>('team');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalNoteById, setApprovalNoteById] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState('');
  const [editClockInAt, setEditClockInAt] = useState('');
  const [editClockOutAt, setEditClockOutAt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    const params = new URLSearchParams();
    params.set('scope', scope);
    if (statusFilter) params.set('status', statusFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/time?${params.toString()}`);
    const data = await res.json().catch(() => []);
    setEntries(Array.isArray(data) ? data : []);
  }

  async function updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    await fetch(`/api/time/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approvalNote: approvalNoteById[id] || '' }),
    });
    await load();
  }

  function openEdit(entry: Entry) {
    setEditingId(entry.id);
    setEditClockInAt(new Date(entry.clockInAt).toISOString().slice(0, 16));
    setEditClockOutAt(entry.clockOutAt ? new Date(entry.clockOutAt).toISOString().slice(0, 16) : '');
    setEditNotes(entry.notes || '');
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch(`/api/time/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clockInAt: editClockInAt ? new Date(editClockInAt).toISOString() : undefined,
        clockOutAt: editClockOutAt ? new Date(editClockOutAt).toISOString() : undefined,
        notes: editNotes,
      }),
    });
    setEditingId('');
    await load();
  }

  function exportCsv() {
    const params = new URLSearchParams();
    params.set('scope', scope);
    if (statusFilter) params.set('status', statusFilter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    window.location.href = `/api/time/export?${params.toString()}`;
  }

  useEffect(() => { load(); }, [scope, statusFilter, from, to]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Time Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Manager + HR review, approvals, edits, audit trail, and payroll export.</p>
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
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field h-11" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field h-11" />
          <button type="button" onClick={exportCsv} className="inline-flex h-11 items-center rounded-lg border border-sky-300 bg-sky-50 px-4 text-sm font-semibold text-sky-700">Export Payroll CSV</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1200px]">
          <thead className="bg-[#eaf6fd] text-slate-600"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Approval Note</th><th className="px-4 py-3">Audit Trail</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{entry.user.name}</td>
                <td className="px-4 py-3">{entry.salesOrder?.orderNumber || entry.quote?.quoteNumber || entry.job?.name || '—'}</td>
                <td className="px-4 py-3">{new Date(entry.clockInAt).toLocaleString()}</td>
                <td className="px-4 py-3">{entry.clockOutAt ? new Date(entry.clockOutAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">{entry.minutesWorked ? (entry.minutesWorked / 60).toFixed(2) : '—'}</td>
                <td className="px-4 py-3">{entry.status}</td>
                <td className="px-4 py-3">
                  <input value={approvalNoteById[entry.id] ?? entry.approvalNote ?? ''} onChange={(e) => setApprovalNoteById((prev) => ({ ...prev, [entry.id]: e.target.value }))} className="field h-9" placeholder="Optional note" />
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <div>Approved: {entry.approvedBy?.name || '—'} {entry.approvedAt ? `(${new Date(entry.approvedAt).toLocaleString()})` : ''}</div>
                  <div>Edited: {entry.lastEditedBy?.name || '—'} {entry.lastEditedAt ? `(${new Date(entry.lastEditedAt).toLocaleString()})` : ''}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(entry)} className="mr-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">Edit</button>
                  <button onClick={() => updateStatus(entry.id, 'APPROVED')} className="mr-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Approve</button>
                  <button onClick={() => updateStatus(entry.id, 'REJECTED')} className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {editingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold">Edit Time Entry</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clock In
                <input type="datetime-local" value={editClockInAt} onChange={(e) => setEditClockInAt(e.target.value)} className="field mt-1" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clock Out
                <input type="datetime-local" value={editClockOutAt} onChange={(e) => setEditClockOutAt(e.target.value)} className="field mt-1" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="field mt-1 min-h-24" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingId('')} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={saveEdit} className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Save Changes</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
