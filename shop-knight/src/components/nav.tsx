import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/products', label: 'Products' },
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
    <nav className="mb-6 flex w-full max-w-xs flex-col gap-2 border-r border-white/10 pr-4 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-zinc-100 hover:border-orange-300/40 hover:bg-orange-400/10"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
