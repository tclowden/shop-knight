import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const opportunityId = searchParams.get('opportunityId') || undefined;

  const salesOrders = await prisma.salesOrder.findMany({
    where: { opportunityId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(salesOrders);
}
