import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { Nav } from '@/components/nav';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const userId = session?.user?.id;

  if (!companyId) {
    return (
      <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-rose-600">No active company selected.</p>
        <Nav />
      </main>
    );
  }

  const [openOpportunities, quotesPending, salesOrders, jobsInProgress, myTasks] = await Promise.all([
    prisma.opportunity.count({ where: { companyId, stage: { not: 'WON' } } }),
    prisma.quote.count({ where: { companyId, status: { in: ['DRAFT', 'SENT'] } } }),
    prisma.salesOrder.count({ where: { companyId } }),
    prisma.job.count({ where: { opportunity: { companyId } } }),
    prisma.task.count({ where: { assigneeId: userId || undefined, status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } } }),
  ]);

  const cards = [
    { label: 'Open Opportunities', value: openOpportunities, href: '/sales/opportunities' },
    { label: 'Quotes Pending', value: quotesPending, href: '/sales/quotes' },
    { label: 'Sales Orders', value: salesOrders, href: '/sales/orders' },
    { label: 'Jobs In Progress', value: jobsInProgress, href: null },
    { label: 'My Tasks', value: myTasks, href: null },
  ];

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-slate-500">Mission control for sales, operations, and purchasing.</p>
      <Nav />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {cards.map((card) => {
          const content = (
            <>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              {card.href ? <p className="mt-2 text-xs font-medium text-sky-600">View list →</p> : null}
            </>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-slate-50">
              {content}
            </Link>
          ) : (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {content}
            </article>
          );
        })}
      </section>
    </main>
  );
}
