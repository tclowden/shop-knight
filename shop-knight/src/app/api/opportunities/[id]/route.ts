import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toDate(value: unknown) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const opportunity = await prisma.opportunity.findFirst({
    where: withCompany(companyId, { id }),
    include: { customer: true, salesRep: true, projectManager: true, department: true },
  });

  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  return NextResponse.json({
    id: opportunity.id,
    name: opportunity.name,
    stage: opportunity.stage,
    customerId: opportunity.customerId,
    customer: opportunity.customer.name,
    source: opportunity.source,
    priority: opportunity.priority,
    estimatedValue: opportunity.estimatedValue,
    probability: opportunity.probability,
    expectedCloseDate: opportunity.expectedCloseDate,
    dueDate: opportunity.dueDate,
    inHandDate: opportunity.inHandDate,
    salesRepId: opportunity.salesRepId,
    salesRepName: opportunity.salesRep?.name ?? null,
    projectManagerId: opportunity.projectManagerId,
    projectManagerName: opportunity.projectManager?.name ?? null,
    description: opportunity.description,
    departmentId: opportunity.departmentId,
    departmentName: opportunity.department?.name ?? null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  let customerId: string | undefined;
  if (body?.customerId || body?.customer) {
    if (body?.customerId) {
      const existingCustomer = await prisma.customer.findFirst({ where: withCompany(companyId, { id: String(body.customerId) }) });
      if (!existingCustomer) return NextResponse.json({ error: 'customer not found' }, { status: 404 });
      customerId = existingCustomer.id;
    } else {
      const customerName = String(body.customer || '').trim();
      if (customerName) {
        const c = (await prisma.customer.findFirst({ where: withCompany(companyId, { name: customerName }) })) || (await prisma.customer.create({ data: { companyId, name: customerName } }));
        customerId = c.id;
      }
    }
  }

  const existing = await prisma.opportunity.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const updated = await prisma.opportunity.update({
    where: { id },
    data: {
      name: body?.name !== undefined ? String(body.name || '') : undefined,
      customerId,
      source: body?.source !== undefined ? String(body.source || '') : undefined,
      priority: body?.priority !== undefined ? String(body.priority || '') : undefined,
      estimatedValue: body?.estimatedValue !== undefined ? toNumber(body.estimatedValue) : undefined,
      probability: body?.probability !== undefined ? toNumber(body.probability) : undefined,
      expectedCloseDate: body?.expectedCloseDate !== undefined ? toDate(body.expectedCloseDate) : undefined,
      dueDate: body?.dueDate !== undefined ? toDate(body.dueDate) : undefined,
      inHandDate: body?.inHandDate !== undefined ? toDate(body.inHandDate) : undefined,
      salesRepId: body?.salesRepId !== undefined ? (body.salesRepId ? String(body.salesRepId) : null) : undefined,
      projectManagerId: body?.projectManagerId !== undefined ? (body.projectManagerId ? String(body.projectManagerId) : null) : undefined,
      departmentId: body?.departmentId !== undefined ? (body.departmentId ? String(body.departmentId) : null) : undefined,
      description: body?.description !== undefined ? String(body.description || '') : undefined,
    },
    include: { customer: true, salesRep: true, projectManager: true, department: true },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    stage: updated.stage,
    customerId: updated.customerId,
    customer: updated.customer.name,
    source: updated.source,
    priority: updated.priority,
    estimatedValue: updated.estimatedValue,
    probability: updated.probability,
    expectedCloseDate: updated.expectedCloseDate,
    dueDate: updated.dueDate,
    inHandDate: updated.inHandDate,
    salesRepId: updated.salesRepId,
    salesRepName: updated.salesRep?.name ?? null,
    projectManagerId: updated.projectManagerId,
    projectManagerName: updated.projectManager?.name ?? null,
    departmentId: updated.departmentId,
    departmentName: updated.department?.name ?? null,
    description: updated.description,
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.opportunity.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  await prisma.opportunity.update({
    where: { id },
    data: { source: 'ARCHIVED' },
  });

  return NextResponse.json({ ok: true, archived: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'restore') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.opportunity.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  await prisma.opportunity.update({ where: { id }, data: { source: null } });
  return NextResponse.json({ ok: true, restored: true });
}
