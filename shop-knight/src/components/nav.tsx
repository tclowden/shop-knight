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
];

export function Nav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-4 text-sm">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
