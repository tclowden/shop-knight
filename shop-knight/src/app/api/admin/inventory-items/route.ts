import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
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

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const itemNumber = String(body?.itemNumber || '').trim();
  const totalQty = Number(body?.totalQty ?? 0);

  if (!name || !itemNumber || !Number.isFinite(totalQty) || totalQty < 0) {
    return NextResponse.json({ error: 'name, itemNumber, and totalQty (>=0) are required' }, { status: 400 });
  }

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
  } catch {
    return NextResponse.json({ error: 'Item number already exists or item could not be created' }, { status: 409 });
  }
}
