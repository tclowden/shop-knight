"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { CompanySwitcher } from '@/components/company-switcher';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/jobs/workflows', label: 'Job Workflows' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/travel', label: 'Travel' },
  { href: '/time', label: 'Time' },
  { href: '/tasks/calendar', label: 'Task Calendar' },
];

const transactionLinks = [
  { href: '/sales/opportunities', label: 'Opportunities' },
  { href: '/sales/quotes', label: 'Quotes' },
  { href: '/sales/orders', label: 'Sales Orders' },
  { href: '/jobs', label: 'Jobs' },
];

const adminLinks = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/users/org-chart', label: 'Org Chart' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/machines', label: 'Machines' },
  { href: '/admin/job-workflows', label: 'Job Workflows' },
  { href: '/admin/custom-roles', label: 'Roles' },
  { href: '/admin/departments', label: 'Departments' },
  { href: '/admin/product-categories', label: 'Product Categories' },
  { href: '/admin/income-accounts', label: 'Income Accounts' },
  { href: '/admin/titles', label: 'Titles' },
  { href: '/admin/sales-order-statuses', label: 'SO Statuses' },
  { href: '/admin/time', label: 'Time Admin' },
  { href: '/admin/time/payroll-config', label: 'Payroll Export Config' },
  { href: '/tasks/templates', label: 'Task Templates' },
];

const superAdminLinks = [{ href: '/admin/companies', label: 'Companies' }];

export function Nav() {
  const { data: session } = useSession();
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clockedInRecord, setClockedInRecord] = useState<string | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [clockError, setClockError] = useState('');
  const transactionsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || session?.user?.role === 'ADMIN' || session?.user?.roles?.includes('ADMIN');
  const avatarUrl = session?.user?.image || null;
  const initials = (session?.user?.name || 'U').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  async function loadClockState() {
    try {
      const res = await fetch('/api/time?scope=mine');
      if (!res.ok) return;
      const payload = await res.json().catch(() => []);
      if (!Array.isArray(payload)) return;
      const open = payload.find((entry) => !entry?.clockOutAt);
      if (!open) {
        setClockedInRecord(null);
        return;
      }
      const label = open?.salesOrder?.orderNumber || open?.quote?.quoteNumber || open?.job?.name || open?.sourceType || 'Record';
      setClockedInRecord(String(label));
    } catch {
      setClockedInRecord(null);
    }
  }

  async function quickClockOut() {
    setClockError('');
    setClockBusy(true);
    const res = await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock_out' }),
    });
    const payload = await res.json().catch(() => ({}));
    setClockBusy(false);
    if (!res.ok) {
      setClockError(typeof payload?.error === 'string' ? payload.error : 'Unable to clock out');
      return;
    }
    await loadClockState();
  }

  useEffect(() => {
    let cancelled = false;

    async function safeLoad() {
      if (cancelled) return;
      await loadClockState();
    }

    void safeLoad();
    const interval = setInterval(safeLoad, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function scheduleClose(menu: 'transactions' | 'admin') {
    const timerRef = menu === 'transactions' ? transactionsCloseTimer : adminCloseTimer;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (menu === 'transactions') setTransactionsOpen(false);
      else setAdminOpen(false);
    }, 150);
  }

  function cancelClose(menu: 'transactions' | 'admin') {
    const timerRef = menu === 'transactions' ? transactionsCloseTimer : adminCloseTimer;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <nav className="sticky top-0 z-40 mb-6 border-b border-slate-200 bg-[#f5f7fa]/95 pb-3 pt-2 text-sm backdrop-blur">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative" onMouseEnter={() => cancelClose('transactions')} onMouseLeave={() => scheduleClose('transactions')}>
          <button
            type="button"
            onClick={() => setTransactionsOpen((v) => !v)}
            className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
          >
            Transactions ▾
          </button>
          {transactionsOpen ? (
            <div className="absolute left-0 top-full z-20 min-w-52 pt-1">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {transactionLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setTransactionsOpen(false)}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="relative" onMouseEnter={() => cancelClose('admin')} onMouseLeave={() => scheduleClose('admin')}>
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
            >
              Admin ▾
            </button>
            {adminOpen ? (
              <div className="absolute left-0 top-full z-20 min-w-52 pt-1">
                <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {adminLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setAdminOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                  {isSuperAdmin ? (
                    <>
                      <div className="my-1 border-t border-slate-200" />
                      {superAdminLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setAdminOpen(false)}>
                          {link.label}
                        </Link>
                      ))}
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <CompanySwitcher />

        {clockedInRecord ? (
          <Link
            href="/profile"
            className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
            title={`Clocked in to ${clockedInRecord}`}
          >
            Clocked In: {clockedInRecord}
          </Link>
        ) : null}

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-sky-300"
            title="Profile"
          >
            {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : initials}
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-full z-20 min-w-44 pt-1">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <Link href="/profile" className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                  My Profile
                </Link>
                <Link href="/time" className="mt-1 block rounded-lg px-3 py-2 text-sky-700 hover:bg-sky-50" onClick={() => setProfileOpen(false)}>
                  {clockedInRecord ? 'Switch Clock-In Record' : 'Clock In'}
                </Link>
                {clockedInRecord ? (
                  <button
                    type="button"
                    onClick={quickClockOut}
                    disabled={clockBusy}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    {clockBusy ? 'Clocking out…' : 'Clock Out'}
                  </button>
                ) : null}
                {clockError ? <p className="mt-1 px-3 text-xs text-rose-600">{clockError}</p> : null}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-rose-700 hover:bg-rose-50"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
