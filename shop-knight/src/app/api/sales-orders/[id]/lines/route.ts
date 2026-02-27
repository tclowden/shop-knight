import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const lines = await prisma.salesOrderLine.findMany({
    where: { salesOrderId: id },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(lines);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  if (!body?.description || !body?.qty || !body?.unitPrice) {
    return NextResponse.json({ error: 'description, qty, unitPrice required' }, { status: 400 });
  }

  const last = await prisma.salesOrderLine.findFirst({ where: { salesOrderId: id }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });

  const line = await prisma.salesOrderLine.create({
    data: {
      salesOrderId: id,
      description: String(body.description),
      qty: Number(body.qty),
      unitPrice: Number(body.unitPrice),
      sortOrder: (last?.sortOrder || 0) + 1,
      parentLineId: body?.parentLineId ? String(body.parentLineId) : null,
      collapsed: Boolean(body?.collapsed),
      productId: body?.productId ? String(body.productId) : null,
      attributeValues: body?.attributeValues && typeof body.attributeValues === 'object' ? body.attributeValues : null,
    },
  });

  return NextResponse.json(line, { status: 201 });
}
