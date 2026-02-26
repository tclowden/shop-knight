import Link from 'next/link';
import { Nav } from '@/components/nav';
import { opportunities } from '@/lib/mock-data';

export default function OpportunitiesPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Sales Opportunities</h1>
      <p className="text-sm text-zinc-400">Top-level sales hierarchy container.</p>
      <Nav />

      <div className="space-y-3">
        {opportunities.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded border border-zinc-800 p-4 hover:bg-zinc-900">
            <p className="font-medium">{opp.name}</p>
            <p className="text-sm text-zinc-400">{opp.customer} • {opp.stage}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
