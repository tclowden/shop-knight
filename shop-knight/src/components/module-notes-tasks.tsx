"use client";

import { useCallback, useEffect, useState } from 'react';

type User = { id: string; name: string; email: string };
type TaskTemplate = { id: string; name: string };
type Note = { id: string; body: string; createdAt: string; createdBy?: { id: string; name: string } | null };
type Task = { id: string; title: string; status: string; dueAt: string | null; assignee?: { id: string; name: string } | null };

export function ModuleNotesTasks({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [noteBody, setNoteBody] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

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

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, body: noteBody }),
    });
    setNoteBody('');
    await load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/tasks', {
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

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      <article className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 text-lg font-medium">Notes</h2>
        <form onSubmit={addNote} className="mb-3 space-y-2">
          <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" rows={3} placeholder="Add note..." required />
          <button className="rounded bg-blue-600 px-3 py-2 text-sm">Add Note</button>
        </form>
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded border border-zinc-700 p-2 text-sm">
              <p>{n.body}</p>
              <p className="mt-1 text-xs text-zinc-400">{new Date(n.createdAt).toLocaleString()} {n.createdBy?.name ? `• ${n.createdBy.name}` : ''}</p>
            </div>
          ))}
          {notes.length === 0 ? <p className="text-sm text-zinc-400">No notes yet.</p> : null}
        </div>
      </article>

      <article className="rounded border border-zinc-800 p-4">
        <h2 className="mb-2 text-lg font-medium">Tasks</h2>

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

        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="rounded border border-zinc-700 p-2 text-sm">
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
      </article>
    </section>
  );
}
