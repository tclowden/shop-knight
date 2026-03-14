"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Pref = { event: string; emailEnabled: boolean; inAppEnabled: boolean };

const labels: Record<string, string> = {
  NOTE_MENTION: 'Note mentions',
  TASK_ASSIGNED: 'Task assigned',
  OPPORTUNITY_ROLE_ASSIGNED: 'Opportunity role assignments',
  QUOTE_ROLE_ASSIGNED: 'Quote role assignments',
  SALES_ORDER_ROLE_ASSIGNED: 'Sales order role assignments',
};

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/api/notifications/preferences');
      if (!res.ok) return;
      setPrefs(await res.json());
    };
    run();
  }, []);

  async function save() {
    setSaving(true);
    await fetch('/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: prefs }),
    });
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-4xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
      <p className="text-sm text-slate-500">Manage which notifications you want to receive.</p>
      <Nav />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {prefs.map((p, idx) => (
            <div key={p.event} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">{labels[p.event] || p.event}</p>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={p.emailEnabled}
                    onChange={(e) => setPrefs((prev) => prev.map((item, i) => i === idx ? { ...item, emailEnabled: e.target.checked } : item))}
                  />
                  Email
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={p.inAppEnabled}
                    onChange={(e) => setPrefs((prev) => prev.map((item, i) => i === idx ? { ...item, inAppEnabled: e.target.checked } : item))}
                  />
                  In-app
                </label>
              </div>
            </div>
          ))}
          {prefs.length === 0 ? <p className="text-sm text-slate-500">No preferences loaded.</p> : null}
        </div>

        <button onClick={save} disabled={saving} className="mt-4 inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Notification Preferences'}
        </button>
      </section>
    </main>
  );
}
