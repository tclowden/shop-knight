import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['SALES_REP', 'PROJECT_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const itemId = String(searchParams.get('itemId') || '');
  const from = new Date(String(searchParams.get('from') || ''));
  const to = new Date(String(searchParams.get('to') || ''));

  if (!itemId || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: 'itemId, from, and to are required (from <= to)' }, { status: 400 });
  }

  const item = await prisma.inventoryItem.findFirst({ where: withCompany(companyId, { id: itemId, active: true }) });
  if (!item) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });

  const reservations = await prisma.inventoryReservation.findMany({
    where: withCompany(companyId, {
      inventoryItemId: itemId,
      active: true,
      reservedFrom: { lte: to },
      reservedTo: { gte: from },
    }),
    select: { quantity: true },
  });

  const reservedQty = reservations.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  const onHandQty = Number(item.totalQty || 0);
  const availableQty = onHandQty - reservedQty;

  return NextResponse.json({
    itemId,
    onHandQty,
    reservedQty,
    availableQty,
    from: from.toISOString(),
    to: to.toISOString(),
  });
}
