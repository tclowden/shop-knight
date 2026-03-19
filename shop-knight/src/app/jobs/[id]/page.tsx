"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';
import { ClockInButton } from '@/components/clock-in-button';

type Step = { id: string; stepName: string; status: string; assignee?: { id: string; name: string } | null };
type JobDetail = {
  id: string;
  name: string;
  createdAt: string;
  salesOrder?: { id: string; orderNumber: string; title?: string | null } | null;
  salesOrderLine?: { id: string; description: string } | null;
  workflowRun?: { id: string; status: string; workflowTemplate: { id: string; name: string }; steps: Step[] } | null;
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState('');

  async function load(jobId: string) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || 'Failed to load job');
      return;
    }
    setJob(data);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{job?.name || 'Job'}</h1>
          <p className="text-sm text-slate-500">Monitor workflow progress, notes, and tasks for this job.</p>
        </div>
        <div className="flex items-center gap-2">
          {id ? <ClockInButton sourceType="JOB" sourceId={id} /> : null}
          <Link href="/jobs" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to Jobs</Link>
        </div>
      </div>

      <Nav />

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      {job ? (
        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <p><span className="font-semibold text-slate-700">Sales Order:</span> {job.salesOrder?.orderNumber || '—'}</p>
            <p><span className="font-semibold text-slate-700">Line Item:</span> {job.salesOrderLine?.description || '—'}</p>
            <p><span className="font-semibold text-slate-700">Workflow:</span> {job.workflowRun?.workflowTemplate.name || 'No workflow'}</p>
            <p><span className="font-semibold text-slate-700">Workflow Status:</span> {job.workflowRun?.status || '—'}</p>
          </div>

          {job.workflowRun ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Steps</p>
              <ol className="mt-2 list-decimal pl-5 text-sm text-slate-700">
                {job.workflowRun.steps.map((step) => (
                  <li key={step.id}>
                    {step.stepName} — {step.status}{step.assignee?.name ? ` (${step.assignee.name})` : ''}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </section>
      ) : null}

      {id ? <ModuleNotesTasks entityType="JOB" entityId={id} /> : null}
    </main>
  );
}
