"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Rack = { id: string; name: string; code: string | null };
type Space = { id: string; name: string; code: string | null; rackId: string; rack: { id: string; name: string; code: string | null } | null };
type Bin = { id: string; name: string; code: string | null; spaceId: string; space: { id: string; name: string; rack: { id: string; name: string } | null } | null };
type Customer = { id: string; name: string };
type StorageItem = {
  id: string;
  itemNumber: string;
  name: string;
  description: string | null;
  active: boolean;
  photoUrl: string | null;
  ownerCustomer: { id: string; name: string } | null;
  pointOfContact: string | null;
  pointOfContactEmail: string | null;
  pointOfContactPhone: string | null;
  dateEnteredStorage: string | null;
  rack: { id: string; name: string; code?: string | null } | null;
  space: { id: string; name: string; code?: string | null } | null;
  bin: { id: string; name: string; code?: string | null } | null;
};

type GroupBy = 'none' | 'owner' | 'rack' | 'space' | 'bin';

type GroupedItems = {
  key: string;
  label: string;
  items: StorageItem[];
};

const GROUP_BY_OPTIONS: Array<{ value: GroupBy; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'owner', label: 'Owner' },
  { value: 'rack', label: 'Rack' },
  { value: 'space', label: 'Space' },
  { value: 'bin', label: 'Bin' },
];

function sortByName<T extends { name: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export default function StorageItemsAdminPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [items, setItems] = useState<StorageItem[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [ownerCustomerId, setOwnerCustomerId] = useState('');
  const [rackId, setRackId] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [binId, setBinId] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  async function loadAll() {
    const archived = showArchived ? 'only' : 'active';
    const [itemsRes, racksRes, spacesRes, binsRes, customersRes] = await Promise.all([
      fetch(`/api/admin/storage/items?archived=${archived}`),
      fetch('/api/admin/storage/racks?archived=all'),
      fetch('/api/admin/storage/spaces?archived=all'),
      fetch('/api/admin/storage/bins?archived=all'),
      fetch('/api/customers'),
    ]);

    if (itemsRes.ok) setItems(await itemsRes.json());
    if (racksRes.ok) setRacks(sortByName(await racksRes.json()));
    if (spacesRes.ok) setSpaces(sortByName(await spacesRes.json()));
    if (binsRes.ok) setBins(sortByName(await binsRes.json()));
    if (customersRes.ok) setCustomers(sortByName(await customersRes.json()));
  }

  useEffect(() => {
    void loadAll();
  }, [showArchived]);

  const filteredSpaces = useMemo(
    () => spaces.filter((space) => !rackId || space.rackId === rackId),
    [spaces, rackId],
  );

  const filteredBins = useMemo(
    () => bins.filter((bin) => !spaceId || bin.spaceId === spaceId),
    [bins, spaceId],
  );

  useEffect(() => {
    if (spaceId && !filteredSpaces.some((space) => space.id === spaceId)) {
      setSpaceId('');
    }
  }, [filteredSpaces, spaceId]);

  useEffect(() => {
    if (binId && !filteredBins.some((bin) => bin.id === binId)) {
      setBinId('');
    }
  }, [filteredBins, binId]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items
      .filter((item) => {
        if (ownerCustomerId && item.ownerCustomer?.id !== ownerCustomerId) return false;
        if (rackId && item.rack?.id !== rackId) return false;
        if (spaceId && item.space?.id !== spaceId) return false;
        if (binId) {
          if (binId === '__none__') return item.bin == null;
          if (item.bin?.id !== binId) return false;
        }

        if (!term) return true;

        return [item.itemNumber, item.name, item.description || '']
          .some((value) => value.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return a.itemNumber.localeCompare(b.itemNumber);
      });
  }, [binId, items, ownerCustomerId, rackId, search, spaceId]);

  const groupedItems = useMemo<GroupedItems[]>(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Storage Items', items: filteredItems }];
    }

    const groups = new Map<string, GroupedItems>();

    for (const item of filteredItems) {
      const groupValue =
        groupBy === 'owner'
          ? item.ownerCustomer
          : groupBy === 'rack'
            ? item.rack
            : groupBy === 'space'
              ? item.space
              : item.bin;

      const key = groupValue?.id || '__ungrouped__';
      const label =
        groupValue?.name ||
        (groupBy === 'owner'
          ? 'No Owner'
          : groupBy === 'rack'
            ? 'No Rack'
            : groupBy === 'space'
              ? 'No Space'
              : 'No Bin');

      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, { key, label, items: [item] });
      }
    }

    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredItems, groupBy]);

  async function toggleArchive(id: string) {
    const res = await fetch(`/api/admin/storage/items/${id}`, {
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
          <h1 className="text-3xl font-semibold tracking-tight">Storage Items</h1>
          <p className="text-sm text-slate-500">Manage stored items, ownership, and locations.</p>
        </div>
        {!showArchived ? (
          <Link href="/admin/storage/items/new" className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600">
            Create Storage Item
          </Link>
        ) : null}
      </div>

      <Nav />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/admin/storage" className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to Storage
        </Link>
        <button type="button" onClick={() => setShowArchived((prev) => !prev)} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm font-medium text-slate-700 xl:col-span-2">
            <span className="mb-1 block">Search</span>
            <input
              className="field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Item number, name, or description"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">Owner Customer</span>
            <select className="field" value={ownerCustomerId} onChange={(e) => setOwnerCustomerId(e.target.value)}>
              <option value="">All Owners</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">Rack</span>
            <select className="field" value={rackId} onChange={(e) => setRackId(e.target.value)}>
              <option value="">All Racks</option>
              {racks.map((rack) => (
                <option key={rack.id} value={rack.id}>{rack.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">Space</span>
            <select className="field" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              <option value="">All Spaces</option>
              {filteredSpaces.map((space) => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">Bin</span>
            <select className="field" value={binId} onChange={(e) => setBinId(e.target.value)}>
              <option value="">All Bins</option>
              <option value="__none__">No Bin</option>
              {filteredBins.map((bin) => (
                <option key={bin.id} value={bin.id}>{bin.name}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            <span className="mb-1 block">Group By</span>
            <select className="field" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
              {GROUP_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {groupedItems.map((group) => (
        <section key={group.key} className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          {groupBy !== 'none' ? (
            <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              {group.label} ({group.items.length})
            </div>
          ) : null}
          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Photo</th>
                <th className="px-4 py-3 font-semibold">Item #</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Rack</th>
                <th className="px-4 py-3 font-semibold">Space</th>
                <th className="px-4 py-3 font-semibold">Bin</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.name} className="relative h-12 w-12 rounded border border-slate-200 object-cover transition-transform duration-150 hover:z-20 hover:scale-[2.4]" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">{item.itemNumber}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-4 text-slate-600">{item.description || '—'}</td>
                  <td className="px-4 py-4">{item.ownerCustomer?.name || '—'}</td>
                  <td className="px-4 py-4">{item.rack?.name || '—'}</td>
                  <td className="px-4 py-4">{item.space?.name || '—'}</td>
                  <td className="px-4 py-4">{item.bin?.name || 'No Bin'}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/storage/items/${item.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Edit
                      </Link>
                      <button type="button" onClick={() => printQr(item)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Print QR
                      </button>
                      <button type="button" onClick={() => toggleArchive(item.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                        {showArchived ? 'Restore' : 'Archive'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {group.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No storage items found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ))}

      {groupedItems.length === 0 ? (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-8 text-center text-sm text-slate-500">No storage items found.</div>
        </section>
      ) : null}
    </main>
  );
}
