import { Nav } from '@/components/nav';

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Opportunity {id}</h1>
      <p className="text-sm text-zinc-400">Holds quotes, projects, sales orders, jobs, and purchase orders.</p>
      <Nav />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded border border-zinc-800 p-4">
          <h2 className="font-medium">Quotes</h2>
          <p className="mt-2 text-sm text-zinc-400">Q-1001 (Draft)</p>
          <form action="/api/sales/convert-quote" method="post" className="mt-4">
            <input type="hidden" name="quoteId" value="Q-1001" />
            <button className="rounded bg-blue-600 px-3 py-2 text-sm" type="submit">
              Convert Quote → Sales Order
            </button>
          </form>
        </article>

        <article className="rounded border border-zinc-800 p-4">
          <h2 className="font-medium">Sales Orders + POs</h2>
          <p className="mt-2 text-sm text-zinc-400">SO-2101 with line-level PO attachments (scaffold).</p>
        </article>

        <article className="rounded border border-zinc-800 p-4">
          <h2 className="font-medium">Projects / Jobs</h2>
          <p className="mt-2 text-sm text-zinc-400">Project + Job records hang off this opportunity.</p>
        </article>

        <article className="rounded border border-zinc-800 p-4">
          <h2 className="font-medium">Tasks</h2>
          <p className="mt-2 text-sm text-zinc-400">Entity tasks assignable to users (TODO / In Progress / Blocked / Done).</p>
        </article>
      </section>
    </main>
  );
}
