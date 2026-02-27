"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type User = { id: string; name: string };

type Step = {
  title: string;
  dueOffsetDays: string;
  assigneeMode: 'UNASSIGNED' | 'SPECIFIC_USER' | 'PM' | 'PROJECT_COORDINATOR';
  specificAssigneeId: string;
};

type Template = {
  id: string;
  name: string;
  steps: Array<{ id: string; title: string; dueOffsetDays: number; assigneeMode: string; specificAssignee?: { name: string } | null }>;
};

export default function TaskTemplatesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [name, setName] = useState('');
  const [steps, setSteps] = useState<Step[]>([
    { title: 'Kickoff task', dueOffsetDays: '0', assigneeMode: 'PM', specificAssigneeId: '' },
    { title: 'Prep task', dueOffsetDays: '0', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' },
    { title: 'Follow-up task', dueOffsetDays: '3', assigneeMode: 'PROJECT_COORDINATOR', specificAssigneeId: '' },
  ]);

  async function load() {
    const [uRes, tRes] = await Promise.all([fetch('/api/users'), fetch('/api/task-templates')]);
    if (uRes.ok) setUsers(await uRes.json());
    if (tRes.ok) setTemplates(await tRes.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { title: '', dueOffsetDays: '0', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' }]);
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/task-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        steps: steps.map((s, idx) => ({
          title: s.title,
          sortOrder: idx + 1,
          dueOffsetDays: Number(s.dueOffsetDays || 0),
          assigneeMode: s.assigneeMode,
          specificAssigneeId: s.assigneeMode === 'SPECIFIC_USER' ? s.specificAssigneeId || null : null,
        })),
      }),
    });
    setName('');
    await load();
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Task Templates</h1>
      <p className="text-sm text-zinc-400">Build reusable flows with relative due dates and role-based assignment (PM / Project Coordinator).</p>
      <Nav />

      <form onSubmit={createTemplate} className="mb-6 rounded border border-zinc-800 p-4 space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />

        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded border border-zinc-700 p-2 md:grid-cols-4">
              <input value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} placeholder={`Step ${i + 1} title`} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
              <input value={s.dueOffsetDays} onChange={(e) => updateStep(i, { dueOffsetDays: e.target.value })} type="number" placeholder="Due offset days" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
              <select value={s.assigneeMode} onChange={(e) => updateStep(i, { assigneeMode: e.target.value as Step['assigneeMode'] })} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                <option value="UNASSIGNED">Unassigned</option>
                <option value="PM">PM</option>
                <option value="PROJECT_COORDINATOR">Project Coordinator</option>
                <option value="SPECIFIC_USER">Specific User</option>
              </select>
              {s.assigneeMode === 'SPECIFIC_USER' ? (
                <select value={s.specificAssigneeId} onChange={(e) => updateStep(i, { specificAssigneeId: e.target.value })} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
                  <option value="">Select user</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : <div />}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={addStep} className="rounded border border-zinc-700 px-3 py-2">+ Add Step</button>
          <button className="rounded bg-blue-600 px-3 py-2">Create Template</button>
        </div>
      </form>

      <section className="space-y-3">
        {templates.map((t) => (
          <article key={t.id} className="rounded border border-zinc-800 p-3">
            <h2 className="font-medium">{t.name}</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">
              {t.steps.map((s) => (
                <li key={s.id}>{s.title} • due +{s.dueOffsetDays}d • {s.assigneeMode}{s.specificAssignee?.name ? ` (${s.specificAssignee.name})` : ''}</li>
              ))}
            </ul>
          </article>
        ))}
        {templates.length === 0 ? <p className="text-zinc-400">No templates yet.</p> : null}
      </section>
    </main>
  );
}
