"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  entityType: string;
  entityId: string;
  assignee?: { id: string; name: string } | null;
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TaskCalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  async function load() {
    const res = await fetch('/api/tasks/open');
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const taskByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      if (!t.dueAt) return;
      const key = ymd(new Date(t.dueAt));
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });
    return map;
  }, [tasks]);

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

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Open Tasks Calendar</h1>
      <p className="text-sm text-zinc-400">Calendar view of all open tasks with due dates.</p>
      <Nav />

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
                {dayTasks.slice(0, 4).map((t) => (
                  <div key={t.id} className="rounded bg-zinc-800 px-2 py-1 text-xs">
                    <p className="truncate">{t.title}</p>
                    <p className="text-[10px] text-zinc-400">{t.assignee?.name || 'Unassigned'}</p>
                  </div>
                ))}
                {dayTasks.length > 4 ? <p className="text-[10px] text-zinc-400">+{dayTasks.length - 4} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-6 rounded border border-zinc-800 p-4">
        <h2 className="mb-2 font-medium">Open Tasks (list)</h2>
        <div className="space-y-2 text-sm">
          {tasks.map((t) => (
            <div key={t.id} className="rounded border border-zinc-700 p-2">
              <p className="font-medium">{t.title}</p>
              <p className="text-xs text-zinc-400">Due: {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'No due date'} • {t.entityType} • {t.assignee?.name || 'Unassigned'}</p>
            </div>
          ))}
          {tasks.length === 0 ? <p className="text-zinc-400">No open tasks found.</p> : null}
        </div>
      </section>
    </main>
  );
}
