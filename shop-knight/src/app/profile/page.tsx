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
  knownTravelerNumber: string | null;
  rewardMarriottNumber: string | null;
  rewardUnitedNumber: string | null;
  rewardDeltaNumber: string | null;
  rewardAmericanNumber: string | null;
};

type Pref = { event: string; emailEnabled: boolean; inAppEnabled: boolean };
type TimeEntry = {
  id: string;
  sourceType: string;
  status: string;
  clockInAt: string;
  clockOutAt: string | null;
  salesOrder?: { orderNumber?: string | null } | null;
  quote?: { quoteNumber?: string | null } | null;
  job?: { name?: string | null } | null;
};

type PayPeriodSummary = {
  periodIndex: number;
  isCurrent: boolean;
  start: string;
  endExclusive: string;
  totalHours: number;
  week1: { start: string; endExclusive: string; hours: number };
  week2: { start: string; endExclusive: string; hours: number };
};

const notificationLabels: Record<string, string> = {
  NOTE_MENTION: 'Note mentions',
  TASK_ASSIGNED: 'Task assigned',
  OPPORTUNITY_ROLE_ASSIGNED: 'Opportunity role assignments',
  QUOTE_ROLE_ASSIGNED: 'Quote role assignments',
  SALES_ORDER_ROLE_ASSIGNED: 'Sales order role assignments',
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [knownTravelerNumber, setKnownTravelerNumber] = useState('');
  const [rewardMarriottNumber, setRewardMarriottNumber] = useState('');
  const [rewardUnitedNumber, setRewardUnitedNumber] = useState('');
  const [rewardDeltaNumber, setRewardDeltaNumber] = useState('');
  const [rewardAmericanNumber, setRewardAmericanNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');
  const [prefsErr, setPrefsErr] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [openTimeEntry, setOpenTimeEntry] = useState<TimeEntry | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [clockMsg, setClockMsg] = useState('');
  const [clockErr, setClockErr] = useState('');
  const [payPeriods, setPayPeriods] = useState<PayPeriodSummary[]>([]);
  const [periodsToShow, setPeriodsToShow] = useState(6);

  const initials = useMemo(() => {
    const source = name || session?.user?.name || '';
    return source.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  }, [name, session?.user?.name]);

  async function load() {
    setLoading(true);
    const [profileRes, prefsRes, timeRes, payPeriodsRes] = await Promise.all([
      fetch('/api/users/me'),
      fetch('/api/notifications/preferences'),
      fetch('/api/time?scope=mine'),
      fetch(`/api/time/my-pay-periods?periods=${periodsToShow}`),
    ]);

    const profilePayload = await profileRes.json().catch(() => null);
    if (!profileRes.ok) {
      setError(typeof profilePayload?.error === 'string' ? profilePayload.error : 'Failed to load profile');
      setLoading(false);
      return;
    }

    setProfile(profilePayload);
    setName(profilePayload.name || session?.user?.name || '');
    setPhone(profilePayload.phone || '');
    setAvatarUrl(profilePayload.avatarUrl || session?.user?.image || '');
    setKnownTravelerNumber(profilePayload.knownTravelerNumber || '');
    setRewardMarriottNumber(profilePayload.rewardMarriottNumber || '');
    setRewardUnitedNumber(profilePayload.rewardUnitedNumber || '');
    setRewardDeltaNumber(profilePayload.rewardDeltaNumber || '');
    setRewardAmericanNumber(profilePayload.rewardAmericanNumber || '');

    if (prefsRes.ok) {
      const prefPayload = await prefsRes.json().catch(() => []);
      setPrefs(Array.isArray(prefPayload) ? prefPayload : []);
    }

    if (timeRes.ok) {
      const timePayload = await timeRes.json().catch(() => []);
      const mine = Array.isArray(timePayload) ? timePayload : [];
      const open = mine.find((entry) => !entry?.clockOutAt) || null;
      setOpenTimeEntry(open);
    }

    if (payPeriodsRes.ok) {
      const payPeriodsPayload = await payPeriodsRes.json().catch(() => ({}));
      setPayPeriods(Array.isArray(payPeriodsPayload?.periods) ? payPeriodsPayload.periods : []);
    }

    setLoading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        avatarUrl,
        knownTravelerNumber,
        rewardMarriottNumber,
        rewardUnitedNumber,
        rewardDeltaNumber,
        rewardAmericanNumber,
      }),
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

  async function saveNotificationPrefs() {
    setPrefsMsg('');
    setPrefsErr('');
    setPrefsSaving(true);

    const res = await fetch('/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: prefs }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPrefsErr(typeof payload?.error === 'string' ? payload.error : 'Failed to save notification preferences');
      setPrefsSaving(false);
      return;
    }

    setPrefsMsg('Notification preferences saved');
    setPrefsSaving(false);
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

  async function clockOutFromProfile() {
    setClockMsg('');
    setClockErr('');
    setClockBusy(true);

    const res = await fetch('/api/time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock_out' }),
    });

    const payload = await res.json().catch(() => ({}));
    setClockBusy(false);

    if (!res.ok) {
      setClockErr(typeof payload?.error === 'string' ? payload.error : 'Failed to clock out');
      return;
    }

    setClockMsg('Clocked out successfully');
    await load();
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
    if (status === 'authenticated') void load();
    if (status === 'unauthenticated') setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, periodsToShow]);

  if (loading) {
    return <main className="mx-auto max-w-5xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">Loading profile...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
      <p className="text-sm text-slate-500">Manage your account details, notifications, and password.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-base font-semibold">Time Clock</h2>
        {openTimeEntry ? (
          <>
            <p className="text-sm text-slate-600">
              You are clocked in to{' '}
              <span className="font-semibold">
                {openTimeEntry.salesOrder?.orderNumber || openTimeEntry.quote?.quoteNumber || openTimeEntry.job?.name || openTimeEntry.sourceType}
              </span>{' '}
              since {new Date(openTimeEntry.clockInAt).toLocaleString()}.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={clockOutFromProfile}
                disabled={clockBusy}
                className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
              >
                {clockBusy ? 'Clocking out…' : 'Clock Out'}
              </button>
              {clockErr ? <p className="text-sm text-rose-600">{clockErr}</p> : null}
              {clockMsg ? <p className="text-sm text-emerald-700">{clockMsg}</p> : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No active clock-in right now.</p>
        )}
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">My Hours by Pay Period</h2>
          <label className="text-sm text-slate-600">
            Show
            <select value={periodsToShow} onChange={(e) => setPeriodsToShow(Number(e.target.value) || 6)} className="field ml-2 h-9 w-24">
              <option value={4}>4 periods</option>
              <option value={6}>6 periods</option>
              <option value={8}>8 periods</option>
              <option value={12}>12 periods</option>
            </select>
          </label>
        </div>
        <div className="space-y-3">
          {payPeriods.map((period) => (
            <div key={period.start} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">
                  {period.isCurrent ? 'Current Pay Period' : 'Previous Pay Period'}: {new Date(period.start).toLocaleDateString()} - {new Date(new Date(period.endExclusive).getTime() - 86400000).toLocaleDateString()}
                </p>
                <p className="text-sm font-semibold text-sky-700">Total: {period.totalHours.toFixed(2)} hrs</p>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="font-medium text-slate-700">Week 1</p>
                  <p className="text-slate-500">{new Date(period.week1.start).toLocaleDateString()} - {new Date(new Date(period.week1.endExclusive).getTime() - 86400000).toLocaleDateString()}</p>
                  <p className="mt-1 font-semibold text-slate-800">{period.week1.hours.toFixed(2)} hrs</p>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="font-medium text-slate-700">Week 2</p>
                  <p className="text-slate-500">{new Date(period.week2.start).toLocaleDateString()} - {new Date(new Date(period.week2.endExclusive).getTime() - 86400000).toLocaleDateString()}</p>
                  <p className="mt-1 font-semibold text-slate-800">{period.week2.hours.toFixed(2)} hrs</p>
                </div>
              </div>
            </div>
          ))}
          {payPeriods.length === 0 ? <p className="text-sm text-slate-500">No pay period data available yet.</p> : null}
        </div>
      </section>

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
            <input value={profile?.email || session?.user?.email || ''} disabled className="field bg-slate-100" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input value={profile?.titleName || ''} disabled className="field bg-slate-100" />
          </label>

          <div className="md:col-span-2 mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-700">Travel Info</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Known Traveler Number</span>
                <input value={knownTravelerNumber} onChange={(e) => setKnownTravelerNumber(e.target.value)} className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Marriott #</span>
                <input value={rewardMarriottNumber} onChange={(e) => setRewardMarriottNumber(e.target.value)} className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">United #</span>
                <input value={rewardUnitedNumber} onChange={(e) => setRewardUnitedNumber(e.target.value)} className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Delta #</span>
                <input value={rewardDeltaNumber} onChange={(e) => setRewardDeltaNumber(e.target.value)} className="field" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">American #</span>
                <input value={rewardAmericanNumber} onChange={(e) => setRewardAmericanNumber(e.target.value)} className="field" />
              </label>
            </div>
          </div>
          {error ? <p className="md:col-span-2 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="md:col-span-2 text-sm text-emerald-700">{message}</p> : null}
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Save Profile</button>
          </div>
        </form>
      </section>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" id="notifications">
        <h2 className="mb-3 text-base font-semibold">Notification Preferences</h2>
        <p className="mb-3 text-sm text-slate-500">These settings are per-user and only affect your account.</p>
        <div className="space-y-3">
          {prefs.map((p, idx) => (
            <div key={p.event} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">{notificationLabels[p.event] || p.event}</p>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={p.emailEnabled}
                    onChange={(e) => setPrefs((prev) => prev.map((item, i) => i === idx ? { ...item, emailEnabled: e.target.checked } : item))}
                  />
                  Email
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={p.inAppEnabled}
                    onChange={(e) => setPrefs((prev) => prev.map((item, i) => i === idx ? { ...item, inAppEnabled: e.target.checked } : item))}
                  />
                  In-app
                </label>
              </div>
            </div>
          ))}
          {prefs.length === 0 ? <p className="text-sm text-slate-500">No preferences loaded.</p> : null}
        </div>
        {prefsErr ? <p className="mt-3 text-sm text-rose-600">{prefsErr}</p> : null}
        {prefsMsg ? <p className="mt-3 text-sm text-emerald-700">{prefsMsg}</p> : null}
        <button onClick={saveNotificationPrefs} disabled={prefsSaving} className="mt-4 rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
          {prefsSaving ? 'Saving…' : 'Save Notification Preferences'}
        </button>
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
