"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type User = { id: string; name: string; email: string };
type StepDraft = { name: string; assigneeMode: 'UNASSIGNED' | 'SPECIFIC_USER' | 'PM' | 'PROJECT_COORDINATOR'; specificAssigneeId: string };
type Workflow = {
  id: string;
  name: string;
  active: boolean;
  steps: Array<{ id: string; name: string; sortOrder: number; assigneeMode: string; specificAssignee?: { id: string; name: string } | null }>;
};

export default function JobWorkflowsAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Workflow[]>([]);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([
    { name: 'Prepress', assigneeMode: 'PROJECT_COORDINATOR', specificAssigneeId: '' },
    { name: 'Production', assigneeMode: 'PM', specificAssigneeId: '' },
    { name: 'Quality Check', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' },
  ]);

  async function load() {
    const [uRes, wfRes] = await Promise.all([fetch('/api/users'), fetch('/api/admin/job-workflows')]);
    if (uRes.ok) setUsers(await uRes.json());
    if (wfRes.ok) setItems(await wfRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function updateStep(i: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((step, idx) => (idx === i ? { ...step, ...patch } : step)));
  }

  function addStep() {
    setSteps((prev) => [...prev, { name: '', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function createWorkflow(e: FormEvent) {
    e.preventDefault();

    await fetch('/api/admin/job-workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        steps: steps.map((step, idx) => ({
          name: step.name,
          sortOrder: idx + 1,
          assigneeMode: step.assigneeMode,
          specificAssigneeId: step.assigneeMode === 'SPECIFIC_USER' ? step.specificAssigneeId || null : null,
        })),
      }),
    });

    setName('');
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Job Workflows</h1>
      <p className="text-sm text-slate-500">Create custom multi-step workflows with automatic assignment rules.</p>
      <Nav />

      <form onSubmit={createWorkflow} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" className="field" required />
        </div>

        <div className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-5">
              <input value={step.name} onChange={(e) => updateStep(i, { name: e.target.value })} placeholder={`Step ${i + 1} name`} className="field" required />
              <select value={step.assigneeMode} onChange={(e) => updateStep(i, { assigneeMode: e.target.value as StepDraft['assigneeMode'] })} className="field">
                <option value="UNASSIGNED">Unassigned</option>
                <option value="PM">Project Manager</option>
                <option value="PROJECT_COORDINATOR">Project Coordinator</option>
                <option value="SPECIFIC_USER">Specific User</option>
              </select>
              {step.assigneeMode === 'SPECIFIC_USER' ? (
                <select value={step.specificAssigneeId} onChange={(e) => updateStep(i, { specificAssigneeId: e.target.value })} className="field">
                  <option value="">Select user</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              ) : (
                <div className="field flex items-center text-sm text-slate-500">Auto by role when run starts</div>
              )}
              <div className="field flex items-center text-sm text-slate-500">Step #{i + 1}</div>
              <button type="button" onClick={() => removeStep(i)} className="inline-flex h-11 items-center justify-center rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Remove</button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={addStep} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50">+ Add Step</button>
          <button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">Create Workflow</button>
        </div>
      </form>

      <section className="space-y-3">
        {items.map((workflow) => (
          <article key={workflow.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-800">{workflow.name}</h2>
            <ol className="mt-2 list-decimal pl-5 text-sm text-slate-600">
              {workflow.steps.map((step) => (
                <li key={step.id}>
                  {step.name} • {step.assigneeMode}
                  {step.specificAssignee?.name ? ` (${step.specificAssignee.name})` : ''}
                </li>
              ))}
            </ol>
          </article>
        ))}
        {items.length === 0 ? <p className="text-slate-500">No workflows yet.</p> : null}
      </section>
    </main>
  );
}
