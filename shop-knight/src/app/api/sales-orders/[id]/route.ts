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
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
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
      lines: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });

  if (!so) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
  return NextResponse.json(so);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.salesOrder.findFirst({ where: { id, companyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const body = await req.json();

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
      paymentTerms: body?.paymentTerms !== undefined ? String(body.paymentTerms || '') : undefined,
      downPaymentType: body?.downPaymentType !== undefined ? String(body.downPaymentType || '') : undefined,
      downPaymentValue: body?.downPaymentValue !== undefined ? toNumber(body.downPaymentValue) : undefined,
      salesRepId: body?.salesRepId !== undefined ? (body.salesRepId ? String(body.salesRepId) : null) : undefined,
      projectManagerId: body?.projectManagerId !== undefined ? (body.projectManagerId ? String(body.projectManagerId) : null) : undefined,
      designerId: body?.designerId !== undefined ? (body.designerId ? String(body.designerId) : null) : undefined,
    },
    include: {
      opportunity: { include: { customer: true } },
      status: true,
      salesRep: true,
      projectManager: true,
      designer: true,
      lines: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });

  return NextResponse.json(updated);
}
