import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { Nav } from '@/components/nav';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const userId = session?.user?.id;
  const params = await searchParams;

  const fromDate = parseDate(params?.from);
  const toDate = parseDate(params?.to, true);
  const createdAtFilter = fromDate || toDate ? {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: toDate } : {}),
  } : undefined;

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
    prisma.opportunity.count({ where: { companyId, stage: { not: 'WON' }, ...(createdAtFilter ? { createdAt: createdAtFilter } : {}) } }),
    prisma.quote.count({ where: { companyId, status: { in: ['DRAFT', 'SENT'] }, ...(createdAtFilter ? { createdAt: createdAtFilter } : {}) } }),
    prisma.salesOrder.count({ where: { companyId, ...(createdAtFilter ? { createdAt: createdAtFilter } : {}) } }),
    prisma.job.count({ where: { opportunity: { companyId }, ...(createdAtFilter ? { createdAt: createdAtFilter } : {}) } }),
    prisma.task.count({ where: { assigneeId: userId || undefined, status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } } }),
    prisma.salesOrder.count({ where: { companyId, status: { is: { name: 'Archived' } }, ...(createdAtFilter ? { createdAt: createdAtFilter } : {}) } }),
    prisma.salesOrder.count({ where: { companyId, status: { is: { name: { in: ['Complete', 'Completed'] } } }, ...(createdAtFilter ? { createdAt: createdAtFilter } : {}) } }),
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

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-2" method="GET">
          <label className="text-xs text-slate-600">
            From
            <input name="from" defaultValue={params?.from || ''} type="date" className="mt-1 block rounded border border-slate-300 bg-white p-2 text-slate-900" />
          </label>
          <label className="text-xs text-slate-600">
            To
            <input name="to" defaultValue={params?.to || ''} type="date" className="mt-1 block rounded border border-slate-300 bg-white p-2 text-slate-900" />
          </label>
          <button className="inline-flex h-10 items-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700">Apply Filters</button>
          <Link href="/dashboard" className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear</Link>
        </form>
      </section>

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
