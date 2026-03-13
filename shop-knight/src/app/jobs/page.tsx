"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/jobs');
      const payload = await res.json().catch(() => null);
      setJobs(Array.isArray(payload) ? payload : []);
    };
    run();
  }, []);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
      <p className="text-sm text-slate-500">Track production jobs and workflow progress.</p>
      <Nav />

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
            {jobs.map((job) => (
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
            {jobs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No jobs yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
