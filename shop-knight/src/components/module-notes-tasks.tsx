"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

type User = { id: string; name: string; email: string };
type TaskTemplate = { id: string; name: string };
type Note = { id: string; body: string; createdAt: string; createdBy?: { id: string; name: string } | null; mentions?: Array<{ mentionedUser?: { id: string; name: string } | null }> };
type Task = { id: string; title: string; status: string; startAt?: string | null; dueAt: string | null; assignee?: { id: string; name: string } | null };

type TaskView = 'list' | 'gantt';

function toDateValue(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ModuleNotesTasks({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [noteBody, setNoteBody] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskView, setTaskView] = useState<TaskView>('list');

  const [templateId, setTemplateId] = useState('');
  const [templateAnchorDate, setTemplateAnchorDate] = useState('');
  const [templatePmUserId, setTemplatePmUserId] = useState('');
  const [templateProjectCoordinatorUserId, setTemplateProjectCoordinatorUserId] = useState('');

  const load = useCallback(async () => {
    const [usersRes, templatesRes, notesRes, tasksRes] = await Promise.all([
      fetch('/api/users'),
      fetch('/api/task-templates'),
      fetch(`/api/notes?entityType=${entityType}&entityId=${entityId}`),
      fetch(`/api/tasks?entityType=${entityType}&entityId=${entityId}`),
    ]);

    if (usersRes.ok) setUsers(await usersRes.json());
    if (templatesRes.ok) setTemplates(await templatesRes.json());
    if (notesRes.ok) setNotes(await notesRes.json());
    if (tasksRes.ok) setTasks(await tasksRes.json());
  }, [entityType, entityId]);

  const ganttRows = useMemo(() => {
    const base = tasks
      .map((task) => {
        const due = toDateValue(task.dueAt);
        const start = toDateValue(task.startAt) ?? (due ? new Date(due.getTime() - 24 * 60 * 60 * 1000) : null);
        if (!start && !due) return null;
        const effectiveStart = start ?? due;
        const effectiveEnd = due ?? start;
        if (!effectiveStart || !effectiveEnd) return null;
        return { task, start: effectiveStart, end: effectiveEnd };
      })
      .filter(Boolean) as Array<{ task: Task; start: Date; end: Date }>;

    if (base.length === 0) return { min: null as Date | null, max: null as Date | null, rows: [] as typeof base };

    const minMs = Math.min(...base.map((x) => x.start.getTime()));
    const maxMs = Math.max(...base.map((x) => x.end.getTime()));
    const padMs = 24 * 60 * 60 * 1000;
    return { min: new Date(minMs - padMs), max: new Date(maxMs + padMs), rows: base };
  }, [tasks]);

  function onNoteChange(value: string) {
    setNoteBody(value);
    const at = value.lastIndexOf('@');
    if (at < 0) {
      setMentionQuery('');
      return;
    }
    const tail = value.slice(at + 1);
    if (!tail || /\s/.test(tail)) {
      setMentionQuery('');
      return;
    }
    setMentionQuery(tail.toLowerCase());
  }

  function insertMention(user: User) {
    const at = noteBody.lastIndexOf('@');
    if (at < 0) return;
    const next = `${noteBody.slice(0, at)}@${user.name} `;
    setNoteBody(next);
    setMentionQuery('');
    setMentionedUserIds((prev) => (prev.includes(user.id) ? prev : [...prev, user.id]));
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, body: noteBody, mentionedUserIds }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(typeof payload?.error === 'string' ? payload.error : 'Failed to add note');
      return;
    }

    setNoteBody('');
    setMentionedUserIds([]);
    setMentionQuery('');
    await load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        entityId,
        title: taskTitle,
        dueAt: taskDueAt || null,
        assigneeId: taskAssigneeId || null,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(typeof payload?.error === 'string' ? payload.error : 'Failed to create task');
      return;
    }

    setTaskTitle('');
    setTaskDueAt('');
    setTaskAssigneeId('');
    await load();
  }

  async function setTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function applyTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId) return;

    await fetch(`/api/task-templates/${templateId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        entityId,
        anchorDate: templateAnchorDate || null,
        pmUserId: templatePmUserId || null,
        projectCoordinatorUserId: templateProjectCoordinatorUserId || null,
      }),
    });

    await load();
  }

  useEffect(() => {
    if (!entityId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [entityId, load]);

  const mentionSuggestions = mentionQuery
    ? users.filter((u) => u.name.toLowerCase().includes(mentionQuery)).slice(0, 6)
    : [];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;

    if (hash.startsWith('#task-')) {
      const taskId = hash.replace('#task-', '');
      if (!tasks.some((t) => t.id === taskId)) return;
      const el = document.getElementById(`task-${taskId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (hash.startsWith('#note-')) {
      const noteId = hash.replace('#note-', '');
      if (!notes.some((n) => n.id === noteId)) return;
      const el = document.getElementById(`note-${noteId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [tasks, notes]);

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <article className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 text-lg font-medium">Notes</h2>
        <form onSubmit={addNote} className="mb-3 space-y-2">
          <textarea value={noteBody} onChange={(e) => onNoteChange(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" rows={3} placeholder="Add note... use @ to mention" required />
          {mentionSuggestions.length > 0 ? (
            <div className="rounded border border-zinc-700 bg-white p-1 text-xs text-zinc-800">
              {mentionSuggestions.map((u) => (
                <button key={u.id} type="button" onClick={() => insertMention(u)} className="mr-1 mb-1 rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100">
                  @{u.name}
                </button>
              ))}
            </div>
          ) : null}
          <button className="rounded bg-blue-600 px-3 py-2 text-sm">Add Note</button>
        </form>
        <div className="space-y-2">
          {notes.map((n) => (
            <div id={`note-${n.id}`} key={n.id} className="rounded border border-zinc-700 p-2 text-sm target:border-blue-500 target:bg-blue-950/20">
              <p>{n.body}</p>
              {n.mentions?.length ? (
                <p className="mt-1 text-xs text-zinc-500">Mentions: {n.mentions.map((m) => m.mentionedUser?.name).filter(Boolean).join(', ')}</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-400">{new Date(n.createdAt).toLocaleString()} {n.createdBy?.name ? `• ${n.createdBy.name}` : ''}</p>
            </div>
          ))}
          {notes.length === 0 ? <p className="text-sm text-zinc-400">No notes yet.</p> : null}
        </div>
      </article>

      <article className="rounded border border-zinc-800 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Tasks</h2>
          {entityType === 'JOB' ? (
            <div className="inline-flex overflow-hidden rounded border border-zinc-700 text-xs">
              <button type="button" onClick={() => setTaskView('list')} className={`px-2 py-1 ${taskView === 'list' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-300'}`}>List</button>
              <button type="button" onClick={() => setTaskView('gantt')} className={`px-2 py-1 ${taskView === 'gantt' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-300'}`}>Gantt</button>
            </div>
          ) : null}
        </div>

        <form onSubmit={applyTemplate} className="mb-4 space-y-2 rounded border border-zinc-700 p-3">
          <p className="text-sm font-medium">Apply Task Template</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Select template</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="date" value={templateAnchorDate} onChange={(e) => setTemplateAnchorDate(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            <select value={templatePmUserId} onChange={(e) => setTemplatePmUserId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">PM (optional)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={templateProjectCoordinatorUserId} onChange={(e) => setTemplateProjectCoordinatorUserId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Project Coordinator (optional)</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button className="rounded bg-indigo-600 px-3 py-2 text-sm">Apply Template</button>
        </form>

        <form onSubmit={addTask} className="mb-3 grid grid-cols-1 gap-2">
          <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={taskDueAt} onChange={(e) => setTaskDueAt(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
            <select value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button className="rounded bg-blue-600 px-3 py-2 text-sm">Create Task</button>
        </form>

        {taskView === 'list' ? (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div id={`task-${t.id}`} key={t.id} className="rounded border border-zinc-700 p-2 text-sm target:border-blue-500 target:bg-blue-950/20">
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 text-xs text-zinc-400">Due: {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—'} • Assignee: {t.assignee?.name || 'Unassigned'}</p>
                <div className="mt-2 flex gap-2">
                  {['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].map((s) => (
                    <button key={s} onClick={() => setTaskStatus(t.id, s)} className={`rounded border px-2 py-1 text-xs ${t.status === s ? 'border-blue-500 text-blue-400' : 'border-zinc-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {tasks.length === 0 ? <p className="text-sm text-zinc-400">No tasks yet.</p> : null}
          </div>
        ) : (
          <div className="rounded border border-zinc-700 p-2">
            {ganttRows.rows.length === 0 || !ganttRows.min || !ganttRows.max ? (
              <p className="text-sm text-zinc-400">No task dates yet. Add due dates to populate Gantt.</p>
            ) : (
              <div className="space-y-2">
                {ganttRows.rows.map(({ task, start, end }) => {
                  const total = ganttRows.max!.getTime() - ganttRows.min!.getTime();
                  const left = ((start.getTime() - ganttRows.min!.getTime()) / total) * 100;
                  const width = Math.max(((end.getTime() - start.getTime()) / total) * 100, 2);
                  return (
                    <div key={task.id} className="grid grid-cols-[180px_1fr] items-center gap-2 text-xs">
                      <div className="truncate text-zinc-300" title={task.title}>{task.title}</div>
                      <div className="relative h-6 rounded bg-zinc-900">
                        <div className="absolute inset-y-1 rounded bg-blue-500/80" style={{ left: `${left}%`, width: `${width}%` }} title={`${start.toLocaleDateString()} → ${end.toLocaleDateString()}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
