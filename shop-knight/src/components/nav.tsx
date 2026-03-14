"use client";

import Link from 'next/link';
import { useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { CompanySwitcher } from '@/components/company-switcher';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/jobs/workflows', label: 'Job Workflows' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/travel', label: 'Travel' },
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
  { href: '/admin/titles', label: 'Titles' },
  { href: '/admin/sales-order-statuses', label: 'SO Statuses' },
  { href: '/tasks/templates', label: 'Task Templates' },
];

const superAdminLinks = [{ href: '/admin/companies', label: 'Companies' }];

export function Nav() {
  const { data: session } = useSession();
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const transactionsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.roles?.includes('SUPER_ADMIN');
  const isAdmin = isSuperAdmin || session?.user?.role === 'ADMIN' || session?.user?.roles?.includes('ADMIN');

  function scheduleClose(menu: 'transactions' | 'admin') {
    const timerRef = menu === 'transactions' ? transactionsCloseTimer : adminCloseTimer;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (menu === 'transactions') setTransactionsOpen(false);
      else setAdminOpen(false);
    }, 1500);
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

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-rose-700 hover:bg-rose-100"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
