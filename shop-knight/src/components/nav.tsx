"use client";

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { CompanySwitcher } from '@/components/company-switcher';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/custom-roles', label: 'Roles' },
  { href: '/admin/sales-order-statuses', label: 'SO Statuses' },
  { href: '/sales/opportunities', label: 'Opportunities' },
  { href: '/sales/quotes', label: 'Quotes' },
  { href: '/sales/orders', label: 'Sales Orders' },
  { href: '/customers', label: 'Customers' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/tasks/calendar', label: 'Task Calendar' },
  { href: '/tasks/templates', label: 'Task Templates' },
];

export function Nav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-zinc-100 hover:border-orange-300/40 hover:bg-orange-400/10"
        >
          {link.label}
        </Link>
      ))}

      <CompanySwitcher />

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-zinc-100 hover:border-red-300/60 hover:bg-red-500/20"
      >
        Logout
      </button>
    </nav>
  );
}
