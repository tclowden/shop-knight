import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-400">Auth wiring comes next (NextAuth + Prisma adapter).</p>
      <form className="mt-6 space-y-4 rounded border border-zinc-800 p-4">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input className="w-full rounded border border-zinc-700 bg-zinc-900 p-2" placeholder="you@company.com" />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input type="password" className="w-full rounded border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <button type="button" className="w-full rounded bg-blue-600 p-2 font-medium">Sign In (UI scaffold)</button>
      </form>
      <Link href="/dashboard" className="mt-4 inline-block text-sm text-blue-400">Continue to dashboard scaffold →</Link>
    </main>
  );
}
