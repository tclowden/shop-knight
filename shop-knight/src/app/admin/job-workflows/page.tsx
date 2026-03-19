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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [error, setError] = useState('');
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

  function openCreateModal() {
    setEditingWorkflowId(null);
    setError('');
    setName('');
    setSteps([
      { name: 'Prepress', assigneeMode: 'PROJECT_COORDINATOR', specificAssigneeId: '' },
      { name: 'Production', assigneeMode: 'PM', specificAssigneeId: '' },
      { name: 'Quality Check', assigneeMode: 'UNASSIGNED', specificAssigneeId: '' },
    ]);
    setShowCreateModal(true);
  }

  function openEditModal(workflow: Workflow) {
    setEditingWorkflowId(workflow.id);
    setError('');
    setName(workflow.name);
    setSteps(workflow.steps.map((step) => ({
      name: step.name,
      assigneeMode: step.assigneeMode as StepDraft['assigneeMode'],
      specificAssigneeId: step.specificAssignee?.id || '',
    })));
    setShowCreateModal(true);
  }

  async function saveWorkflow(e: FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch(editingWorkflowId ? `/api/admin/job-workflows/${editingWorkflowId}` : '/api/admin/job-workflows', {
      method: editingWorkflowId ? 'PATCH' : 'POST',
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = typeof data?.error === 'string' ? data.error : `Failed to ${editingWorkflowId ? 'update' : 'create'} workflow`;
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      setError(detail ? `${message} — ${detail}` : message);
      return;
    }

    setShowCreateModal(false);
    await load();
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Job Workflows</h1>
      <p className="text-sm text-slate-500">Create custom multi-step workflows with automatic assignment rules.</p>
      <Nav />

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Create Workflow
        </button>
      </div>

      {showCreateModal ? (
        <div className="mb-6 rounded-xl border border-slate-300 bg-white p-4 shadow-lg">
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">{editingWorkflowId ? 'Edit Workflow' : 'Create Workflow'}</h2>
            <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Close</button>
          </div>

          <form onSubmit={saveWorkflow}>
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
              <button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">{editingWorkflowId ? 'Update Workflow' : 'Save Workflow'}</button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="space-y-3">
        {items.map((workflow) => (
          <article key={workflow.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-800">{workflow.name}</h2>
              <button type="button" onClick={() => openEditModal(workflow)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
            </div>
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
