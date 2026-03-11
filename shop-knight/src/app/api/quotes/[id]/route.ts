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
  const quote = await prisma.quote.findFirst({
    where: withCompany(companyId, { id }),
    include: {
      opportunity: { include: { customer: true } },
      salesRep: true,
      projectManager: true,
      department: true,
      lines: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  return NextResponse.json(quote);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const body = await req.json();

  let opportunityId: string | undefined;
  if (body?.opportunityId !== undefined) {
    if (!body.opportunityId) {
      return NextResponse.json({ error: 'opportunityId cannot be empty' }, { status: 400 });
    }
    const nextOpportunity = await prisma.opportunity.findFirst({ where: withCompany(companyId, { id: String(body.opportunityId) }) });
    if (!nextOpportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    opportunityId = nextOpportunity.id;
  }

  const existing = await prisma.quote.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      opportunityId,
      title: body?.title !== undefined ? String(body.title || '') : undefined,
      description: body?.description !== undefined ? String(body.description || '') : undefined,
      workflowState: body?.workflowState !== undefined ? String(body.workflowState || 'draft') : undefined,
      status: body?.status !== undefined ? body.status : undefined,
      expiryDate: body?.expiryDate !== undefined ? toDate(body.expiryDate) : undefined,
      txnDate: body?.txnDate !== undefined ? toDate(body.txnDate) : undefined,
      quoteDate: body?.quoteDate !== undefined ? toDate(body.quoteDate) : undefined,
      dueDate: body?.dueDate !== undefined ? toDate(body.dueDate) : undefined,
      customerContactRole: body?.customerContactRole !== undefined ? String(body.customerContactRole || '') : undefined,
      billingAddress: body?.billingAddress !== undefined ? String(body.billingAddress || '') : undefined,
      billingAttentionTo: body?.billingAttentionTo !== undefined ? String(body.billingAttentionTo || '') : undefined,
      shippingAddress: body?.shippingAddress !== undefined ? String(body.shippingAddress || '') : undefined,
      shippingAttentionTo: body?.shippingAttentionTo !== undefined ? String(body.shippingAttentionTo || '') : undefined,
      installAddress: body?.installAddress !== undefined ? String(body.installAddress || '') : undefined,
      salesRepId: body?.salesRepId !== undefined ? (body.salesRepId ? String(body.salesRepId) : null) : undefined,
      projectManagerId: body?.projectManagerId !== undefined ? (body.projectManagerId ? String(body.projectManagerId) : null) : undefined,
      departmentId: body?.departmentId !== undefined ? (body.departmentId ? String(body.departmentId) : null) : undefined,
      customerPoNumber: body?.customerPoNumber !== undefined ? String(body.customerPoNumber || '') : undefined,
      totalPriceInDollars: body?.totalPriceInDollars !== undefined ? toNumber(body.totalPriceInDollars) : undefined,
      totalTaxInDollars: body?.totalTaxInDollars !== undefined ? toNumber(body.totalTaxInDollars) : undefined,
      totalPriceWithTaxInDollars: body?.totalPriceWithTaxInDollars !== undefined ? toNumber(body.totalPriceWithTaxInDollars) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.quote.findFirst({ where: withCompany(companyId, { id }), select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const linkedSalesOrders = await prisma.salesOrder.count({ where: withCompany(companyId, { sourceQuoteId: id }) });
  if (linkedSalesOrders > 0) {
    return NextResponse.json({ error: 'Cannot archive quote with linked sales orders' }, { status: 409 });
  }

  await prisma.quote.update({
    where: { id },
    data: {
      workflowState: 'archived',
    },
  });

  return NextResponse.json({ ok: true, archived: true });
}
