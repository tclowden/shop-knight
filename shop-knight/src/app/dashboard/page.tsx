import Link from 'next/link';
import { Nav } from '@/components/nav';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const [openOpportunities, quotesPending, salesOrders, jobsInProgress, myTasks] = await Promise.all([
    prisma.opportunity.count({ where: { stage: { not: 'WON' } } }),
    prisma.quote.count({ where: { status: { in: ['DRAFT', 'SENT'] } } }),
    prisma.salesOrder.count(),
    prisma.job.count(),
    prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } } }),
  ]);

  const cards = [
    { label: 'Open Opportunities', value: openOpportunities, href: '/sales/opportunities' },
    { label: 'Quotes Pending', value: quotesPending, href: '/sales/quotes' },
    { label: 'Sales Orders', value: salesOrders, href: '/sales/orders' },
    { label: 'Jobs In Progress', value: jobsInProgress, href: null },
    { label: 'My Tasks', value: myTasks, href: null },
  ];

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-zinc-400">Mission control for sales, operations, and purchasing.</p>
      <Nav />

      <div className="mb-4 flex max-w-xs flex-col gap-2">
        <Link href="/admin/users" className="rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800">User Admin</Link>
        <Link href="/admin/products" className="rounded bg-blue-600 px-3 py-2 text-sm font-medium">Product Admin</Link>
      </div>

      <section className="grid max-w-xs grid-cols-1 gap-3">
        {cards.map((card) => {
          const content = (
            <>
              <p className="text-sm text-zinc-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              {card.href ? <p className="mt-2 text-xs text-blue-400">View list →</p> : null}
            </>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className="rounded border border-zinc-800 p-4 transition hover:bg-zinc-900">
              {content}
            </Link>
          ) : (
            <article key={card.label} className="rounded border border-zinc-800 p-4">
              {content}
            </article>
          );
        })}
      </section>
    </main>
  );
}
