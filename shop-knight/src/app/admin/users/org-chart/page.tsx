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
  division: string;
};

type OrgResponse = {
  company: { id: string; name: string };
  nodes: OrgNode[];
};

const divisionColors = ['#60a5fa', '#fb923c', '#2dd4bf', '#a78bfa', '#f472b6', '#34d399'];

function divisionColorMap(divisions: string[]) {
  return divisions.reduce<Record<string, string>>((acc, division, index) => {
    acc[division] = divisionColors[index % divisionColors.length];
    return acc;
  }, {});
}

function PersonCard({ node, color }: { node: OrgNode; color: string }) {
  return (
    <div className="relative min-w-[220px] rounded-lg border bg-white px-3 py-2 shadow-sm" style={{ borderColor: color }}>
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
          {node.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-800">{node.name}</p>
          <p className="text-xs leading-tight text-slate-500">{node.title}</p>
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color }}>{node.division}</p>
    </div>
  );
}

function OrgBranch({ node, childrenMap, colors }: { node: OrgNode; childrenMap: Map<string, OrgNode[]>; colors: Record<string, string> }) {
  const children = childrenMap.get(node.id) || [];

  return (
    <li className="org-node">
      <PersonCard node={node} color={colors[node.division] || '#94a3b8'} />
      {children.length > 0 ? (
        <ul className="org-children">
          {children.map((child) => (
            <OrgBranch key={child.id} node={child} childrenMap={childrenMap} colors={colors} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

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

  const { roots, childrenMap, colors, divisions } = useMemo(() => {
    const nodes = data?.nodes || [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const childMap = new Map<string, OrgNode[]>();

    for (const node of nodes) {
      if (!node.reportsToId || !byId.has(node.reportsToId)) continue;
      const list = childMap.get(node.reportsToId) || [];
      list.push(node);
      childMap.set(node.reportsToId, list);
    }

    const top = nodes.filter((n) => !n.reportsToId || !byId.has(n.reportsToId));
    const allDivisions = Array.from(new Set(nodes.map((n) => n.division))).sort((a, b) => a.localeCompare(b));

    return {
      roots: top,
      childrenMap: childMap,
      colors: divisionColorMap(allDivisions),
      divisions: allDivisions,
    };
  }, [data]);

  return (
    <main className="mx-auto max-w-[1600px] bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Company Org Chart</h1>
      <p className="text-sm text-slate-500">Hierarchy view built from Is Employee, Reports To, and Title.</p>
      <Nav />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-600">{data?.company?.name ? `Company: ${data.company.name}` : 'Loading company...'}</p>
        <Link href="/admin/users" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Back to Users</Link>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading org chart…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <section className="relative overflow-auto rounded-xl border border-slate-200 bg-[#f3f4f6] p-6 shadow-sm">
          <aside className="absolute right-6 top-6 w-56 rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Legend</h3>
            <ul className="space-y-2 text-xs">
              {divisions.map((division) => (
                <li key={division} className="flex items-center gap-2 text-slate-700">
                  <span className="inline-block h-4 w-8 rounded border-2" style={{ borderColor: colors[division] }} />
                  <span>{division}</span>
                </li>
              ))}
            </ul>
          </aside>

          {roots.length > 0 ? (
            <div className="org-wrap min-w-max pr-64">
              <ul className="org-root">
                {roots.map((root) => (
                  <OrgBranch key={root.id} node={root} childrenMap={childrenMap} colors={colors} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No employee hierarchy found for this company.</p>
          )}

          <style jsx>{`
            .org-wrap ul { position: relative; padding-top: 20px; display: flex; justify-content: center; }
            .org-wrap li { list-style-type: none; position: relative; padding: 20px 10px 0 10px; text-align: center; }
            .org-wrap li::before,
            .org-wrap li::after {
              content: '';
              position: absolute;
              top: 0;
              right: 50%;
              border-top: 1px solid #cbd5e1;
              width: 50%;
              height: 20px;
            }
            .org-wrap li::after {
              right: auto;
              left: 50%;
              border-left: 1px solid #cbd5e1;
            }
            .org-wrap li:only-child::after,
            .org-wrap li:only-child::before { display: none; }
            .org-wrap li:only-child { padding-top: 0; }
            .org-wrap li:first-child::before,
            .org-wrap li:last-child::after { border: 0 none; }
            .org-wrap li:last-child::before {
              border-right: 1px solid #cbd5e1;
              border-radius: 0 8px 0 0;
            }
            .org-wrap li:first-child::after {
              border-radius: 8px 0 0 0;
            }
            .org-wrap ul ul::before {
              content: '';
              position: absolute;
              top: 0;
              left: 50%;
              border-left: 1px solid #cbd5e1;
              width: 0;
              height: 20px;
            }
          `}</style>
        </section>
      ) : null}
    </main>
  );
}
