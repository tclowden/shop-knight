import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      opportunity: { include: { customer: true } },
      lines: { include: { product: true }, orderBy: { id: 'asc' } },
    },
  });

  if (!so) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });
  return NextResponse.json(so);
}
