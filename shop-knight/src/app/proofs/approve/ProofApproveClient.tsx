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

type BatchItem = ProofPayload & { draftDecision: 'APPROVED' | 'REVISIONS_REQUESTED' | 'SKIP'; draftNotes: string };

export function ProofApproveClient() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const tokens = params.get('tokens') || '';
  const [data, setData] = useState<ProofPayload | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [decision, setDecision] = useState<'APPROVED' | 'REVISIONS_REQUESTED'>('APPROVED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function load() {
    setError('');
    if (tokens) {
      const res = await fetch(`/api/proofs/public/batch?tokens=${encodeURIComponent(tokens)}`);
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || 'Invalid approval link');
        return;
      }
      const mapped = (Array.isArray(payload?.items) ? payload.items : []).map((item: ProofPayload) => ({
        ...item,
        draftDecision: 'SKIP' as const,
        draftNotes: '',
      }));
      setItems(mapped);
      return;
    }

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

    if (tokens) {
      const res = await fetch('/api/proofs/public/respond-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: items.map((item) => ({ token: item.token, decision: item.draftDecision, notes: item.draftNotes })),
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || 'Failed to submit responses');
        return;
      }
      setDone(true);
      return;
    }

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
  }, [token, tokens]);

  const isImage = !!data?.proof?.mimeType?.startsWith('image/');
  const isPdf = data?.proof?.mimeType === 'application/pdf';

  return (
    <main className="mx-auto mt-10 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
      <h1 className="text-2xl font-semibold">Proof Approval</h1>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {!tokens && !data ? <p className="mt-3 text-sm text-slate-500">Loading proof…</p> : null}
      {tokens && items.length === 0 ? <p className="mt-3 text-sm text-slate-500">Loading proof set…</p> : null}
      {tokens && items.length > 0 ? (
        <>
          <p className="mt-2 text-sm text-slate-600">Review each proof and choose Approve, Reject, or Skip.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setItems((prev) => prev.map((p) => ({ ...p, draftDecision: 'APPROVED' })))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Approve all</button>
            <button type="button" onClick={() => setItems((prev) => prev.map((p) => ({ ...p, draftDecision: 'SKIP' })))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Clear decisions</button>
          </div>
          <div className="mt-3 space-y-4">
            {items.map((item) => {
              const itemIsImage = !!item.proof.mimeType?.startsWith('image/');
              const itemIsPdf = item.proof.mimeType === 'application/pdf';
              return (
                <div key={item.token} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium">{item.proof.fileName}</p>
                  <p className="text-xs text-slate-500">Current status: {item.proof.status}</p>
                  <div className="mt-2">
                    {itemIsImage ? (
                      <a href={item.proof.fileUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.proof.fileUrl} alt={item.proof.fileName} className="max-h-[280px] w-full bg-slate-50 object-contain" />
                      </a>
                    ) : itemIsPdf ? (
                      <iframe title={item.proof.fileName} src={item.proof.fileUrl} className="h-[280px] w-full rounded-lg border border-slate-200" />
                    ) : (
                      <a href={item.proof.fileUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open Proof</a>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Decision</span>
                      <select
                        value={item.draftDecision}
                        onChange={(e) => {
                          const next = e.target.value as 'APPROVED' | 'REVISIONS_REQUESTED' | 'SKIP';
                          setItems((prev) => prev.map((p) => (p.token === item.token ? { ...p, draftDecision: next } : p)));
                        }}
                        className="field"
                      >
                        <option value="SKIP">Skip for now</option>
                        <option value="APPROVED">Approve</option>
                        <option value="REVISIONS_REQUESTED">Reject / Request Changes</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-slate-600">Notes {item.draftDecision === 'REVISIONS_REQUESTED' ? '(required)' : '(optional)'}</span>
                      <textarea
                        value={item.draftNotes}
                        onChange={(e) => setItems((prev) => prev.map((p) => (p.token === item.token ? { ...p, draftNotes: e.target.value } : p)))}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {done ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Responses saved. Thank you.</p>
          ) : (
            <div className="mt-4">
              <button onClick={submit} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Submit Responses</button>
            </div>
          )}
        </>
      ) : null}
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
