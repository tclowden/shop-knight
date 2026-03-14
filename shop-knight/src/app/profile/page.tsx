"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/nav';

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  titleName: string | null;
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const initials = useMemo(() => {
    const source = name || session?.user?.name || '';
    return source.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  }, [name, session?.user?.name]);

  async function load() {
    const res = await fetch('/api/users/me');
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof payload?.error === 'string' ? payload.error : 'Failed to load profile');
      return;
    }
    setProfile(payload);
    setName(payload.name || '');
    setPhone(payload.phone || '');
    setAvatarUrl(payload.avatarUrl || '');
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, avatarUrl }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof payload?.error === 'string' ? payload.error : 'Failed to save profile');
      return;
    }
    setProfile(payload);
    await update({ image: payload.avatarUrl || null, name: payload.name });
    setMessage('Profile saved');
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');

    const res = await fetch('/api/users/me/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPasswordErr(typeof payload?.error === 'string' ? payload.error : 'Failed to change password');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg('Password updated');
  }

  async function onAvatarFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 1_500_000) {
      setError('Image too large (max 1.5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const v = typeof reader.result === 'string' ? reader.result : '';
      setAvatarUrl(v);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
      <p className="text-sm text-slate-500">Manage your account details and password.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Profile</h2>
        <form onSubmit={saveProfile} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2 flex items-center gap-4">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700 ring-1 ring-slate-200">{initials}</div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Profile Photo</label>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onAvatarFile(f); }} className="mt-1 block text-sm" />
            </div>
          </div>

          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
            <input value={profile?.email || ''} disabled className="field bg-slate-100" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input value={profile?.titleName || ''} disabled className="field bg-slate-100" />
          </label>
          {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="md:col-span-2 text-sm text-emerald-700">{message}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Save Profile</button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Change Password</h2>
        <form onSubmit={changePassword} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Current Password</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="field" required />
          </label>
          <div />
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="field" minLength={8} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm New Password</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="field" minLength={8} required />
          </label>
          {passwordErr ? <p className="md:col-span-2 text-sm text-rose-600">{passwordErr}</p> : null}
          {passwordMsg ? <p className="md:col-span-2 text-sm text-emerald-700">{passwordMsg}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">Update Password</button>
          </div>
        </form>
      </section>
    </main>
  );
}
