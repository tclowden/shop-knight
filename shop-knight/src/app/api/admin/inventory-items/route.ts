import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

async function generateNextInventoryItemNumber(companyId: string) {
  const rows = await prisma.$queryRaw<Array<{ nextnum: number }>>`
    SELECT COALESCE(MAX(CASE WHEN "itemNumber" ~ '^[0-9]+$' THEN "itemNumber"::bigint ELSE 0 END), 0) + 1 AS nextnum
    FROM "InventoryItem"
    WHERE "companyId" = ${companyId}
  `;

  const next = Number(rows?.[0]?.nextnum || 1);
  return String(Number.isFinite(next) && next > 0 ? next : 1);
}

export async function GET(req: Request) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const items = await prisma.inventoryItem.findMany({
    where:
      archivedMode === 'only'
        ? withCompany(companyId, { active: false })
        : archivedMode === 'all'
          ? withCompany(companyId)
          : withCompany(companyId, { active: true }),
    orderBy: { name: 'asc' },
  });

  const now = new Date();
  const itemIds = items.map((i) => i.id);
  const reservations = itemIds.length
    ? await prisma.inventoryReservation.groupBy({
        by: ['inventoryItemId'],
        where: withCompany(companyId, {
          active: true,
          inventoryItemId: { in: itemIds },
          reservedFrom: { lte: now },
          reservedTo: { gte: now },
        }),
        _sum: { quantity: true },
      })
    : [];

  const reservedByItem = new Map(reservations.map((r) => [r.inventoryItemId, Number(r._sum.quantity || 0)]));

  const payload = items.map((item) => {
    const reservedQty = reservedByItem.get(item.id) || 0;
    const checkedOutQty = Number(item.checkedOutQty || 0);
    const totalQty = Number(item.totalQty || 0);
    const availableQty = totalQty - reservedQty - checkedOutQty;
    return { ...item, reservedQty, availableQty };
  });

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.inventory.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const requestedItemNumber = String(body?.itemNumber || '').trim();
  const totalQty = Number(body?.totalQty ?? 0);

  if (!name || !Number.isFinite(totalQty) || totalQty < 0) {
    return NextResponse.json({ error: 'name and totalQty (>=0) are required' }, { status: 400 });
  }

  try {
    let attempts = 0;
    while (attempts < 3) {
      attempts += 1;
      const itemNumber = requestedItemNumber || await generateNextInventoryItemNumber(companyId);

      try {
        const created = await prisma.inventoryItem.create({
          data: {
            companyId,
            itemNumber,
            name,
            category: body?.category ? String(body.category) : null,
            location: body?.location ? String(body.location) : null,
            totalQty: Math.floor(totalQty),
            notes: body?.notes ? String(body.notes) : null,
            active: true,
          },
        });
        return NextResponse.json(created, { status: 201 });
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as { code?: string }).code === 'P2002' &&
          !requestedItemNumber
        ) {
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ error: 'Failed to auto-assign item number. Please try again.' }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'Item number already exists or item could not be created' }, { status: 409 });
  }
}
