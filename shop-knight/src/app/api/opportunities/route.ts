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

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const opportunities = await prisma.opportunity.findMany({
    where: withCompany(companyId, archivedMode === 'only'
      ? { source: 'ARCHIVED' }
      : archivedMode === 'all'
        ? {}
        : {
            OR: [
              { source: null },
              { source: { not: 'ARCHIVED' } },
            ],
          }),
    include: { customer: true, salesRep: true, projectManager: true, department: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    opportunities.map((o) => ({
      id: o.id,
      name: o.name,
      customer: o.customer.name,
      customerId: o.customerId,
      customerAdditionalFeePercent: o.customer.additionalFeePercent,
      stage: o.stage,
      source: o.source,
      priority: o.priority,
      estimatedValue: o.estimatedValue,
      probability: o.probability,
      expectedCloseDate: o.expectedCloseDate,
      dueDate: o.dueDate,
      inHandDate: o.inHandDate,
      salesRepId: o.salesRepId,
      salesRepName: o.salesRep?.name ?? null,
      projectManagerId: o.projectManagerId,
      projectManagerName: o.projectManager?.name ?? null,
      departmentId: o.departmentId,
      departmentName: o.department?.name ?? null,
      description: o.description,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  if (!body?.name || (!body?.customerId && !body?.customer)) {
    return NextResponse.json({ error: 'name and customer/customerId required' }, { status: 400 });
  }

  const sessionUserId = (auth.session.user as { id?: string } | undefined)?.id;
  const creator = sessionUserId ? await prisma.user.findUnique({ where: { id: sessionUserId }, select: { departmentId: true } }) : null;

  let customer;
  if (body?.customerId) {
    customer = await prisma.customer.findFirst({ where: withCompany(companyId, { id: String(body.customerId) }) });
    if (!customer) {
      return NextResponse.json({ error: 'customer not found' }, { status: 404 });
    }
  } else {
    const customerName = String(body.customer).trim();
    customer =
      (await prisma.customer.findFirst({ where: withCompany(companyId, { name: customerName }) })) ||
      (await prisma.customer.create({ data: { companyId, name: customerName } }));
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      companyId,
      name: String(body.name).trim(),
      customerId: customer.id,
      description: body?.description ? String(body.description) : null,
      source: body?.source ? String(body.source) : null,
      priority: body?.priority ? String(body.priority) : null,
      expectedCloseDate: toDate(body?.expectedCloseDate),
      probability: toNumber(body?.probability),
      estimatedValue: toNumber(body?.estimatedValue),
      customerPoNumber: body?.customerPoNumber ? String(body.customerPoNumber) : null,
      customerPoDate: toDate(body?.customerPoDate),
      dueDate: toDate(body?.dueDate),
      inHandDate: toDate(body?.inHandDate),
      salesRepId: body?.salesRepId ? String(body.salesRepId) : null,
      projectManagerId: body?.projectManagerId ? String(body.projectManagerId) : null,
      departmentId: body?.departmentId ? String(body.departmentId) : (creator?.departmentId || null),
    },
    include: { customer: true, salesRep: true, projectManager: true, department: true },
  });

  return NextResponse.json(
    {
      id: opportunity.id,
      name: opportunity.name,
      customer: opportunity.customer.name,
      customerId: opportunity.customerId,
      customerAdditionalFeePercent: opportunity.customer.additionalFeePercent,
      stage: opportunity.stage,
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
      departmentId: opportunity.departmentId,
      departmentName: opportunity.department?.name ?? null,
      description: opportunity.description,
    },
    { status: 201 }
  );
}
