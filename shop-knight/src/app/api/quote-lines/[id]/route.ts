import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.quoteLine.update({
    where: { id },
    data: {
      description: body?.description !== undefined ? String(body.description) : undefined,
      qty: body?.qty !== undefined ? Number(body.qty) : undefined,
      unitPrice: body?.unitPrice !== undefined ? Number(body.unitPrice) : undefined,
      productId: body?.productId !== undefined ? (body.productId ? String(body.productId) : null) : undefined,
      taxRate: body?.taxRate !== undefined ? Number(body.taxRate) : undefined,
      attributeValues: body?.attributeValues !== undefined ? body.attributeValues : undefined,
    },
    include: { product: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['ADMIN', 'SALES']);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await prisma.quoteLine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
