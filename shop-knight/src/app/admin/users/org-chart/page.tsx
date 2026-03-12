"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Nav } from '@/components/nav';

type OrgNode = {
  id: string;
  name: string;
  title: string;
  email: string;
  reportsToId: string | null;
};

type OrgResponse = {
  company: { id: string; name: string };
  nodes: OrgNode[];
};

export default function OrgChartPage() {
  const [data, setData] = useState<OrgResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/users/org-chart');
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error || 'Failed to load org chart');
        setLoading(false);
        return;
      }
      setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  const levels = useMemo(() => {
    const nodes = data?.nodes || [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const children = new Map<string, OrgNode[]>();

    for (const node of nodes) {
      if (!node.reportsToId || !byId.has(node.reportsToId)) continue;
      const arr = children.get(node.reportsToId) || [];
      arr.push(node);
      children.set(node.reportsToId, arr);
    }

    const roots = nodes.filter((n) => !n.reportsToId || !byId.has(n.reportsToId));
    const visited = new Set<string>();
    const cols: OrgNode[][] = [];
    let current = roots;

    while (current.length) {
      cols.push(current);
      current.forEach((n) => visited.add(n.id));
      const next: OrgNode[] = [];
      for (const n of current) {
        for (const child of children.get(n.id) || []) {
          if (!visited.has(child.id)) next.push(child);
        }
      }
      current = next;
    }

    return cols;
  }, [data]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Company Org Chart</h1>
      <p className="text-sm text-slate-500">Built from user settings: Is Employee, Reports To, and Title.</p>
      <Nav />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">{data?.company?.name ? `Company: ${data.company.name}` : 'Loading company...'}</p>
        <Link href="/admin/users" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Back to Users</Link>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading org chart…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex min-w-max items-start gap-4">
            {levels.map((level, idx) => (
              <div key={idx} className="w-72 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Level {idx + 1}</h2>
                <div className="space-y-2">
                  {level.map((user) => (
                    <article key={user.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
            {levels.length === 0 ? <p className="text-sm text-slate-500">No employee hierarchy found for this company.</p> : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
