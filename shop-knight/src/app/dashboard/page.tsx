import { Nav } from '@/components/nav';
import { dashboardData } from '@/lib/mock-data';

const cards = [
  ['Open Opportunities', dashboardData.openOpportunities],
  ['Quotes Pending', dashboardData.quotesPending],
  ['Jobs In Progress', dashboardData.jobsInProgress],
  ['My Tasks', dashboardData.myTasks],
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-zinc-400">Mission control for sales, operations, and purchasing.</p>
      <Nav />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="rounded border border-zinc-800 p-4">
            <p className="text-sm text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{String(value)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
