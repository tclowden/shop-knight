"use client";

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { CompanySwitcher } from '@/components/company-switcher';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sales/opportunities', label: 'Opportunities' },
  { href: '/sales/quotes', label: 'Quotes' },
  { href: '/sales/orders', label: 'Sales Orders' },
  { href: '/customers', label: 'Customers' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/tasks/calendar', label: 'Task Calendar' },
];

const adminLinks = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/companies', label: 'Companies' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/custom-roles', label: 'Roles' },
  { href: '/admin/sales-order-statuses', label: 'SO Statuses' },
  { href: '/tasks/templates', label: 'Task Templates' },
];

export function Nav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50"
        >
          {link.label}
        </Link>
      ))}

      <details className="relative">
        <summary className="list-none cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:border-sky-300 hover:bg-sky-50">
          Admin ▾
        </summary>
        <div className="absolute left-0 z-20 mt-2 min-w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </details>

      <CompanySwitcher />

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-rose-700 hover:bg-rose-100"
      >
        Logout
      </button>
    </nav>
  );
}
