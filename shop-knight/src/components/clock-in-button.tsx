"use client";

import { useState } from 'react';

type Props = {
  sourceType: 'SALES_ORDER' | 'QUOTE' | 'JOB';
  sourceId: string;
  label?: string;
};

export function ClockInButton({ sourceType, sourceId, label = 'Clock In to this record' }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClockIn() {
    setBusy(true);
    const res = await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock_in', sourceType, sourceId }),
    });
    setBusy(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(payload?.error || 'Clock-in failed');
      return;
    }

    window.alert('Clock-in started.');
  }

  return (
    <button type="button" onClick={handleClockIn} disabled={busy} className="inline-flex h-10 items-center rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-semibold text-sky-700 disabled:opacity-50">
      {busy ? 'Clocking in…' : label}
    </button>
  );
}
