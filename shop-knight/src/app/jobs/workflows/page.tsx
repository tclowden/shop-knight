"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type WorkflowTemplate = { id: string; name: string };
type User = { id: string; name: string };
type WorkflowRun = {
  id: string;
  workflowTemplate: { id: string; name: string };
  status: string;
  steps: Array<{ id: string; stepName: string; status: string; assignee?: { id: string; name: string } | null }>;
};

export default function JobWorkflowRunnerPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);

  const [workflowTemplateId, setWorkflowTemplateId] = useState('');
  const [entityType, setEntityType] = useState('JOB');
  const [entityId, setEntityId] = useState('');
  const [pmUserId, setPmUserId] = useState('');
  const [projectCoordinatorUserId, setProjectCoordinatorUserId] = useState('');

  async function loadTemplatesAndUsers() {
    const [tRes, uRes] = await Promise.all([fetch('/api/admin/job-workflows'), fetch('/api/users')]);
    if (tRes.ok) {
      const data = await tRes.json();
      setTemplates(data.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
    }
    if (uRes.ok) setUsers(await uRes.json());
  }

  async function loadRuns(type: string, id: string) {
    if (!type || !id) return;
    const res = await fetch(`/api/job-workflows/runs?entityType=${type}&entityId=${id}`);
    if (!res.ok) return;
    setRuns(await res.json());
  }

  useEffect(() => {
    loadTemplatesAndUsers();
  }, []);

  async function applyWorkflow(e: FormEvent) {
    e.preventDefault();
    await fetch('/api/job-workflows/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowTemplateId, entityType, entityId, pmUserId: pmUserId || null, projectCoordinatorUserId: projectCoordinatorUserId || null }),
    });
    await loadRuns(entityType, entityId);
  }

  async function completeStep(stepId: string) {
    await fetch(`/api/job-workflows/steps/${stepId}/complete`, { method: 'POST' });
    await loadRuns(entityType, entityId);
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Job Workflow Runs</h1>
      <p className="text-sm text-slate-500">Apply workflows to jobs/orders and progress step-by-step with auto handoff.</p>
      <Nav />

      <form onSubmit={applyWorkflow} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select value={workflowTemplateId} onChange={(e) => setWorkflowTemplateId(e.target.value)} className="field" required>
            <option value="">Select workflow template…</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="field">
            <option value="JOB">JOB</option>
            <option value="SALES_ORDER">SALES_ORDER</option>
            <option value="PROJECT">PROJECT</option>
            <option value="OPPORTUNITY">OPPORTUNITY</option>
          </select>
          <input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Entity ID" className="field" required />
          <select value={pmUserId} onChange={(e) => setPmUserId(e.target.value)} className="field">
            <option value="">Project Manager (optional)</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <select value={projectCoordinatorUserId} onChange={(e) => setProjectCoordinatorUserId(e.target.value)} className="field">
            <option value="">Project Coordinator (optional)</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Apply Workflow</button>
            <button type="button" onClick={() => loadRuns(entityType, entityId)} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Load Runs</button>
          </div>
        </div>
      </form>

      <section className="space-y-3">
        {runs.map((run) => (
          <article key={run.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-800">{run.workflowTemplate.name} • {run.status}</h2>
            <ol className="mt-2 list-decimal pl-5 text-sm text-slate-600">
              {run.steps.map((step) => (
                <li key={step.id} className="mb-1">
                  {step.stepName} — {step.status}{step.assignee?.name ? ` (${step.assignee.name})` : ''}
                  {step.status === 'IN_PROGRESS' ? (
                    <button type="button" onClick={() => completeStep(step.id)} className="ml-2 rounded border border-sky-300 px-2 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-50">Mark Done</button>
                  ) : null}
                </li>
              ))}
            </ol>
          </article>
        ))}
        {runs.length === 0 ? <p className="text-slate-500">No runs loaded yet.</p> : null}
      </section>
    </main>
  );
}
