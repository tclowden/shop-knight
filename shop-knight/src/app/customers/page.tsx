import { Nav } from '@/components/nav';

export default function CustomersPage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Customers</h1>
      <p className="text-sm text-zinc-400">Customer master data scaffold.</p>
      <Nav />
      <div className="rounded border border-dashed border-zinc-700 p-6 text-zinc-400">CRUD scaffolding coming next.</div>
    </main>
  );
}
