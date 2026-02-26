import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const quotes = await prisma.quote.findMany({
    include: {
      opportunity: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    quotes.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      opportunity: q.opportunity.name,
      customer: q.opportunity.customer.name,
      createdAt: q.createdAt,
    }))
  );
}
