import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SALES_REP', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id } = await ctx.params;

  const rows = await prisma.inventoryReservation.findMany({
    where: withCompany(companyId, { salesOrderId: id, active: true }),
    include: { inventoryItem: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireRoles(['SALES_REP', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { id: salesOrderId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const inventoryItemId = String(body?.inventoryItemId || '');
  const quantity = Number(body?.quantity || 0);
  const reservedFrom = new Date(String(body?.reservedFrom || ''));
  const reservedTo = new Date(String(body?.reservedTo || ''));

  if (!inventoryItemId || !Number.isFinite(quantity) || quantity <= 0 || Number.isNaN(reservedFrom.getTime()) || Number.isNaN(reservedTo.getTime()) || reservedFrom > reservedTo) {
    return NextResponse.json({ error: 'inventoryItemId, quantity (>0), reservedFrom, reservedTo are required' }, { status: 400 });
  }

  const item = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id: inventoryItemId, active: true }) });
  if (!item) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

  const overlapReservations = await prisma.inventoryReservation.findMany({
    where: withCompany(companyId, {
      inventoryItemId,
      active: true,
      reservedFrom: { lte: reservedTo },
      reservedTo: { gte: reservedFrom },
    }),
    select: { quantity: true },
  });

  const reservedQty = overlapReservations.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const availableQty = Number(item.totalQty || 0) - reservedQty;

  if (quantity > availableQty) {
    return NextResponse.json({ error: `Insufficient availability. Requested ${quantity}, available ${availableQty}.` }, { status: 400 });
  }

  const created = await prisma.inventoryReservation.create({
    data: {
      companyId,
      inventoryItemId,
      salesOrderId,
      salesOrderLineId: body?.salesOrderLineId ? String(body.salesOrderLineId) : null,
      quantity: Math.floor(quantity),
      reservedFrom,
      reservedTo,
      notes: body?.notes ? String(body.notes) : null,
      active: true,
    },
    include: { inventoryItem: true },
  });

  return NextResponse.json(created, { status: 201 });
}
