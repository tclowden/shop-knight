"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type ProofPayload = {
  token: string;
  expiresAt: string;
  respondedAt: string | null;
  decision: string | null;
  responseNotes: string | null;
  proof: { id: string; fileName: string; mimeType: string; status: string; fileUrl: string };
};

export function ProofApproveClient() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [data, setData] = useState<ProofPayload | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REVISIONS_REQUESTED'>('APPROVED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function load() {
    if (!token) return;
    const res = await fetch(`/api/proofs/public/${token}`);
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error || 'Invalid approval link');
      return;
    }
    setData(payload);
  }

  async function submit() {
    setError('');
    const res = await fetch('/api/proofs/public/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, decision, notes }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload?.error || 'Failed to submit response');
      return;
    }
    setDone(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isImage = !!data?.proof?.mimeType?.startsWith('image/');
  const isPdf = data?.proof?.mimeType === 'application/pdf';

  return (
    <main className="mx-auto mt-10 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
      <h1 className="text-2xl font-semibold">Proof Approval</h1>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {!data ? <p className="mt-3 text-sm text-slate-500">Loading proof…</p> : null}
      {data ? (
        <>
          <p className="mt-2 text-sm text-slate-600">File: <span className="font-medium">{data.proof.fileName}</span></p>
          <p className="text-xs text-slate-500">Current status: {data.proof.status}</p>

          {isImage ? (
            <a href={data.proof.fileUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.proof.fileUrl} alt={data.proof.fileName} className="max-h-[460px] w-full bg-slate-50 object-contain" />
            </a>
          ) : isPdf ? (
            <iframe title={data.proof.fileName} src={data.proof.fileUrl} className="mt-3 h-[460px] w-full rounded-lg border border-slate-200" />
          ) : (
            <a href={data.proof.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open Proof</a>
          )}

          {done ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Response saved. Thank you.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Decision</span>
                <select value={decision} onChange={(e) => setDecision(e.target.value as 'APPROVED' | 'REVISIONS_REQUESTED')} className="field">
                  <option value="APPROVED">Approve</option>
                  <option value="REVISIONS_REQUESTED">Do Not Approve / Request Changes</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Notes {decision === 'REVISIONS_REQUESTED' ? '(required)' : '(optional)'}</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <button onClick={submit} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Submit Response</button>
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
