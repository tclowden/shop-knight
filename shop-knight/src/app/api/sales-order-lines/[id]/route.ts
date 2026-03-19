import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'SALES_REP', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.salesOrderLine.findFirst({ where: { id, salesOrder: { companyId } }, select: { id: true, unitPrice: true, priceLocked: true } });
  if (!existing) return NextResponse.json({ error: 'Sales order line not found' }, { status: 404 });

  const body = await req.json();

  const requestedUnitPrice = body?.unitPrice !== undefined ? Number(body.unitPrice) : undefined;
  const requestedPriceLocked = body?.priceLocked !== undefined ? Boolean(body.priceLocked) : undefined;
  if (
    existing.priceLocked
    && requestedUnitPrice !== undefined
    && Number(existing.unitPrice) !== requestedUnitPrice
    && requestedPriceLocked !== false
  ) {
    return NextResponse.json({ error: 'Line price is locked. Unlock it before changing unit price.' }, { status: 400 });
  }

  const updated = await prisma.salesOrderLine.update({
    where: { id },
    data: {
      description: body?.description !== undefined ? String(body.description) : undefined,
      qty: body?.qty !== undefined ? Number(body.qty) : undefined,
      unitPrice: requestedUnitPrice,
      priceLocked: requestedPriceLocked,
      productId: body?.productId !== undefined ? (body.productId ? String(body.productId) : null) : undefined,
      sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      parentLineId: body?.parentLineId !== undefined ? (body.parentLineId ? String(body.parentLineId) : null) : undefined,
      collapsed: body?.collapsed !== undefined ? Boolean(body.collapsed) : undefined,
      attributeValues: body?.attributeValues !== undefined ? body.attributeValues : undefined,
    },
    include: { product: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'SALES', 'SALES_REP', 'OPERATIONS', 'PROJECT_MANAGER', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await params;
  const existing = await prisma.salesOrderLine.findFirst({ where: { id, salesOrder: { companyId } }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Sales order line not found' }, { status: 404 });

  await prisma.salesOrderLine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
