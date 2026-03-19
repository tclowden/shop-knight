"use client";

import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';

type SalesOrder = {
  id: string;
  orderNumber: string;
  title?: string | null;
  status?: string | null;
  customer: string;
  departmentName?: string | null;
  projectManagerName?: string | null;
  earlyBirdDiscountDate?: string | null;
  advancedReceivingDeadline?: string | null;
  shipFromRoarkDate?: string | null;
  outboundShippingFromShowDate?: string | null;
  estimatedInvoiceDate?: string | null;
  travelToSiteStart?: string | null;
  travelToSiteEnd?: string | null;
};

type DateType = 'EARLY_BIRD' | 'ADV_RECEIVING' | 'SHIP_ROARK' | 'OUTBOUND_SHOW' | 'EST_INVOICE' | 'TRAVEL_WINDOW';

type CalendarEvent = {
  id: string;
  date: string;
  label: string;
  orderId: string;
  orderNumber: string;
  title: string;
  kind: 'MILESTONE' | 'RANGE';
  endDate?: string;
  dateType: DateType;
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function SalesOrderCalendarPage() {
  const [items, setItems] = useState<SalesOrder[]>([]);
  const [dateTypeFilter, setDateTypeFilter] = useState<'ALL' | DateType>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [projectManagerFilter, setProjectManagerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  async function load() {
    const res = await fetch('/api/sales-orders?archived=active');
    if (!res.ok) return;
    setItems(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const departments = useMemo(() => ['ALL', ...Array.from(new Set(items.map((i) => i.departmentName || 'Unassigned'))).sort()], [items]);
  const projectManagers = useMemo(() => ['ALL', ...Array.from(new Set(items.map((i) => i.projectManagerName || 'Unassigned'))).sort()], [items]);
  const statuses = useMemo(() => ['ALL', ...Array.from(new Set(items.map((i) => i.status || 'Unknown'))).sort()], [items]);

  const filteredOrders = useMemo(() => {
    return items.filter((so) => {
      const dept = so.departmentName || 'Unassigned';
      const pm = so.projectManagerName || 'Unassigned';
      const status = so.status || 'Unknown';
      if (departmentFilter !== 'ALL' && dept !== departmentFilter) return false;
      if (projectManagerFilter !== 'ALL' && pm !== projectManagerFilter) return false;
      if (statusFilter !== 'ALL' && status !== statusFilter) return false;
      return true;
    });
  }, [items, departmentFilter, projectManagerFilter, statusFilter]);

  const events = useMemo(() => {
    const out: CalendarEvent[] = [];
    for (const so of filteredOrders) {
      const title = so.title || so.customer;
      if (so.earlyBirdDiscountDate) out.push({ id: `${so.id}-ebd`, date: so.earlyBirdDiscountDate, label: 'Early Bird Discount Date', orderId: so.id, orderNumber: so.orderNumber, title, kind: 'MILESTONE', dateType: 'EARLY_BIRD' });
      if (so.advancedReceivingDeadline) out.push({ id: `${so.id}-ard`, date: so.advancedReceivingDeadline, label: 'Advanced Receiving Deadline', orderId: so.id, orderNumber: so.orderNumber, title, kind: 'MILESTONE', dateType: 'ADV_RECEIVING' });
      if (so.shipFromRoarkDate) out.push({ id: `${so.id}-sfr`, date: so.shipFromRoarkDate, label: 'Shipping Leaves Roark', orderId: so.id, orderNumber: so.orderNumber, title, kind: 'MILESTONE', dateType: 'SHIP_ROARK' });
      if (so.outboundShippingFromShowDate) out.push({ id: `${so.id}-osf`, date: so.outboundShippingFromShowDate, label: 'Outbound Shipping from Show', orderId: so.id, orderNumber: so.orderNumber, title, kind: 'MILESTONE', dateType: 'OUTBOUND_SHOW' });
      if (so.estimatedInvoiceDate) out.push({ id: `${so.id}-eid`, date: so.estimatedInvoiceDate, label: 'Estimated Invoice Date', orderId: so.id, orderNumber: so.orderNumber, title, kind: 'MILESTONE', dateType: 'EST_INVOICE' });
      if (so.travelToSiteStart && so.travelToSiteEnd) {
        out.push({ id: `${so.id}-travel`, date: so.travelToSiteStart, endDate: so.travelToSiteEnd, label: 'Travel To/From Site', orderId: so.id, orderNumber: so.orderNumber, title, kind: 'RANGE', dateType: 'TRAVEL_WINDOW' });
      }
    }
    return dateTypeFilter === 'ALL' ? out : out.filter((e) => e.dateType === dateTypeFilter);
  }, [filteredOrders, dateTypeFilter]);

  const calendarDays = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthCursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const start = parseDate(ev.date);
      if (!start) continue;
      const end = ev.kind === 'RANGE' ? parseDate(ev.endDate) || start : start;
      const cur = new Date(start);
      while (cur <= end) {
        const key = ymd(cur);
        const arr = map.get(key) || [];
        arr.push(ev);
        map.set(key, arr);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <main className="mx-auto max-w-7xl bg-[#f5f7fa] p-8 text-slate-800">
      <h1 className="text-3xl font-semibold tracking-tight">Sales Order Calendar</h1>
      <p className="text-sm text-slate-500">Milestones and travel windows for sales orders.</p>
      <Nav />

      <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-4">
        <select value={dateTypeFilter} onChange={(e) => setDateTypeFilter(e.target.value as 'ALL' | DateType)} className="field h-10">
          <option value="ALL">All Date Types</option>
          <option value="EARLY_BIRD">Early Bird Discount Date</option>
          <option value="ADV_RECEIVING">Advanced Receiving Deadline</option>
          <option value="SHIP_ROARK">Shipping Leaves Roark</option>
          <option value="OUTBOUND_SHOW">Outbound Shipping from Show</option>
          <option value="EST_INVOICE">Estimated Invoice Date</option>
          <option value="TRAVEL_WINDOW">Travel To/From Site (Range)</option>
        </select>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="field h-10">
          {departments.map((d) => <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>)}
        </select>
        <select value={projectManagerFilter} onChange={(e) => setProjectManagerFilter(e.target.value)} className="field h-10">
          {projectManagers.map((pm) => <option key={pm} value={pm}>{pm === 'ALL' ? 'All Project Managers' : pm}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field h-10">
          {statuses.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm">← Prev</button>
        <p className="min-w-48 text-center font-semibold">{monthLabel}</p>
        <button onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm">Next →</button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-slate-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (<div key={d} className="p-2 text-center">{d}</div>))}</div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((d) => {
          const key = ymd(d);
          const dayEvents = eventsByDay.get(key) || [];
          const inMonth = d.getMonth() === monthCursor.getMonth();
          return (
            <div key={key} className={`min-h-28 rounded-lg border p-2 ${inMonth ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
              <p className="mb-1 text-xs font-medium">{d.getDate()}</p>
              <div className="space-y-1">
                {dayEvents.slice(0, 4).map((ev) => (
                  <a key={`${ev.id}-${key}`} href={`/sales/orders/${ev.orderId}`} className={`block rounded px-2 py-1 text-left text-[11px] ${ev.kind === 'RANGE' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                    <p className="truncate font-medium">{ev.orderNumber}</p>
                    <p className="truncate">{ev.label}</p>
                  </a>
                ))}
                {dayEvents.length > 4 ? <p className="text-[10px] text-slate-500">+{dayEvents.length - 4} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
