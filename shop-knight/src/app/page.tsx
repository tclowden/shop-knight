import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-semibold">Shop Replacement Scaffold</h1>
      <p className="mt-3 text-zinc-400">Next.js + React + Prisma starter for your ShopVox replacement.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/login" className="rounded bg-blue-600 px-4 py-2">Go to Login</Link>
      </div>
    </main>
  );
}
