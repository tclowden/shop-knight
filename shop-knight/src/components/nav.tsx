"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  { href: '/admin/pricing', label: 'Pricing' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/users/org-chart', label: 'Org Chart' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/machines', label: 'Machines' },
  { href: '/admin/substrates', label: 'Substrates' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/storage', label: 'Storage' },
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

type EmulationCandidate = {
  id: string;
  name: string;
  email: string;
  type: string;
  active: boolean;
  activeCompanyId?: string | null;
};

function DropdownSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function Nav() {
  const { data: session, update } = useSession();
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clockedInRecord, setClockedInRecord] = useState<string | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [clockError, setClockError] = useState('');
  const [emulationUsers, setEmulationUsers] = useState<EmulationCandidate[]>([]);
  const [emulationLoading, setEmulationLoading] = useState(false);
  const [emulationBusy, setEmulationBusy] = useState(false);
  const [emulationError, setEmulationError] = useState('');
  const [selectedEmulationUserId, setSelectedEmulationUserId] = useState('');
  const [emulationQuery, setEmulationQuery] = useState('');
  const workspaceCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transactionsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || session?.user?.role === 'ADMIN' || session?.user?.roles?.includes('ADMIN');
  const avatarUrl = session?.user?.image || null;
  const initials = (session?.user?.name || 'U').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const isEmulating = Boolean(session?.user?.isEmulating);
  const actorId = String(session?.user?.actorId || session?.user?.id || '');

  const sortedTopLinks = useMemo(() => [...links].sort((a, b) => a.label.localeCompare(b.label)), []);
  const sortedTransactionLinks = useMemo(() => [...transactionLinks].sort((a, b) => a.label.localeCompare(b.label)), []);
  const sortedAdminLinks = useMemo(() => [...adminLinks].sort((a, b) => a.label.localeCompare(b.label)), []);
  const sortedSuperAdminLinks = useMemo(() => [...superAdminLinks].sort((a, b) => a.label.localeCompare(b.label)), []);

  const primaryTopLinks = useMemo(() => sortedTopLinks.filter((link) => ['Dashboard', 'Customers', 'Tasks', 'Time', 'Vendors'].includes(link.label)), [sortedTopLinks]);
  const workspaceLinks = useMemo(() => sortedTopLinks.filter((link) => !['Dashboard', 'Customers', 'Tasks', 'Time', 'Vendors'].includes(link.label)), [sortedTopLinks]);

  const availableEmulationUsers = useMemo(() => {
    if (!isAdmin) return [];
    const scoped = emulationUsers.filter((u) => {
      if (!u.active) return false;
      if (actorId && u.id === actorId) return false;
      if (!isSuperAdmin) {
        if (u.type === 'SUPER_ADMIN') return false;
        if (!session?.user?.companyId || !u.activeCompanyId || session.user.companyId !== u.activeCompanyId) return false;
      }
      return true;
    });
    return scoped.sort((a, b) => a.name.localeCompare(b.name));
  }, [emulationUsers, isAdmin, isSuperAdmin, actorId, session?.user?.companyId]);

  const filteredEmulationUsers = useMemo(() => {
    const q = emulationQuery.trim().toLowerCase();
    if (!q) return availableEmulationUsers;
    return availableEmulationUsers.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [availableEmulationUsers, emulationQuery]);

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

  async function loadEmulationUsers() {
    if (!isAdmin) return;
    setEmulationError('');
    setEmulationLoading(true);
    const res = await fetch('/api/admin/users');
    const payload = await res.json().catch(() => []);
    setEmulationLoading(false);
    if (!res.ok || !Array.isArray(payload)) {
      setEmulationError('Unable to load users for emulation.');
      return;
    }
    const candidates = payload.map((u: EmulationCandidate) => ({
      id: String(u.id),
      name: String(u.name || 'User'),
      email: String(u.email || ''),
      type: String(u.type || ''),
      active: Boolean(u.active),
      activeCompanyId: u.activeCompanyId ? String(u.activeCompanyId) : null,
    }));
    setEmulationUsers(candidates);
  }

  async function startEmulation() {
    if (!selectedEmulationUserId) {
      setEmulationError('Choose a user to emulate first.');
      return;
    }
    setEmulationError('');
    setEmulationBusy(true);
    const res = await fetch('/api/admin/emulation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: selectedEmulationUserId }),
    });
    const payload = await res.json().catch(() => ({}));
    setEmulationBusy(false);
    if (!res.ok) {
      setEmulationError(typeof payload?.error === 'string' ? payload.error : 'Unable to start emulation.');
      return;
    }
    await update();
    window.location.assign('/dashboard');
  }

  async function stopEmulation() {
    const res = await fetch('/api/admin/emulation/stop', { method: 'POST' });
    if (!res.ok) return;
    await update();
    window.location.assign('/dashboard');
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

  useEffect(() => {
    if (!profileOpen || !isAdmin) return;
    setEmulationQuery('');
    void loadEmulationUsers();
  }, [profileOpen, isAdmin]);

  useEffect(() => {
    if (!profileOpen) return;
    if (filteredEmulationUsers.length === 0) {
      setSelectedEmulationUserId('');
      return;
    }
    if (!selectedEmulationUserId || !filteredEmulationUsers.some((u) => u.id === selectedEmulationUserId)) {
      setSelectedEmulationUserId(filteredEmulationUsers[0].id);
    }
  }, [profileOpen, selectedEmulationUserId, filteredEmulationUsers]);

  function scheduleClose(menu: 'workspace' | 'transactions' | 'admin' | 'profile') {
    const timerRef = menu === 'workspace'
      ? workspaceCloseTimer
      : menu === 'transactions'
        ? transactionsCloseTimer
        : menu === 'admin'
          ? adminCloseTimer
          : profileCloseTimer;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (menu === 'workspace') setWorkspaceOpen(false);
      else if (menu === 'transactions') setTransactionsOpen(false);
      else if (menu === 'admin') setAdminOpen(false);
      else setProfileOpen(false);
    }, 75);
  }

  function cancelClose(menu: 'workspace' | 'transactions' | 'admin' | 'profile') {
    const timerRef = menu === 'workspace'
      ? workspaceCloseTimer
      : menu === 'transactions'
        ? transactionsCloseTimer
        : menu === 'admin'
          ? adminCloseTimer
          : profileCloseTimer;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <nav className="sticky top-0 z-40 space-y-2 border-b border-slate-200 bg-[#f5f7fa]/95 pb-3 pt-2 text-sm backdrop-blur">
      {isEmulating ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900">
          <p className="text-sm font-semibold">
            Emulation Active: You are currently acting as <span className="underline decoration-amber-400">{session?.user?.name || 'selected user'}</span>
          </p>
          <button
            type="button"
            onClick={stopEmulation}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            Stop Emulation
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {primaryTopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="relative" onMouseEnter={() => cancelClose('workspace')} onMouseLeave={() => scheduleClose('workspace')}>
          <button
            type="button"
            onClick={() => setWorkspaceOpen((v) => !v)}
            className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
          >
            Workspace ▾
          </button>
          {workspaceOpen ? (
            <div className="absolute left-0 top-full z-20 min-w-56 pt-1">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <DropdownSection title="Shortcuts">
                  {workspaceLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setWorkspaceOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                </DropdownSection>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative" onMouseEnter={() => cancelClose('transactions')} onMouseLeave={() => scheduleClose('transactions')}>
          <button
            type="button"
            onClick={() => setTransactionsOpen((v) => !v)}
            className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
          >
            Transactions ▾
          </button>
          {transactionsOpen ? (
            <div className="absolute left-0 top-full z-20 min-w-56 pt-1">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <DropdownSection title="Sales & Jobs">
                  {sortedTransactionLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setTransactionsOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                </DropdownSection>
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
              <div className="absolute left-0 top-full z-20 min-w-64 pt-1">
                <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <DropdownSection title="Configuration">
                    {sortedAdminLinks.map((link) => (
                      <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setAdminOpen(false)}>
                        {link.label}
                      </Link>
                    ))}
                  </DropdownSection>
                  {isSuperAdmin ? (
                    <>
                      <div className="my-2 border-t border-slate-200" />
                      <DropdownSection title="Global">
                        {sortedSuperAdminLinks.map((link) => (
                          <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setAdminOpen(false)}>
                            {link.label}
                          </Link>
                        ))}
                      </DropdownSection>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
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

          <div className="relative" onMouseEnter={() => cancelClose('profile')} onMouseLeave={() => scheduleClose('profile')}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-sky-300"
              title="Profile"
            >
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : initials}
            </button>
            {profileOpen ? (
              <div className="absolute right-0 top-full z-20 min-w-64 pt-1">
                <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <DropdownSection title="Account">
                    <Link href="/profile" className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                      My Profile
                    </Link>
                    <Link href="/time" className="block rounded-lg px-3 py-2 text-sky-700 hover:bg-sky-50" onClick={() => setProfileOpen(false)}>
                      {clockedInRecord ? 'Switch Clock-In Record' : 'Clock In'}
                    </Link>
                    {clockedInRecord ? (
                      <button
                        type="button"
                        onClick={quickClockOut}
                        disabled={clockBusy}
                        className="w-full rounded-lg px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        {clockBusy ? 'Clocking out…' : 'Clock Out'}
                      </button>
                    ) : null}
                  </DropdownSection>

                  {clockError ? <p className="px-3 py-1 text-xs text-rose-600">{clockError}</p> : null}

                  {isAdmin ? (
                    <>
                      <div className="my-2 border-t border-slate-200" />
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Emulation</p>
                        {!isEmulating ? (
                          <>
                            <input
                              value={emulationQuery}
                              onChange={(e) => setEmulationQuery(e.target.value)}
                              placeholder="Search user"
                              className="mb-2 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm text-slate-900"
                              disabled={emulationLoading || emulationBusy || availableEmulationUsers.length === 0}
                            />
                            <select
                              value={selectedEmulationUserId}
                              onChange={(e) => setSelectedEmulationUserId(e.target.value)}
                              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm text-slate-900"
                              disabled={emulationLoading || emulationBusy || filteredEmulationUsers.length === 0}
                            >
                              {filteredEmulationUsers.length === 0 ? <option value="">No matching users</option> : null}
                              {filteredEmulationUsers.map((u) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={startEmulation}
                              disabled={emulationLoading || emulationBusy || !selectedEmulationUserId || filteredEmulationUsers.length === 0}
                              className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                            >
                              {emulationBusy ? 'Starting Emulation…' : emulationLoading ? 'Loading Users…' : 'Start Emulation'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={stopEmulation}
                            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-xs font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            Stop Emulation
                          </button>
                        )}
                        {emulationError ? <p className="mt-1 text-xs text-rose-600">{emulationError}</p> : null}
                      </div>
                    </>
                  ) : null}

                  <div className="my-2 border-t border-slate-200" />
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full rounded-lg px-3 py-2 text-left text-rose-700 hover:bg-rose-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
