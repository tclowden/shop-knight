import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

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

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const opportunities = await prisma.opportunity.findMany({
    include: { customer: true, salesRep: true, projectManager: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    opportunities.map((o: any) => ({
      id: o.id,
      name: o.name,
      customer: o.customer.name,
      customerId: o.customerId,
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
      description: o.description,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  if (!body?.name || (!body?.customerId && !body?.customer)) {
    return NextResponse.json({ error: 'name and customer/customerId required' }, { status: 400 });
  }

  let customer;
  if (body?.customerId) {
    customer = await prisma.customer.findUnique({ where: { id: String(body.customerId) } });
    if (!customer) {
      return NextResponse.json({ error: 'customer not found' }, { status: 404 });
    }
  } else {
    const customerName = String(body.customer).trim();
    customer =
      (await prisma.customer.findFirst({ where: { name: customerName } })) ||
      (await prisma.customer.create({ data: { name: customerName } }));
  }

  const opportunity = await prisma.opportunity.create({
    data: {
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
    },
    include: { customer: true, salesRep: true, projectManager: true },
  });

  return NextResponse.json(
    {
      id: opportunity.id,
      name: opportunity.name,
      customer: opportunity.customer.name,
      customerId: opportunity.customerId,
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
      description: opportunity.description,
    },
    { status: 201 }
  );
}
