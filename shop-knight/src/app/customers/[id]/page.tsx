"use client";

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { ModuleNotesTasks } from '@/components/module-notes-tasks';

type Customer = { id: string; name: string; email: string | null; phone: string | null };
type CustomerContact = { id: string; name: string; email: string | null; phone: string | null; title: string | null };

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [item, setItem] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTitle, setContactTitle] = useState('');

  async function load(customerId: string) {
    const [customerRes, contactsRes] = await Promise.all([
      fetch(`/api/customers/${customerId}`),
      fetch(`/api/customers/${customerId}/contacts`),
    ]);

    if (customerRes.ok) setItem(await customerRes.json());
    if (contactsRes.ok) setContacts(await contactsRes.json());
  }

  function resetContactForm() {
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactTitle('');
  }

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    const res = await fetch(`/api/customers/${id}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        title: contactTitle,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      window.alert(typeof payload?.error === 'string' ? payload.error : 'Failed to create contact');
      return;
    }

    resetContactForm();
    setShowCreateContactModal(false);
    await load(id);
  }

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      load(p.id);
    });
  }, [params]);

  if (!item) return <main className="mx-auto max-w-5xl p-8">Loading customer...</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Customer: {item.name}</h1>
      <p className="text-sm text-zinc-400">{item.email || '—'} • {item.phone || '—'}</p>
      <Nav />

      <section className="mb-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">Contacts</h2>
          <button type="button" onClick={() => setShowCreateContactModal(true)} className="inline-flex h-10 items-center rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-600">+ Add Contact</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#eaf6fd] text-slate-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{contact.name}</td>
                  <td className="px-3 py-2">{contact.title || '—'}</td>
                  <td className="px-3 py-2">{contact.email || '—'}</td>
                  <td className="px-3 py-2">{contact.phone || '—'}</td>
                </tr>
              ))}
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">No contacts yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ModuleNotesTasks entityType="CUSTOMER" entityId={id} />

      {showCreateContactModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Customer Contact</h3>
              <button type="button" onClick={() => { setShowCreateContactModal(false); resetContactForm(); }} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
            </div>
            <form onSubmit={createContact} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="field" required />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
                <input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="field" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span>
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateContactModal(false); resetContactForm(); }} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">Cancel</button>
                <button className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Create Contact</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
