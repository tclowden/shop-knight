"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type User = { id: string; name: string };
type Task = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  assignee?: { id: string; name: string } | null;
};

function taskEntityHref(t: Task) {
  if (t.entityType === 'QUOTE') return `/sales/quotes/${t.entityId}`;
  if (t.entityType === 'SALES_ORDER') return `/sales/orders/${t.entityId}`;
  if (t.entityType === 'OPPORTUNITY') return `/sales/opportunities/${t.entityId}`;
  if (t.entityType === 'CUSTOMER') return `/customers/${t.entityId}`;
  if (t.entityType === 'VENDOR') return `/vendors/${t.entityId}`;
  if (t.entityType === 'PRODUCT') return `/admin/products/${t.entityId}`;
  if (t.entityType === 'USER') return `/admin/users/${t.entityId}`;
  return '#';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [includeDone, setIncludeDone] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkAssigneeId, setBulkAssigneeId] = useState('UNCHANGED');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [applying, setApplying] = useState(false);

  async function load() {
    const [tasksRes, usersRes] = await Promise.all([
      fetch(`/api/tasks/all?includeDone=${includeDone ? 'true' : 'false'}`),
      fetch('/api/users'),
    ]);
    if (tasksRes.ok) setTasks(await tasksRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDone]);

  const statuses = useMemo(() => ['ALL', ...Array.from(new Set(tasks.map((t) => t.status))).sort()], [tasks]);
  const entityTypes = useMemo(() => ['ALL', ...Array.from(new Set(tasks.map((t) => t.entityType))).sort()], [tasks]);

  const visibleTasks = useMemo(() => {
    const text = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (entityFilter !== 'ALL' && t.entityType !== entityFilter) return false;
      if (assigneeFilter !== 'ALL') {
        if (assigneeFilter === 'UNASSIGNED' && t.assignee?.id) return false;
        if (assigneeFilter !== 'UNASSIGNED' && t.assignee?.id !== assigneeFilter) return false;
      }
      if (!text) return true;
      return `${t.title} ${t.entityType} ${t.entityLabel || ''} ${t.assignee?.name || ''}`.toLowerCase().includes(text);
    });
  }, [tasks, q, statusFilter, assigneeFilter, entityFilter]);

  const allVisibleSelected = visibleTasks.length > 0 && visibleTasks.every((t) => selectedIds.includes(t.id));

  function toggleRow(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleTasks.some((t) => t.id === id));
      const next = new Set(prev);
      visibleTasks.forEach((t) => next.add(t.id));
      return Array.from(next);
    });
  }

  async function applyBulkUpdate() {
    if (selectedIds.length === 0) return;

    const payload: Record<string, unknown> = { taskIds: selectedIds };
    if (bulkStatus) payload.status = bulkStatus;
    if (bulkAssigneeId !== 'UNCHANGED') payload.assigneeId = bulkAssigneeId || null;
    if (bulkDueDate) payload.dueAt = bulkDueDate;

    if (Object.keys(payload).length === 1) return;

    setApplying(true);
    await fetch('/api/tasks/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setApplying(false);
    setSelectedIds([]);
    setBulkStatus('');
    setBulkAssigneeId('UNCHANGED');
    setBulkDueDate('');
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
      <p className="text-sm text-slate-500">All tasks with bulk update controls.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks..." className="field md:col-span-2" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field">{statuses.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}</select>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="field">{entityTypes.map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}</select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="field"><option value="ALL">All Assignees</option><option value="UNASSIGNED">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm"><input type="checkbox" checked={includeDone} onChange={(e) => setIncludeDone(e.target.checked)} /> Include DONE</label>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Bulk update ({selectedIds.length} selected)</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="field">
            <option value="">Status (unchanged)</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="DONE">DONE</option>
          </select>
          <select value={bulkAssigneeId} onChange={(e) => setBulkAssigneeId(e.target.value)} className="field">
            <option value="UNCHANGED">Assignee (unchanged)</option>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} className="field" />
          <button onClick={() => { setBulkStatus(''); setBulkAssigneeId('UNCHANGED'); setBulkDueDate(''); }} className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">Clear Bulk Fields</button>
          <button onClick={applyBulkUpdate} disabled={selectedIds.length === 0 || applying} className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{applying ? 'Applying...' : 'Apply to Selected'}</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} /></th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Record</th>
              <th className="px-4 py-3 font-semibold">Assignee</th>
              <th className="px-4 py-3 font-semibold">Due</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleRow(t.id)} /></td>
                <td className="px-4 py-4 font-medium">{t.title}</td>
                <td className="px-4 py-4">{t.status}</td>
                <td className="px-4 py-4">{t.entityType}</td>
                <td className="px-4 py-4">
                  {taskEntityHref(t) === '#' ? (t.entityLabel || t.entityId) : <Link href={taskEntityHref(t)} className="text-sky-700">{t.entityLabel || t.entityId}</Link>}
                </td>
                <td className="px-4 py-4">{t.assignee?.name || 'Unassigned'}</td>
                <td className="px-4 py-4 text-slate-500">{t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {visibleTasks.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No tasks found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
