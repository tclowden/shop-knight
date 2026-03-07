"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (!res || res.error) {
        setError('Invalid email or password.');
        setLoading(false);
        return;
      }

      const target = res.url || '/dashboard';
      window.location.href = target;
    } catch {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-16 max-w-md bg-white p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">Use your user credentials.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@company.com" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="field" required />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
