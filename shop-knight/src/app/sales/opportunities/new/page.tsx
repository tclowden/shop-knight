"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/nav';

type User = { id: string; name: string; type: string };
type Customer = { id: string; name: string };

export default function NewOpportunityPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [source, setSource] = useState('Referral');
  const [priority, setPriority] = useState('Medium');
  const [estimatedValue, setEstimatedValue] = useState('0');
  const [probability, setProbability] = useState('0.50');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [salesRepInput, setSalesRepInput] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [projectManagerInput, setProjectManagerInput] = useState('');

  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name)), [customers]);
  const sortedSalesReps = useMemo(() => [...users].filter((u) => u.type === 'SALES_REP' || u.type === 'SALES' || u.type === 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedProjectManagers = useMemo(() => [...users].filter((u) => u.type === 'PROJECT_MANAGER' || u.type === 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)), [users]);

  async function load() {
    const [usersRes, customersRes] = await Promise.all([fetch('/api/users'), fetch('/api/customers')]);
    setUsers(await usersRes.json());
    setCustomers(await customersRes.json());
  }

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault();

    const matchedCustomer = sortedCustomers.find((c) => c.name.toLowerCase() === customerInput.trim().toLowerCase());

    await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        customerId: matchedCustomer?.id || null,
        customer: matchedCustomer ? null : customerInput.trim(),
        source,
        priority,
        estimatedValue,
        probability,
        expectedCloseDate: expectedCloseDate || null,
        dueDate: dueDate || null,
        salesRepId: salesRepId || null,
        projectManagerId: projectManagerId || null,
      }),
    });

    router.push('/sales/opportunities');
    router.refresh();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">New Opportunity</h1>
      <p className="text-sm text-zinc-400">Create a new sales opportunity.</p>
      <Nav />

      <form onSubmit={createOpportunity} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Opportunity Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opportunity name" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Customer</span>
          <input list="customer-options" value={customerInput} onChange={(e) => setCustomerInput(e.target.value)} placeholder="Type to search or create" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" required />
        </label>
        <datalist id="customer-options">{sortedCustomers.map((c) => <option key={c.id} value={c.name} />)}</datalist>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Source</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <option>Referral</option><option>Website</option><option>Repeat Customer</option><option>Outbound</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Estimated Value</span>
          <input value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} type="number" min="0" step="0.01" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Probability (0-1)</span>
          <input value={probability} onChange={(e) => setProbability(e.target.value)} type="number" min="0" max="1" step="0.01" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Expected Close Date</span>
          <input value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} type="date" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Due Date</span>
          <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Sales Rep</span>
          <input list="sales-rep-options" value={salesRepInput} onChange={(e) => { const val = e.target.value; setSalesRepInput(val); const match = sortedSalesReps.find((u) => u.name.toLowerCase() === val.toLowerCase()); setSalesRepId(match?.id || ''); }} placeholder="Type to search" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </label>
        <datalist id="sales-rep-options">{sortedSalesReps.map((u) => <option key={u.id} value={u.name} />)}</datalist>

        <label className="text-sm">
          <span className="mb-1 block text-zinc-300">Project Manager</span>
          <input list="pm-options" value={projectManagerInput} onChange={(e) => { const val = e.target.value; setProjectManagerInput(val); const match = sortedProjectManagers.find((u) => u.name.toLowerCase() === val.toLowerCase()); setProjectManagerId(match?.id || ''); }} placeholder="Type to search" className="w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        </label>
        <datalist id="pm-options">{sortedProjectManagers.map((u) => <option key={u.id} value={u.name} />)}</datalist>

        <div className="md:col-span-5">
          <button className="rounded bg-blue-600 px-4 py-2">Create Opportunity</button>
        </div>
      </form>
    </main>
  );
}
