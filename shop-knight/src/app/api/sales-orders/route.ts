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
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(salesOrders);
}
