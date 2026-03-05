"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  source?: string | null;
  priority?: string | null;
  estimatedValue?: string | number | null;
  dueDate?: string | null;
  salesRepName?: string | null;
  projectManagerName?: string | null;
};

type User = {
  id: string;
  name: string;
  type: string;
};

type Customer = {
  id: string;
  name: string;
};

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
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
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);
  const sortedSalesReps = useMemo(() => [...users].filter((u) => u.type === 'SALES_REP' || u.type === 'SALES' || u.type === 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const sortedProjectManagers = useMemo(() => [...users].filter((u) => u.type === 'PROJECT_MANAGER' || u.type === 'ADMIN').sort((a, b) => a.name.localeCompare(b.name)), [users]);

  async function load() {
    const [oppsRes, usersRes, customersRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/users'),
      fetch('/api/customers'),
    ]);
    setItems(await oppsRes.json());
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

    setName('');
    setCustomerInput('');
    setEstimatedValue('0');
    setProbability('0.50');
    setExpectedCloseDate('');
    setDueDate('');
    setSalesRepId('');
    setSalesRepInput('');
    setProjectManagerId('');
    setProjectManagerInput('');
    load();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Sales Opportunities</h1>
      <p className="text-sm text-zinc-400">Top-level sales hierarchy container with key opportunity fields.</p>
      <Nav />

      <form onSubmit={createOpportunity} className="mb-4 grid grid-cols-1 gap-2 rounded border border-zinc-800 p-3 md:grid-cols-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opportunity name" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500" required />

        <input
          list="customer-options"
          value={customerInput}
          onChange={(e) => setCustomerInput(e.target.value)}
          placeholder="Customer (type to search or create)"
          className="rounded border border-zinc-700 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
          required
        />
        <datalist id="customer-options">
          {sortedCustomers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option>Referral</option>
          <option>Website</option>
          <option>Repeat Customer</option>
          <option>Outbound</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded border border-zinc-700 bg-white p-2 text-zinc-900">
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
        <input value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} type="number" min="0" step="0.01" placeholder="Estimated value" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={probability} onChange={(e) => setProbability(e.target.value)} type="number" min="0" max="1" step="0.01" placeholder="Close probability (0-1)" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} type="date" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />
        <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded border border-zinc-700 bg-white p-2 text-zinc-900" />

        <input
          list="sales-rep-options"
          value={salesRepInput}
          onChange={(e) => {
            const val = e.target.value;
            setSalesRepInput(val);
            const match = sortedSalesReps.find((u) => u.name.toLowerCase() === val.toLowerCase());
            setSalesRepId(match?.id || '');
          }}
          placeholder="Sales Rep (type to search)"
          className="rounded border border-zinc-700 bg-white p-2 text-zinc-900"
        />
        <datalist id="sales-rep-options">
          {sortedSalesReps.map((u) => (
            <option key={u.id} value={u.name} />
          ))}
        </datalist>

        <input
          list="pm-options"
          value={projectManagerInput}
          onChange={(e) => {
            const val = e.target.value;
            setProjectManagerInput(val);
            const match = sortedProjectManagers.find((u) => u.name.toLowerCase() === val.toLowerCase());
            setProjectManagerId(match?.id || '');
          }}
          placeholder="Project Manager (type to search)"
          className="rounded border border-zinc-700 bg-white p-2 text-zinc-900"
        />
        <datalist id="pm-options">
          {sortedProjectManagers.map((u) => (
            <option key={u.id} value={u.name} />
          ))}
        </datalist>

        <button className="rounded bg-blue-600 px-3 py-2">Create Opportunity</button>
      </form>

      <div className="space-y-3">
        {sortedItems.map((opp) => (
          <Link key={opp.id} href={`/sales/opportunities/${opp.id}`} className="block rounded border border-zinc-800 p-4 hover:bg-zinc-900">
            <p className="font-medium">{opp.name}</p>
            <p className="text-sm text-zinc-400">
              {opp.customer} • {opp.stage}
              {opp.priority ? ` • ${opp.priority}` : ''}
              {opp.estimatedValue ? ` • $${opp.estimatedValue}` : ''}
              {opp.dueDate ? ` • Due ${new Date(opp.dueDate).toLocaleDateString()}` : ''}
              {opp.salesRepName ? ` • Sales Rep: ${opp.salesRepName}` : ''}
              {opp.projectManagerName ? ` • PM: ${opp.projectManagerName}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
