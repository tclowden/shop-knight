import { Suspense } from 'react';
import { ProofApproveClient } from './ProofApproveClient';

export const dynamic = 'force-dynamic';

export default function ProofApprovePage() {
  return (
    <Suspense fallback={<main className="mx-auto mt-10 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">Loading…</main>}>
      <ProofApproveClient />
    </Suspense>
  );
}
