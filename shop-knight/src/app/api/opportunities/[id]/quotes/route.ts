import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function quoteNumber() {
  return `Q-${Date.now().toString().slice(-6)}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotes = await prisma.quote.findMany({
    where: { opportunityId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(quotes);
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const opportunity = await prisma.opportunity.findUnique({ where: { id } });
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });

  const quote = await prisma.quote.create({
    data: {
      opportunityId: id,
      quoteNumber: quoteNumber(),
      status: 'DRAFT',
    },
  });

  await prisma.opportunity.update({
    where: { id },
    data: { stage: 'QUOTED' },
  });

  return NextResponse.json(quote, { status: 201 });
}
