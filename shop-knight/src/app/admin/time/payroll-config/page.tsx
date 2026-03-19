"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';

type Config = {
  paycomEarningCode: string;
  defaultDepartmentCode: string;
  employeeCodeField: 'USER_ID' | 'EMAIL';
  departmentMap: Record<string, string>;
};

export default function PayrollConfigPage() {
  const [config, setConfig] = useState<Config>({
    paycomEarningCode: 'REG',
    defaultDepartmentCode: '',
    employeeCodeField: 'USER_ID',
    departmentMap: {},
  });
  const [departmentMapJson, setDepartmentMapJson] = useState('{}');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/time/config');
    const data = await res.json().catch(() => ({}));
    const next: Config = {
      paycomEarningCode: String(data?.paycomEarningCode || 'REG'),
      defaultDepartmentCode: String(data?.defaultDepartmentCode || ''),
      employeeCodeField: data?.employeeCodeField === 'EMAIL' ? 'EMAIL' : 'USER_ID',
      departmentMap: data?.departmentMap && typeof data.departmentMap === 'object' ? data.departmentMap : {},
    };
    setConfig(next);
    setDepartmentMapJson(JSON.stringify(next.departmentMap, null, 2));
  }

  async function save() {
    let parsedMap: Record<string, string> = {};
    try {
      const parsed = JSON.parse(departmentMapJson || '{}');
      if (parsed && typeof parsed === 'object') parsedMap = parsed;
    } catch {
      window.alert('Department map must be valid JSON');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/time/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...config,
        departmentMap: parsedMap,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(payload?.error || 'Failed to save payroll config');
      return;
    }

    await load();
    window.alert('Payroll export configuration saved');
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="mx-auto max-w-5xl bg-[#f5f7fa] p-6 text-slate-800 md:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Payroll Export Config</h1>
      <p className="mt-1 text-sm text-slate-500">Map Shop Knight payroll data into your Paycom import format.</p>
      <Nav />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <label className="text-sm block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Default Paycom Earning Code</span>
          <input value={config.paycomEarningCode} onChange={(e) => setConfig((prev) => ({ ...prev, paycomEarningCode: e.target.value }))} className="field" />
        </label>

        <label className="text-sm block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Default Department Code</span>
          <input value={config.defaultDepartmentCode} onChange={(e) => setConfig((prev) => ({ ...prev, defaultDepartmentCode: e.target.value }))} className="field" />
        </label>

        <label className="text-sm block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Employee Code Field</span>
          <select value={config.employeeCodeField} onChange={(e) => setConfig((prev) => ({ ...prev, employeeCodeField: e.target.value as 'USER_ID' | 'EMAIL' }))} className="field">
            <option value="USER_ID">User ID</option>
            <option value="EMAIL">Email</option>
          </select>
        </label>

        <label className="text-sm block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department Map (JSON)</span>
          <textarea value={departmentMapJson} onChange={(e) => setDepartmentMapJson(e.target.value)} className="field min-h-48 font-mono text-xs" />
          <p className="mt-1 text-xs text-slate-500">Example: {'{ "SALES_ORDER": "OPS", "QUOTE": "SALES", "JOB": "PROD" }'}</p>
        </label>

        <div className="flex justify-end">
          <button type="button" onClick={save} disabled={saving} className="inline-flex h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Payroll Config'}
          </button>
        </div>
      </section>
    </main>
  );
}
