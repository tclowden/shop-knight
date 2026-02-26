import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function orderNumber() {
  return `SO-${Date.now().toString().slice(-6)}`;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

  const existing = await prisma.salesOrder.findFirst({ where: { sourceQuoteId: id } });
  if (existing) return NextResponse.json(existing);

  const so = await prisma.salesOrder.create({
    data: {
      opportunityId: quote.opportunityId,
      sourceQuoteId: quote.id,
      orderNumber: orderNumber(),
    },
  });

  await prisma.quote.update({ where: { id }, data: { status: 'ACCEPTED' } });
  await prisma.opportunity.update({ where: { id: quote.opportunityId }, data: { stage: 'WON' } });

  return NextResponse.json(so, { status: 201 });
}
