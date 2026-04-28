"use client";

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Nav } from '@/components/nav';

type Company = { id: string; name: string; slug: string };
type SettingsPayload = {
  company: Company;
  settings: {
    emailEnabled: boolean;
    emailProvider: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassConfigured: boolean;
    smtpPassMasked: string;
    smtpFromEmail: string;
    smtpFromName: string;
    smtpReplyTo: string;
    smsEnabled: boolean;
    smsProvider: string;
    twilioAccountSid: string;
    twilioAuthTokenConfigured: boolean;
    twilioAuthTokenMasked: string;
    twilioFromNumber: string;
    twilioMessagingServiceSid: string;
  };
};

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function CompanyCommunicationsPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpPassHint, setSmtpPassHint] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpReplyTo, setSmtpReplyTo] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioAuthHint, setTwilioAuthHint] = useState('');
  const [twilioFromNumber, setTwilioFromNumber] = useState('');
  const [twilioMessagingServiceSid, setTwilioMessagingServiceSid] = useState('');
  const [testSmsTo, setTestSmsTo] = useState('');

  const role = String(session?.user?.role || '');
  const roles = Array.isArray(session?.user?.roles) ? session.user.roles.map(String) : [];
  const isSuperAdmin = role === 'SUPER_ADMIN' || roles.includes('SUPER_ADMIN');

  function applyPayload(payload: SettingsPayload) {
    setEmailEnabled(payload.settings.emailEnabled);
    setSmtpHost(payload.settings.smtpHost || '');
    setSmtpPort(String(payload.settings.smtpPort || 587));
    setSmtpSecure(Boolean(payload.settings.smtpSecure));
    setSmtpUser(payload.settings.smtpUser || '');
    setSmtpPass('');
    setSmtpPassHint(payload.settings.smtpPassConfigured ? payload.settings.smtpPassMasked || 'Saved' : '');
    setSmtpFromEmail(payload.settings.smtpFromEmail || '');
    setSmtpFromName(payload.settings.smtpFromName || '');
    setSmtpReplyTo(payload.settings.smtpReplyTo || '');
    setSmsEnabled(payload.settings.smsEnabled);
    setTwilioAccountSid(payload.settings.twilioAccountSid || '');
    setTwilioAuthToken('');
    setTwilioAuthHint(payload.settings.twilioAuthTokenConfigured ? payload.settings.twilioAuthTokenMasked || 'Saved' : '');
    setTwilioFromNumber(payload.settings.twilioFromNumber || '');
    setTwilioMessagingServiceSid(payload.settings.twilioMessagingServiceSid || '');
  }

  async function loadCompanies() {
    if (!isSuperAdmin) {
      const activeCompanyId = String(session?.user?.companyId || '');
      const sessionCompanies = Array.isArray(session?.user?.companies)
        ? session.user.companies.map((c: { id?: string; name?: string; slug?: string }) => ({ id: String(c.id || ''), name: String(c.name || 'Company'), slug: String(c.slug || '') })).filter((c: Company) => c.id)
        : [];
      const fallbackCompanies = sessionCompanies.length > 0
        ? sessionCompanies
        : (activeCompanyId ? [{ id: activeCompanyId, name: 'Active Company', slug: '' }] : []);
      setCompanies(fallbackCompanies);
      const fallback = selectedCompanyId || activeCompanyId || fallbackCompanies[0]?.id || '';
      if (fallback) setSelectedCompanyId(fallback);
      return fallback;
    }

    const res = await fetch('/api/admin/companies');
    if (!res.ok) return '';
    const data = await res.json();
    const next = Array.isArray(data?.companies) ? data.companies.map((c: Company) => ({ id: c.id, name: c.name, slug: c.slug })) : [];
    setCompanies(next);
    if (!selectedCompanyId) {
      const fallback = next[0]?.id || '';
      setSelectedCompanyId(fallback);
      return fallback;
    }
    return selectedCompanyId;
  }

  async function loadSettings(companyId: string) {
    if (!companyId) return;
    setLoading(true);
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/company-communications?companyId=${encodeURIComponent(companyId)}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error || 'Failed to load settings');
      return;
    }
    applyPayload(data as SettingsPayload);
  }

  async function bootstrap() {
    const companyId = await loadCompanies();
    const target = companyId || (isSuperAdmin ? '' : String(session?.user?.companyId || ''));
    if (target) await loadSettings(target);
    else setLoading(false);
  }

  async function sendTest(mode: 'email' | 'sms') {
    if (!selectedCompanyId) return;
    if (mode === 'email') setTestingEmail(true);
    else setTestingSms(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/admin/company-communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        companyId: selectedCompanyId,
        to: mode === 'email' ? testEmailTo : testSmsTo,
        smtpHost,
        smtpPort: Number(smtpPort || 587),
        smtpSecure,
        smtpUser,
        smtpPass,
        smtpFromEmail,
        smtpFromName,
        smtpReplyTo,
        twilioAccountSid,
        twilioAuthToken,
        twilioFromNumber,
        twilioMessagingServiceSid,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (mode === 'email') setTestingEmail(false);
    else setTestingSms(false);

    if (!res.ok) {
      setError(data?.error || `Failed to send test ${mode}`);
      return;
    }

    setMessage(data?.message || `Test ${mode} sent.`);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId) return;
    setSaving(true);
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/company-communications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: selectedCompanyId,
        emailEnabled,
        smtpHost,
        smtpPort: Number(smtpPort || 587),
        smtpSecure,
        smtpUser,
        smtpPass,
        smtpFromEmail,
        smtpFromName,
        smtpReplyTo,
        smsEnabled,
        twilioAccountSid,
        twilioAuthToken,
        twilioFromNumber,
        twilioMessagingServiceSid,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data?.error || 'Failed to save settings');
      return;
    }
    setMessage('Communication settings saved.');
    await loadSettings(selectedCompanyId);
  }

  useEffect(() => {
    if (!session?.user) return;
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Company Communications</h1>
      <p className="text-sm text-slate-500">Configure company-specific outbound email and SMS credentials for notifications.</p>
      <Nav />

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FormField label="Company">
            <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); void loadSettings(e.target.value); }} className="field" disabled={!isSuperAdmin}>
              <option value="">Select company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </FormField>
        </div>
      </section>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-emerald-600">{message}</p> : null}

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">Loading…</div> : (
        <form onSubmit={save} className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Email (SMTP)</h2>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} /> Enabled</label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <FormField label="SMTP Host"><input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="field" /></FormField>
              <FormField label="SMTP Port"><input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} type="number" className="field" /></FormField>
              <FormField label="SMTP User"><input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="field" /></FormField>
              <FormField label="SMTP Password"><input value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} type="password" className="field" placeholder={smtpPassHint ? `Saved: ${smtpPassHint}` : ''} /></FormField>
              <FormField label="From Email"><input value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} className="field" /></FormField>
              <FormField label="From Name"><input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} className="field" /></FormField>
              <FormField label="Reply-To"><input value={smtpReplyTo} onChange={(e) => setSmtpReplyTo(e.target.value)} className="field" /></FormField>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} /> Use SSL/TLS</label>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
              <FormField label="Test Email Recipient"><input value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} className="field" placeholder="you@company.com" /></FormField>
              <div className="flex items-end">
                <button type="button" onClick={() => void sendTest('email')} disabled={testingEmail || !selectedCompanyId} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{testingEmail ? 'Sending…' : 'Send Test Email'}</button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">SMS (Twilio)</h2>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} /> Enabled</label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <FormField label="Account SID"><input value={twilioAccountSid} onChange={(e) => setTwilioAccountSid(e.target.value)} className="field" /></FormField>
              <FormField label="Auth Token"><input value={twilioAuthToken} onChange={(e) => setTwilioAuthToken(e.target.value)} type="password" className="field" placeholder={twilioAuthHint ? `Saved: ${twilioAuthHint}` : ''} /></FormField>
              <FormField label="From Number"><input value={twilioFromNumber} onChange={(e) => setTwilioFromNumber(e.target.value)} className="field" placeholder="+15551234567" /></FormField>
              <FormField label="Messaging Service SID"><input value={twilioMessagingServiceSid} onChange={(e) => setTwilioMessagingServiceSid(e.target.value)} className="field" /></FormField>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
              <FormField label="Test SMS Recipient"><input value={testSmsTo} onChange={(e) => setTestSmsTo(e.target.value)} className="field" placeholder="+15551234567" /></FormField>
              <div className="flex items-end">
                <button type="button" onClick={() => void sendTest('sms')} disabled={testingSms || !selectedCompanyId} className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{testingSms ? 'Sending…' : 'Send Test SMS'}</button>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button disabled={saving || !selectedCompanyId} className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">{saving ? 'Saving…' : 'Save Communication Settings'}</button>
          </div>
        </form>
      )}
    </main>
  );
}
