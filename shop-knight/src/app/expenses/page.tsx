"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type ExpenseReport = {
  id: string;
  reportNumber: string;
  title: string;
  employeeName: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  totalAmount?: number;
  createdAt: string;
};

export default function ExpensesPage() {
  const [items, setItems] = useState<ExpenseReport[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/expenses?status=${statusFilter}`);
      if (!res.ok) return;
      setItems(await res.json());
    };
    run();
  }, [statusFilter]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Expense Reports</h1>
          <p className="text-sm text-slate-500">Track draft, submitted, approved, and reimbursed expense reports.</p>
        </div>
        <Link href="/expenses/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Create Expense Report</Link>
      </div>

      <Nav />

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">Status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-10 w-56">
          <option value="ALL">All</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="REIMBURSED">Reimbursed</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Report #</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4"><Link href={`/expenses/${item.id}`} className="text-sky-700 hover:underline">{item.reportNumber}</Link></td>
                <td className="px-4 py-4">{item.title}</td>
                <td className="px-4 py-4">{item.employeeName}</td>
                <td className="px-4 py-4">{item.status}</td>
                <td className="px-4 py-4">${Number(item.totalAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-4 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No expense reports found.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
