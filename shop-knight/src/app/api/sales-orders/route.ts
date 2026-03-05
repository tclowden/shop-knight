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

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const opportunityId = searchParams.get('opportunityId') || undefined;

  const salesOrders = await prisma.salesOrder.findMany({
    where: { opportunityId },
    include: {
      opportunity: { include: { customer: true } },
      status: true,
      salesRep: true,
      projectManager: true,
      designer: true,
    },
    orderBy: { orderNumber: 'asc' },
  });

  return NextResponse.json(
    salesOrders.map((so: any) => ({
      id: so.id,
      orderNumber: so.orderNumber,
      title: so.title,
      status: so.status?.name ?? null,
      sourceQuoteId: so.sourceQuoteId,
      createdAt: so.createdAt,
      opportunityId: so.opportunityId,
      opportunity: so.opportunity.name,
      customer: so.opportunity.customer.name,
      salesOrderDate: so.salesOrderDate,
      dueDate: so.dueDate,
      installDate: so.installDate,
      shippingDate: so.shippingDate,
      paymentTerms: so.paymentTerms,
      downPaymentType: so.downPaymentType,
      downPaymentValue: so.downPaymentValue,
      salesRepName: so.salesRep?.name ?? null,
      projectManagerName: so.projectManager?.name ?? null,
      designerName: so.designer?.name ?? null,
    }))
  );
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const orderNumber = String(body?.orderNumber || '').trim();
  const opportunityId = String(body?.opportunityId || '').trim();
  const sourceQuoteId = body?.sourceQuoteId ? String(body.sourceQuoteId).trim() : null;
  const initialLine = body?.initialLine && typeof body.initialLine === 'object' ? body.initialLine : null;

  if (!orderNumber || !opportunityId) {
    return NextResponse.json({ error: 'orderNumber and opportunityId are required' }, { status: 400 });
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: { customer: true },
  });
  if (!opportunity) return NextResponse.json({ error: 'opportunity not found' }, { status: 404 });

  if (sourceQuoteId) {
    const quote = await prisma.quote.findUnique({ where: { id: sourceQuoteId } });
    if (!quote) return NextResponse.json({ error: 'source quote not found' }, { status: 404 });
  }

  const statusName = String(body?.status || 'New').trim();
  const status = await prisma.salesOrderStatus.upsert({
    where: { name: statusName },
    update: { active: true },
    create: { name: statusName, active: true },
  });

  try {
    const created = await prisma.salesOrder.create({
      data: {
        orderNumber,
        opportunityId,
        sourceQuoteId,
        title: body?.title ? String(body.title) : null,
        statusId: status.id,
        primaryCustomerContact: body?.primaryCustomerContact ? String(body.primaryCustomerContact) : null,
        customerInvoiceContact: body?.customerInvoiceContact ? String(body.customerInvoiceContact) : null,
        billingAddress: body?.billingAddress ? String(body.billingAddress) : null,
        billingAttentionTo: body?.billingAttentionTo ? String(body.billingAttentionTo) : null,
        shippingAddress: body?.shippingAddress ? String(body.shippingAddress) : null,
        shippingAttentionTo: body?.shippingAttentionTo ? String(body.shippingAttentionTo) : null,
        installAddress: body?.installAddress ? String(body.installAddress) : null,
        shippingMethod: body?.shippingMethod ? String(body.shippingMethod) : null,
        shippingTracking: body?.shippingTracking ? String(body.shippingTracking) : null,
        salesOrderDate: toDate(body?.salesOrderDate),
        dueDate: toDate(body?.dueDate),
        installDate: toDate(body?.installDate),
        shippingDate: toDate(body?.shippingDate),
        paymentTerms: body?.paymentTerms ? String(body.paymentTerms) : opportunity.customer.paymentTerms ?? null,
        downPaymentType: body?.downPaymentType ? String(body.downPaymentType) : null,
        downPaymentValue: toNumber(body?.downPaymentValue),
        salesRepId: body?.salesRepId ? String(body.salesRepId) : null,
        projectManagerId: body?.projectManagerId ? String(body.projectManagerId) : null,
        designerId: body?.designerId ? String(body.designerId) : null,
        lines: initialLine
          ? {
              create: {
                description: String(initialLine.description || 'Line item'),
                qty: Number(initialLine.qty || 1),
                unitPrice: Number(initialLine.unitPrice || 0),
                productId: initialLine.productId ? String(initialLine.productId) : null,
                attributeValues: initialLine.attributeValues && typeof initialLine.attributeValues === 'object' ? initialLine.attributeValues : null,
              },
            }
          : undefined,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'order number already exists' }, { status: 409 });
  }
}
