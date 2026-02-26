import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES', 'OPERATIONS', 'PURCHASING']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const lines = await prisma.salesOrderLine.findMany({
    where: { salesOrderId: id },
    orderBy: { id: 'desc' },
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

  const line = await prisma.salesOrderLine.create({
    data: {
      salesOrderId: id,
      description: String(body.description),
      qty: Number(body.qty),
      unitPrice: Number(body.unitPrice),
      productId: body?.productId ? String(body.productId) : null,
    },
  });

  return NextResponse.json(line, { status: 201 });
}
