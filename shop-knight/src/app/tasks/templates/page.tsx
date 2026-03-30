"use client";

import { FormEvent, useEffect, useState } from 'react';
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
  active: boolean;
  steps: Array<{ id: string; title: string; sortOrder: number; dueOffsetDays: number; assigneeMode: string; specificAssignee?: { id: string; name: string } | null }>;
};

const DEFAULT_STEPS: Step[] = [
  { title: 'Kickoff task', dueOffsetDays: '0', assigneeMode: 'PM', specificAssigneeId: '' },
  { title: 'Prep task', dueOffsetDays: '0', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' },
  { title: 'Follow-up task', dueOffsetDays: '3', assigneeMode: 'PROJECT_COORDINATOR', specificAssigneeId: '' },
];

export default function TaskTemplatesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showEditor, setShowEditor] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);

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

  function resetEditor() {
    setEditingTemplateId(null);
    setError('');
    setSaving(false);
    setName('');
    setSteps(DEFAULT_STEPS);
  }

  function openCreateEditor() {
    resetEditor();
    setShowEditor(true);
  }

  function openEditEditor(template: Template) {
    setEditingTemplateId(template.id);
    setError('');
    setSaving(false);
    setName(template.name);
    setSteps(template.steps.map((step) => ({
      title: step.title,
      dueOffsetDays: String(step.dueOffsetDays),
      assigneeMode: step.assigneeMode as Step['assigneeMode'],
      specificAssigneeId: step.specificAssignee?.id || '',
    })));
    setShowEditor(true);
  }

  function cancelEditor() {
    resetEditor();
    setShowEditor(false);
  }

  function addStep() {
    setSteps((prev) => [...prev, { title: '', dueOffsetDays: '0', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveStep(i: number, direction: -1 | 1) {
    setSteps((prev) => {
      const nextIndex = i + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [step] = next.splice(i, 1);
      next.splice(nextIndex, 0, step);
      return next;
    });
  }

  async function saveTemplate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const res = await fetch(editingTemplateId ? `/api/task-templates/${editingTemplateId}` : '/api/task-templates', {
      method: editingTemplateId ? 'PATCH' : 'POST',
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = typeof data?.error === 'string' ? data.error : `Failed to ${editingTemplateId ? 'update' : 'create'} template`;
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      setSaving(false);
      setError(detail ? `${message} - ${detail}` : message);
      return;
    }

    cancelEditor();
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Task Templates</h1>
      <p className="text-sm text-slate-500">Build reusable flows with relative due dates and role-based assignment.</p>
      <Nav />

      <div className="mb-4 flex justify-end">
        {!showEditor ? (
          <button type="button" onClick={openCreateEditor} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
            Create Template
          </button>
        ) : null}
      </div>

      {showEditor ? (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">{editingTemplateId ? 'Edit Template' : 'Create Template'}</h2>
            <button type="button" onClick={cancelEditor} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          </div>

          <form onSubmit={saveTemplate} className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="field" required />

            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={`${editingTemplateId || 'new'}-${i}`} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-6">
                  <input value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} placeholder={`Step ${i + 1} title`} className="field md:col-span-2" required />
                  <input value={s.dueOffsetDays} onChange={(e) => updateStep(i, { dueOffsetDays: e.target.value })} type="number" placeholder="Due offset days" className="field" />
                  <select value={s.assigneeMode} onChange={(e) => updateStep(i, { assigneeMode: e.target.value as Step['assigneeMode'], specificAssigneeId: e.target.value === 'SPECIFIC_USER' ? s.specificAssigneeId : '' })} className="field">
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
                  ) : (
                    <div className="field flex items-center text-sm text-slate-500">Auto by role</div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Up</button>
                    <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Down</button>
                    <button type="button" onClick={() => removeStep(i)} disabled={steps.length === 1} className="inline-flex h-11 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={addStep} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">+ Add Step</button>
              <button disabled={saving} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                {saving ? (editingTemplateId ? 'Updating...' : 'Creating...') : (editingTemplateId ? 'Save Changes' : 'Create Template')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="space-y-3">
        {templates.map((t) => (
          <article key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-800">{t.name}</h2>
              <button type="button" onClick={() => openEditEditor(t)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
            </div>
            <ol className="mt-2 list-decimal pl-5 text-sm text-slate-600">
              {t.steps.map((s) => (
                <li key={s.id}>{s.title} • due +{s.dueOffsetDays}d • {s.assigneeMode}{s.specificAssignee?.name ? ` (${s.specificAssignee.name})` : ''}</li>
              ))}
            </ol>
          </article>
        ))}
        {templates.length === 0 ? <p className="text-slate-500">No templates yet.</p> : null}
      </section>
    </main>
  );
}
