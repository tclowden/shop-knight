import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const opportunityId = searchParams.get('opportunityId') || undefined;

  const salesOrders = await prisma.salesOrder.findMany({
    where: { opportunityId },
    include: {
      opportunity: {
        include: { customer: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    salesOrders.map((so) => ({
      id: so.id,
      orderNumber: so.orderNumber,
      sourceQuoteId: so.sourceQuoteId,
      createdAt: so.createdAt,
      opportunityId: so.opportunityId,
      opportunity: so.opportunity.name,
      customer: so.opportunity.customer.name,
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

  const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) {
    return NextResponse.json({ error: 'opportunity not found' }, { status: 404 });
  }

  if (sourceQuoteId) {
    const quote = await prisma.quote.findUnique({ where: { id: sourceQuoteId } });
    if (!quote) {
      return NextResponse.json({ error: 'source quote not found' }, { status: 404 });
    }
  }

  try {
    const created = await prisma.salesOrder.create({
      data: {
        orderNumber,
        opportunityId,
        sourceQuoteId,
        lines: initialLine
          ? {
              create: {
                description: String(initialLine.description || 'Line item'),
                qty: Number(initialLine.qty || 1),
                unitPrice: Number(initialLine.unitPrice || 0),
                productId: initialLine.productId ? String(initialLine.productId) : null,
                attributeValues:
                  initialLine.attributeValues && typeof initialLine.attributeValues === 'object'
                    ? initialLine.attributeValues
                    : null,
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
