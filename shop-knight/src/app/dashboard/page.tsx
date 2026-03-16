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

  const [openOpportunities, quotesPending, salesOrders, jobsInProgress, myTasks, archivedSalesOrders, completedSalesOrders] = await Promise.all([
    prisma.opportunity.count({ where: { companyId, stage: { not: 'WON' } } }),
    prisma.quote.count({ where: { companyId, status: { in: ['DRAFT', 'SENT'] } } }),
    prisma.salesOrder.count({ where: { companyId } }),
    prisma.job.count({ where: { opportunity: { companyId } } }),
    prisma.task.count({ where: { assigneeId: userId || undefined, status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } } }),
    prisma.salesOrder.count({ where: { companyId, status: { is: { name: 'Archived' } } } }),
    prisma.salesOrder.count({ where: { companyId, status: { is: { name: { in: ['Complete', 'Completed'] } } } } }),
  ]);

  const cards = [
    { label: 'Open Opportunities', value: openOpportunities, href: '/sales/opportunities' },
    { label: 'Quotes Pending', value: quotesPending, href: '/sales/quotes' },
    { label: 'Sales Orders', value: salesOrders, href: '/sales/orders' },
    { label: 'Jobs In Progress', value: jobsInProgress, href: null },
    { label: 'My Tasks', value: myTasks, href: null },
  ];

  const maxBar = Math.max(completedSalesOrders, archivedSalesOrders, 1);

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

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold">Sales Orders: Complete vs Archived</h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-600">Complete</span>
              <span className="font-semibold">{completedSalesOrders}</span>
            </div>
            <div className="h-4 rounded bg-slate-100">
              <div className="h-4 rounded bg-emerald-500" style={{ width: `${(completedSalesOrders / maxBar) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-600">Archived</span>
              <span className="font-semibold">{archivedSalesOrders}</span>
            </div>
            <div className="h-4 rounded bg-slate-100">
              <div className="h-4 rounded bg-zinc-500" style={{ width: `${(archivedSalesOrders / maxBar) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
