import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';

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
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const so = await prisma.salesOrder.findFirst({
    where: { id, companyId },
    include: {
      opportunity: { include: { customer: true } },
      status: true,
      salesRep: true,
      projectManager: true,
      designer: true,
      department: true,
      lines: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });

  if (!so) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  let linkedTrips: Array<unknown> = [];
  try {
    linkedTrips = await prisma.trip.findMany({
      where: { companyId, salesOrderRef: so.orderNumber },
      include: { travelers: { include: { traveler: true } } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  } catch {
    linkedTrips = [];
  }

  return NextResponse.json({ ...so, linkedTrips });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'SALES_REP', 'OPERATIONS', 'PROJECT_MANAGER', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.salesOrder.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const body = await req.json();

  let opportunityId: string | null | undefined;
  if (body?.opportunityId !== undefined) {
    if (!body.opportunityId) {
      opportunityId = null;
    } else {
      const nextOpportunity = await prisma.opportunity.findFirst({ where: { id: String(body.opportunityId), companyId } });
      opportunityId = nextOpportunity?.id || null;
    }
  }

  let statusId: string | undefined;
  if (body?.statusName !== undefined) {
    const statusName = String(body.statusName || '').trim();
    if (statusName) {
      const status = await prisma.salesOrderStatus.upsert({
        where: { companyId_name: { companyId, name: statusName } },
        update: { active: true },
        create: { companyId, name: statusName, active: true },
      });
      statusId = status.id;
    } else {
      statusId = undefined;
    }
  }

  const updated = await prisma.salesOrder.update({
    where: { id },
    data: {
      opportunityId,
      title: body?.title !== undefined ? String(body.title || '') : undefined,
      statusId,
      primaryCustomerContact: body?.primaryCustomerContact !== undefined ? String(body.primaryCustomerContact || '') : undefined,
      customerInvoiceContact: body?.customerInvoiceContact !== undefined ? String(body.customerInvoiceContact || '') : undefined,
      billingAddress: body?.billingAddress !== undefined ? String(body.billingAddress || '') : undefined,
      billingAttentionTo: body?.billingAttentionTo !== undefined ? String(body.billingAttentionTo || '') : undefined,
      shippingAddress: body?.shippingAddress !== undefined ? String(body.shippingAddress || '') : undefined,
      shippingAttentionTo: body?.shippingAttentionTo !== undefined ? String(body.shippingAttentionTo || '') : undefined,
      installAddress: body?.installAddress !== undefined ? String(body.installAddress || '') : undefined,
      shippingMethod: body?.shippingMethod !== undefined ? String(body.shippingMethod || '') : undefined,
      shippingTracking: body?.shippingTracking !== undefined ? String(body.shippingTracking || '') : undefined,
      salesOrderDate: body?.salesOrderDate !== undefined ? toDate(body.salesOrderDate) : undefined,
      dueDate: body?.dueDate !== undefined ? toDate(body.dueDate) : undefined,
      installDate: body?.installDate !== undefined ? toDate(body.installDate) : undefined,
      shippingDate: body?.shippingDate !== undefined ? toDate(body.shippingDate) : undefined,
      earlyBirdDiscountDate: body?.earlyBirdDiscountDate !== undefined ? toDate(body.earlyBirdDiscountDate) : undefined,
      advancedReceivingDeadline: body?.advancedReceivingDeadline !== undefined ? toDate(body.advancedReceivingDeadline) : undefined,
      shipFromRoarkDate: body?.shipFromRoarkDate !== undefined ? toDate(body.shipFromRoarkDate) : undefined,
      travelToSiteStart: body?.travelToSiteStart !== undefined ? toDate(body.travelToSiteStart) : undefined,
      travelToSiteEnd: body?.travelToSiteEnd !== undefined ? toDate(body.travelToSiteEnd) : undefined,
      outboundShippingFromShowDate: body?.outboundShippingFromShowDate !== undefined ? toDate(body.outboundShippingFromShowDate) : undefined,
      estimatedInvoiceDate: body?.estimatedInvoiceDate !== undefined ? toDate(body.estimatedInvoiceDate) : undefined,
      paymentTerms: body?.paymentTerms !== undefined ? String(body.paymentTerms || '') : undefined,
      downPaymentType: body?.downPaymentType !== undefined ? String(body.downPaymentType || '') : undefined,
      downPaymentValue: body?.downPaymentValue !== undefined ? toNumber(body.downPaymentValue) : undefined,
      salesRepId: body?.salesRepId !== undefined ? (body.salesRepId ? String(body.salesRepId) : null) : undefined,
      projectManagerId: body?.projectManagerId !== undefined ? (body.projectManagerId ? String(body.projectManagerId) : null) : undefined,
      designerId: body?.designerId !== undefined ? (body.designerId ? String(body.designerId) : null) : undefined,
      departmentId: body?.departmentId !== undefined ? (body.departmentId ? String(body.departmentId) : null) : undefined,
    },
    include: {
      opportunity: { include: { customer: true } },
      status: true,
      salesRep: true,
      projectManager: true,
      designer: true,
      department: true,
      lines: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });

  let linkedTrips: Array<unknown> = [];
  try {
    linkedTrips = await prisma.trip.findMany({
      where: { companyId, salesOrderRef: updated.orderNumber },
      include: { travelers: { include: { traveler: true } } },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  } catch {
    linkedTrips = [];
  }

  return NextResponse.json({ ...updated, linkedTrips });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.salesOrder.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const archivedStatus = await prisma.salesOrderStatus.upsert({
    where: { companyId_name: { companyId, name: 'Archived' } },
    update: { active: true },
    create: { companyId, name: 'Archived', active: true },
  });

  await prisma.salesOrder.update({
    where: { id },
    data: { statusId: archivedStatus.id },
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
  const existing = await prisma.salesOrder.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const restoredStatus = await prisma.salesOrderStatus.upsert({
    where: { companyId_name: { companyId, name: 'New' } },
    update: { active: true },
    create: { companyId, name: 'New', active: true },
  });

  await prisma.salesOrder.update({ where: { id }, data: { statusId: restoredStatus.id } });
  return NextResponse.json({ ok: true, restored: true });
}
