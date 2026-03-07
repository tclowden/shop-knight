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
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Task Templates</h1>
      <p className="text-sm text-slate-500">Build reusable flows with relative due dates and role-based assignment.</p>
      <Nav />

      <form onSubmit={createTemplate} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="field" required />

        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-4">
              <input value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} placeholder={`Step ${i + 1} title`} className="field" required />
              <input value={s.dueOffsetDays} onChange={(e) => updateStep(i, { dueOffsetDays: e.target.value })} type="number" placeholder="Due offset days" className="field" />
              <select value={s.assigneeMode} onChange={(e) => updateStep(i, { assigneeMode: e.target.value as Step['assigneeMode'] })} className="field">
                <option value="UNASSIGNED">Unassigned</option>
                <option value="PM">PM</option>
                <option value="PROJECT_COORDINATOR">Project Coordinator</option>
                <option value="SPECIFIC_USER">Specific User</option>
              </select>
              {s.assigneeMode === 'SPECIFIC_USER' ? (
                <select value={s.specificAssigneeId} onChange={(e) => updateStep(i, { specificAssigneeId: e.target.value })} className="field">
                  <option value="">Select user</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : <div />}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={addStep} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">+ Add Step</button>
          <button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">Create Template</button>
        </div>
      </form>

      <section className="space-y-3">
        {templates.map((t) => (
          <article key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-800">{t.name}</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
              {t.steps.map((s) => (
                <li key={s.id}>{s.title} • due +{s.dueOffsetDays}d • {s.assigneeMode}{s.specificAssignee?.name ? ` (${s.specificAssignee.name})` : ''}</li>
              ))}
            </ul>
          </article>
        ))}
        {templates.length === 0 ? <p className="text-slate-500">No templates yet.</p> : null}
      </section>
    </main>
  );
}
