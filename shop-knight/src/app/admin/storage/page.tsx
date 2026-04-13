"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Rack = { id: string; name: string; code: string | null; active: boolean; _count?: { spaces: number } };
type Space = { id: string; name: string; code: string | null; active: boolean; rack: { id: string; name: string } | null; _count?: { bins: number } };
type Bin = { id: string; name: string; code: string | null; active: boolean; space: { id: string; name: string; rack: { id: string; name: string } | null } | null };
type StorageItem = { id: string; itemNumber: string; name: string; description: string | null; active: boolean; photoUrl: string | null; ownerCustomer: { id: string; name: string } | null; pointOfContact: string | null; pointOfContactEmail: string | null; pointOfContactPhone: string | null; dateEnteredStorage: string | null; rack: { id: string; name: string; code?: string | null } | null; space: { id: string; name: string; code?: string | null } | null; bin: { id: string; name: string; code?: string | null } | null };

export default function StorageAdminPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [items, setItems] = useState<StorageItem[]>([]);

  async function loadAll() {
    const archived = showArchived ? 'only' : 'active';
    const [r, s, b, i] = await Promise.all([
      fetch(`/api/admin/storage/racks?archived=${archived}`),
      fetch(`/api/admin/storage/spaces?archived=${archived}`),
      fetch(`/api/admin/storage/bins?archived=${archived}`),
      fetch(`/api/admin/storage/items?archived=${archived}`),
    ]);
    if (r.ok) setRacks(await r.json());
    if (s.ok) setSpaces(await s.json());
    if (b.ok) setBins(await b.json());
    if (i.ok) setItems(await i.json());
  }

  useEffect(() => {
    void loadAll();
  }, [showArchived]);

  async function toggle(endpoint: string, id: string) {
    const res = await fetch(`${endpoint}/${id}`, {
      method: showArchived ? 'POST' : 'DELETE',
      headers: showArchived ? { 'Content-Type': 'application/json' } : undefined,
      body: showArchived ? JSON.stringify({ action: 'restore' }) : undefined,
    });
    if (res.ok) void loadAll();
  }

  function buildLocationDescription(item: StorageItem) {
    const rackCode = item.rack?.code || item.rack?.name || 'Rack';
    const spaceCode = item.space?.code || item.space?.name || 'Space';
    const binCode = item.bin?.code || item.bin?.name;
    const location = binCode ? `${rackCode} / ${spaceCode} / ${binCode}` : `${rackCode} / ${spaceCode}`;
    return `${location} - ${item.description?.trim() || item.name}`;
  }

  function printQr(item: StorageItem) {
    if (typeof window === 'undefined') return;
    const itemUrl = `${window.location.origin}/admin/storage/items/${item.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(itemUrl)}`;
    const subtitle = buildLocationDescription(item)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const w = window.open('', '_blank', 'noopener,noreferrer,width=520,height=700');
    if (!w) return;

    w.document.write(`<!doctype html><html><head><title>${item.itemNumber} QR</title><style>
      body{font-family:Arial,sans-serif;padding:24px;text-align:center;color:#1e293b}
      .title{font-size:20px;font-weight:700;margin-bottom:14px}
      .qr{width:320px;height:320px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px}
      .sub{margin-top:12px;font-size:14px;line-height:1.35}
      .url{margin-top:8px;color:#64748b;font-size:12px;word-break:break-all}
      @media print{body{padding:10px}.title{font-size:18px}}
    </style></head><body>
      <div class="title">${item.itemNumber} — ${item.name}</div>
      <img class="qr" src="${qrUrl}" alt="QR code" />
      <div class="sub">${subtitle}</div>
      <div class="url">${itemUrl}</div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    w.document.close();
  }

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Storage Admin</h1>
          <p className="text-sm text-slate-500">Manage racks, spaces, and bins.</p>
        </div>
      </div>

      <Nav />

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {!showArchived ? (
            <>
              <Link href="/admin/storage/racks/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">Create Rack</Link>
              <Link href="/admin/storage/spaces/new" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Create Space</Link>
              <Link href="/admin/storage/bins/new" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Create Bin</Link>
              <Link href="/admin/storage/items/new" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Create Storage Item</Link>
            </>
          ) : null}
        </div>
        <button type="button" onClick={() => setShowArchived((p) => !p)} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>

      <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Racks</div>
        <table className="w-full text-left text-sm"><thead className="bg-[#eaf6fd]"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Spaces</th><th className="px-4 py-2 text-right">Actions</th></tr></thead><tbody>
          {racks.map((x) => <tr key={x.id} className="border-t border-slate-100"><td className="px-4 py-2">{x.name}</td><td className="px-4 py-2">{x.code || '—'}</td><td className="px-4 py-2">{x._count?.spaces || 0}</td><td className="px-4 py-2"><div className="flex justify-end gap-2">{!showArchived ? <Link href={`/admin/storage/racks/${x.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">Edit</Link> : null}<button onClick={() => toggle('/api/admin/storage/racks', x.id)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">{showArchived ? 'Restore' : 'Archive'}</button></div></td></tr>)}
          {racks.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No racks found.</td></tr> : null}
        </tbody></table>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Spaces</div>
        <table className="w-full text-left text-sm"><thead className="bg-[#eaf6fd]"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Rack</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Bins</th><th className="px-4 py-2 text-right">Actions</th></tr></thead><tbody>
          {spaces.map((x) => <tr key={x.id} className="border-t border-slate-100"><td className="px-4 py-2">{x.name}</td><td className="px-4 py-2">{x.rack?.name || '—'}</td><td className="px-4 py-2">{x.code || '—'}</td><td className="px-4 py-2">{x._count?.bins || 0}</td><td className="px-4 py-2"><div className="flex justify-end gap-2">{!showArchived ? <Link href={`/admin/storage/spaces/${x.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">Edit</Link> : null}<button onClick={() => toggle('/api/admin/storage/spaces', x.id)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">{showArchived ? 'Restore' : 'Archive'}</button></div></td></tr>)}
          {spaces.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No spaces found.</td></tr> : null}
        </tbody></table>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Bins</div>
        <table className="w-full text-left text-sm"><thead className="bg-[#eaf6fd]"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Space</th><th className="px-4 py-2">Rack</th><th className="px-4 py-2">Code</th><th className="px-4 py-2 text-right">Actions</th></tr></thead><tbody>
          {bins.map((x) => <tr key={x.id} className="border-t border-slate-100"><td className="px-4 py-2">{x.name}</td><td className="px-4 py-2">{x.space?.name || '—'}</td><td className="px-4 py-2">{x.space?.rack?.name || '—'}</td><td className="px-4 py-2">{x.code || '—'}</td><td className="px-4 py-2"><div className="flex justify-end gap-2">{!showArchived ? <Link href={`/admin/storage/bins/${x.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">Edit</Link> : null}<button onClick={() => toggle('/api/admin/storage/bins', x.id)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">{showArchived ? 'Restore' : 'Archive'}</button></div></td></tr>)}
          {bins.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No bins found.</td></tr> : null}
        </tbody></table>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold">Storage Items</div>
        <table className="w-full text-left text-sm"><thead className="bg-[#eaf6fd]"><tr><th className="px-4 py-2">Photo</th><th className="px-4 py-2">Item</th><th className="px-4 py-2">Location</th><th className="px-4 py-2 text-right">Actions</th></tr></thead><tbody>
          {items.map((x) => <tr key={x.id} className="border-t border-slate-100"><td className="px-4 py-2">{x.photoUrl ? <img src={x.photoUrl} alt={x.name} className="h-12 w-12 rounded border border-slate-200 object-cover" /> : <span className="text-slate-400">—</span>}</td><td className="px-4 py-2"><div className="font-medium text-slate-800">{x.itemNumber} — {x.name}</div><div className="text-xs text-slate-500">{x.description || 'No description'}</div><div className="text-xs text-slate-500">Owner: {x.ownerCustomer?.name || '—'}</div></td><td className="px-4 py-2">{x.rack?.name || '—'} / {x.space?.name || '—'} / {x.bin?.name || 'No Bin'}</td><td className="px-4 py-2"><div className="flex justify-end gap-2">{!showArchived ? <><Link href={`/admin/storage/items/${x.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">Edit</Link><button type="button" onClick={() => printQr(x)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">Print QR</button></> : null}<button onClick={() => toggle('/api/admin/storage/items', x.id)} className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">{showArchived ? 'Restore' : 'Archive'}</button></div></td></tr>)}
          {items.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No storage items found.</td></tr> : null}
        </tbody></table>
      </section>
    </main>
  );
}
