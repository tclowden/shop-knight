import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; loadListId: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING', 'PROJECT_MANAGER']);
  if (!auth.ok) return auth.response;

  const { id, loadListId } = await params;
  const loadList = await prisma.loadList.findFirst({
    where: { id: loadListId, salesOrderId: id },
    include: {
      salesOrder: { select: { id: true, orderNumber: true, title: true, opportunity: { select: { name: true, customer: { select: { name: true } } } } } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!loadList) return NextResponse.json({ error: 'Load list not found' }, { status: 404 });
  return NextResponse.json(loadList);
}
