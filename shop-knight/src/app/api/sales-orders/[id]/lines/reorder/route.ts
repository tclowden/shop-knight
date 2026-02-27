import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const items = Array.isArray(body?.items) ? body.items : [];

  await prisma.$transaction(
    items.map((item: { id: string; sortOrder: number; parentLineId?: string | null }) =>
      prisma.salesOrderLine.update({
        where: { id: item.id },
        data: {
          sortOrder: Number(item.sortOrder),
          parentLineId: item.parentLineId ? String(item.parentLineId) : null,
        },
      })
    )
  );

  const lines = await prisma.salesOrderLine.findMany({ where: { salesOrderId: id }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  return NextResponse.json(lines);
}
