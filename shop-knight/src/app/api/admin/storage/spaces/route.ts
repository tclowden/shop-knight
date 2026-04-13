import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const archivedMode = searchParams.get('archived');

  const rows = await prisma.storageSpace.findMany({
    where:
      archivedMode === 'only'
        ? withCompany(companyId, { active: false })
        : archivedMode === 'all'
          ? withCompany(companyId)
          : withCompany(companyId, { active: true }),
    include: { rack: true, _count: { select: { bins: true } } },
    orderBy: [{ name: 'asc' }],
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN', 'STORAGE']);
  if (!auth.ok) return auth.response;
  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const rackId = String(body?.rackId || '').trim();
  const name = String(body?.name || '').trim();
  const code = String(body?.code || '').trim() || null;

  if (!rackId || !name) return NextResponse.json({ error: 'rackId and name are required' }, { status: 400 });

  const rack = await prisma.storageRack.findFirst({ where: withCompany(companyId, { id: rackId }) });
  if (!rack) return NextResponse.json({ error: 'Rack not found' }, { status: 404 });

  try {
    const created = await prisma.storageSpace.create({
      data: { companyId, rackId, name, code, active: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Space already exists or could not be created' }, { status: 409 });
  }
}
