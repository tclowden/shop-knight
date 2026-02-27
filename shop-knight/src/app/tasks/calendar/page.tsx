"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

export default function TaskCalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [filterType, setFilterType] = useState('ALL');
  const [filterAssignee, setFilterAssignee] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterText, setFilterText] = useState('');

  async function load() {
    const [tasksRes, usersRes] = await Promise.all([fetch('/api/tasks/open'), fetch('/api/users')]);
    if (tasksRes.ok) setTasks(await tasksRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
  }

  async function saveSelectedTask(patch: Partial<Task>) {
    if (!selectedTaskId) return;
    await fetch(`/api/tasks/${selectedTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    await load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterType !== 'ALL' && t.entityType !== filterType) return false;
      if (filterAssignee !== 'ALL') {
        if (filterAssignee === 'UNASSIGNED' && t.assignee?.id) return false;
        if (filterAssignee !== 'UNASSIGNED' && t.assignee?.id !== filterAssignee) return false;
      }
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      const q = filterText.trim().toLowerCase();
      if (q) {
        const hay = `${t.title} ${t.entityType} ${t.entityLabel || ''} ${t.assignee?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, filterType, filterAssignee, filterStatus, filterText]);

  const taskByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach((t) => {
      if (!t.dueAt) return;
      const key = ymd(new Date(t.dueAt));
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [filteredTasks]);

  const calendarDays = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const entityTypes = Array.from(new Set(tasks.map((t) => t.entityType))).sort();

  function openTaskOnRecord(task: Task) {
    const href = taskEntityHref(task);
    if (href === '#') return;
    router.push(`${href}#task-${task.id}`);
  }

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Open Tasks Calendar</h1>
      <p className="text-sm text-zinc-400">Calendar view of all open tasks with due dates.</p>
      <Nav />

      <div className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Search tasks..." className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="ALL">All Types</option>
          {entityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="ALL">All Assignees</option>
          <option value="UNASSIGNED">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option value="ALL">All Statuses</option>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="BLOCKED">BLOCKED</option>
          <option value="DONE">DONE</option>
        </select>
        <button onClick={() => { setFilterText(''); setFilterType('ALL'); setFilterAssignee('ALL'); setFilterStatus('ALL'); }} className="rounded border border-zinc-700 px-3 py-2">Clear Filters</button>
      </div>

      {selectedTask ? (
        <section className="mb-4 rounded border border-zinc-800 p-3">
          <p className="font-medium">Quick Edit: {selectedTask.title}</p>
          <p className="mb-2 text-xs text-zinc-400">{selectedTask.entityType} • {selectedTask.entityLabel || selectedTask.entityId}</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <select value={selectedTask.status} onChange={(e) => saveSelectedTask({ status: e.target.value })} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="DONE">DONE</option>
            </select>
            <input type="date" value={selectedTask.dueAt ? ymd(new Date(selectedTask.dueAt)) : ''} onChange={(e) => saveSelectedTask({ dueAt: e.target.value || null })} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            <select value={selectedTask.assignee?.id || ''} onChange={(e) => saveSelectedTask({ assigneeId: e.target.value || null })} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <a href={`${taskEntityHref(selectedTask)}#task-${selectedTask.id}`} className="rounded border border-zinc-700 px-3 py-2 text-center">Open record</a>
          </div>
        </section>
      ) : null}

      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="rounded border border-zinc-700 px-3 py-1">← Prev</button>
        <p className="min-w-48 text-center font-medium">{monthLabel}</p>
        <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="rounded border border-zinc-700 px-3 py-1">Next →</button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-zinc-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-2 text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((d) => {
          const key = ymd(d);
          const dayTasks = taskByDay.get(key) || [];
          const inMonth = d.getMonth() === monthCursor.getMonth();
          return (
            <div key={key} className={`min-h-28 rounded border p-2 ${inMonth ? 'border-zinc-700' : 'border-zinc-900 opacity-50'}`}>
              <p className="mb-1 text-xs font-medium">{d.getDate()}</p>
              <div className="space-y-1">
                {dayTasks.slice(0, 4).map((t) => {
                  const hover = `Task: ${t.title}\nAssignee: ${t.assignee?.name || 'Unassigned'}\nAssigned to: ${t.entityType} • ${t.entityLabel || t.entityId}`;
                  return (
                    <button key={t.id} title={hover} onClick={() => { setSelectedTaskId(t.id); openTaskOnRecord(t); }} className={`w-full rounded px-2 py-1 text-left text-xs ${selectedTaskId === t.id ? 'bg-blue-700' : 'bg-zinc-800'}`}>
                      <p className="truncate">{t.entityType}: {t.entityLabel || t.entityId}</p>
                      <p className="truncate text-[10px] text-zinc-300">{t.title}</p>
                    </button>
                  );
                })}
                {dayTasks.length > 4 ? <p className="text-[10px] text-zinc-400">+{dayTasks.length - 4} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-6 rounded border border-zinc-800 p-4">
        <h2 className="mb-2 font-medium">Open Tasks (list)</h2>
        <div className="space-y-2 text-sm">
          {filteredTasks.map((t) => (
            <button key={t.id} onClick={() => { setSelectedTaskId(t.id); openTaskOnRecord(t); }} className="w-full rounded border border-zinc-700 p-2 text-left">
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-zinc-400">Due: {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'No due date'} • {t.entityType} • {t.entityLabel || t.entityId} • {t.assignee?.name || 'Unassigned'}</p>
            </button>
          ))}
          {filteredTasks.length === 0 ? <p className="text-zinc-400">No open tasks found.</p> : null}
        </div>
      </section>
    </main>
  );
}
