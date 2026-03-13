"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type ExpenseLine = {
  id: string;
  expenseDate: string;
  merchant: string;
  category: string;
  description: string | null;
  paymentMethod: string | null;
  amount: string | number;
  taxAmount: string | number | null;
  currency: string;
  receiptRef: string | null;
};

type ExpenseReport = {
  id: string;
  reportNumber: string;
  title: string;
  employeeName: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  periodStart: string | null;
  periodEnd: string | null;
  notes: string | null;
  amexLinked: boolean;
  lines: ExpenseLine[];
  totalAmount: number;
};

export default function ExpenseReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [error, setError] = useState('');

  const [expenseDate, setExpenseDate] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Meals');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Company Card');
  const [amount, setAmount] = useState('0.00');
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [currency, setCurrency] = useState('USD');
  const [receiptRef, setReceiptRef] = useState('');
  const [savingLine, setSavingLine] = useState(false);

  async function load(reportId: string) {
    const res = await fetch(`/api/expenses/${reportId}`);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error || 'Failed to load report');
      return;
    }
    setReport(await res.json());
  }

  async function addLine(e: FormEvent) {
    e.preventDefault();
    if (!id || savingLine) return;
    setSavingLine(true);
    setError('');

    try {
      const res = await fetch(`/api/expenses/${id}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseDate, merchant, category, description, paymentMethod, amount, taxAmount, currency, receiptRef }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to add expense line');
        return;
      }

      setExpenseDate('');
      setMerchant('');
      setCategory('Meals');
      setDescription('');
      setPaymentMethod('Company Card');
      setAmount('0.00');
      setTaxAmount('0.00');
      setCurrency('USD');
      setReceiptRef('');
      await load(id);
    } finally {
      setSavingLine(false);
    }
  }

  async function removeLine(lineId: string) {
    const ok = window.confirm('Remove this expense line?');
    if (!ok) return;

    const res = await fetch(`/api/expenses/lines/${lineId}`, { method: 'DELETE' });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(payload?.error || 'Failed to remove line');
      return;
    }

    await load(id);
  }

  async function setStatus(action: 'submit' | 'approve' | 'reject' | 'reimburse') {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(payload?.error || 'Failed to update status');
      return;
    }

    await load(id);
  }

  const total = useMemo(() => Number(report?.totalAmount || 0), [report?.totalAmount]);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Expense Report</h1>
      <p className="text-sm text-slate-500">
        {report ? `${report.reportNumber} — ${report.title} (${report.status})` : 'Loading...'}
      </p>
      <Nav />

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Employee: {report?.employeeName || '—'}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Total: ${total.toFixed(2)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Amex Linked: {report?.amexLinked ? 'Yes' : 'Not yet'}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setStatus('submit')} className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100">Submit</button>
          <button onClick={() => setStatus('approve')} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
          <button onClick={() => setStatus('reject')} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">Reject</button>
          <button onClick={() => setStatus('reimburse')} className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100">Mark Reimbursed</button>
        </div>
      </section>

      <form onSubmit={addLine} className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Add Expense Line</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
          <input value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} type="date" className="field" required />
          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant" className="field" required />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="field" required />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="Amount" className="field" required />
          <input value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="Tax" className="field" />
          <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Payment method" className="field" />
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Currency" className="field" />
          <input value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} placeholder="Receipt ref / URL" className="field" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="field md:col-span-2" />
        </div>
        <button disabled={savingLine} className="mt-3 inline-flex h-10 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{savingLine ? 'Adding…' : 'Add Line'}</button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#eaf6fd] text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Merchant</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Receipt</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(report?.lines || []).map((line) => (
              <tr key={line.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-4">{new Date(line.expenseDate).toLocaleDateString()}</td>
                <td className="px-4 py-4">{line.merchant}</td>
                <td className="px-4 py-4">{line.category}</td>
                <td className="px-4 py-4">{line.description || '—'}</td>
                <td className="px-4 py-4">{line.paymentMethod || '—'}</td>
                <td className="px-4 py-4">${Number(line.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-4">{line.receiptRef || '—'}</td>
                <td className="px-4 py-4 text-right">
                  <button type="button" onClick={() => removeLine(line.id)} className="rounded border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">Remove</button>
                </td>
              </tr>
            ))}
            {(report?.lines?.length || 0) === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No expense lines yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
