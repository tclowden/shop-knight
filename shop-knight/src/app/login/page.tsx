"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
      redirect: true,
    });

    if (res?.error) setError('Invalid email or password.');
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-400">Use your user credentials.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded border border-zinc-800 p-4">
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border border-zinc-700 bg-zinc-900 p-2" placeholder="you@company.com" required />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full rounded border border-zinc-700 bg-zinc-900 p-2" required />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="w-full rounded bg-blue-600 p-2 font-medium">Sign In</button>
      </form>
    </main>
  );
}
