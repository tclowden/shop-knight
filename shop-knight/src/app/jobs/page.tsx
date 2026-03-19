"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Job = {
  id: string;
  name: string;
  createdAt: string;
  salesOrder?: { id: string; orderNumber: string; title?: string | null } | null;
  salesOrderLine?: { id: string; description: string } | null;
  workflow?: { id: string; status: string; templateName: string; totalSteps: number; completedSteps: number } | null;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<'ALL' | 'NO_WORKFLOW' | 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED'>('ALL');

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/jobs');
      const payload = await res.json().catch(() => null);
      setJobs(Array.isArray(payload) ? payload : []);
    };
    run();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const text = [
        job.name,
        job.salesOrder?.orderNumber || '',
        job.salesOrder?.title || '',
        job.salesOrderLine?.description || '',
        job.workflow?.templateName || '',
      ].join(' ').toLowerCase();

      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      if (!matchesQuery) return false;

      if (workflowStatus === 'ALL') return true;
      if (workflowStatus === 'NO_WORKFLOW') return !job.workflow;
      return job.workflow?.status === workflowStatus;
    });
  }, [jobs, query, workflowStatus]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
      <p className="text-sm text-slate-500">Track production jobs and workflow progress.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job, SO#, line, workflow..." className="field" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Status</span>
            <select value={workflowStatus} onChange={(e) => setWorkflowStatus(e.target.value as typeof workflowStatus)} className="field">
              <option value="ALL">All</option>
              <option value="NO_WORKFLOW">No Workflow</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </label>
          <div className="flex items-end">
            <p className="text-sm text-slate-600">Showing <span className="font-semibold">{filteredJobs.length}</span> of <span className="font-semibold">{jobs.length}</span> jobs</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Sales Order</th>
              <th className="px-4 py-3 font-semibold">Line Item</th>
              <th className="px-4 py-3 font-semibold">Workflow</th>
              <th className="px-4 py-3 font-semibold">Progress</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">
                  <Link href={`/jobs/${job.id}`} className="text-sky-700 hover:underline">{job.name}</Link>
                </td>
                <td className="px-4 py-4 text-slate-600">{job.salesOrder?.orderNumber || '—'}</td>
                <td className="px-4 py-4 text-slate-600">{job.salesOrderLine?.description || '—'}</td>
                <td className="px-4 py-4 text-slate-600">{job.workflow?.templateName || 'No workflow'}</td>
                <td className="px-4 py-4 text-slate-600">{job.workflow ? `${job.workflow.completedSteps}/${job.workflow.totalSteps} (${job.workflow.status})` : '—'}</td>
                <td className="px-4 py-4 text-slate-500">{new Date(job.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {filteredJobs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No jobs match your filters.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
