import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const items = await prisma.substrate.findMany({
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
  const addOnPrice = toNumber(body?.addOnPrice);

  if (!name || addOnPrice === null) {
    return NextResponse.json({ error: 'name and pricePerSqUnit are required' }, { status: 400 });
  }

  const existing = await prisma.substrate.findFirst({ where: withCompany(companyId, { name }) });

  if (existing) {
    if (existing.active) {
      return NextResponse.json({ error: 'A substrate with that name already exists. Edit or archive/restore it instead.' }, { status: 409 });
    }

    const restored = await prisma.substrate.update({
      where: { id: existing.id },
      data: {
        active: true,
        addOnPrice,
        notes: body?.notes ? String(body.notes) : null,
      },
    });

    return NextResponse.json(restored, { status: 200 });
  }

  try {
    const created = await prisma.substrate.create({
      data: {
        companyId,
        name,
        addOnPrice,
        notes: body?.notes ? String(body.notes) : null,
        active: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not create substrate. Please try again.' }, { status: 409 });
  }
}
