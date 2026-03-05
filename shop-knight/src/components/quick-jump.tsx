"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const BASE = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Opportunities', href: '/sales/opportunities' },
  { label: 'Quotes', href: '/sales/quotes' },
  { label: 'Sales Orders', href: '/sales/orders' },
  { label: 'Customers', href: '/customers' },
  { label: 'Vendors', href: '/vendors' },
];

export function QuickJump() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return BASE.filter((i) => !t || i.label.toLowerCase().includes(t) || i.href.toLowerCase().includes(t));
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl rounded border border-zinc-700 bg-zinc-950 p-3" onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to... (Ctrl/Cmd+K)" className="mb-2 w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <div className="max-h-80 overflow-auto">
          {items.map((i) => (
            <button
              key={i.href}
              onClick={() => {
                router.push(i.href);
                setOpen(false);
              }}
              className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-zinc-800"
            >
              <span className="font-medium">{i.label}</span>
              <span className="ml-2 text-zinc-400">{i.href}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
