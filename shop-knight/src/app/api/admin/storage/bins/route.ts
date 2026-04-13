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

  const rows = await prisma.storageBin.findMany({
    where:
      archivedMode === 'only'
        ? withCompany(companyId, { active: false })
        : archivedMode === 'all'
          ? withCompany(companyId)
          : withCompany(companyId, { active: true }),
    include: { space: { include: { rack: true } } },
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
  const spaceId = String(body?.spaceId || '').trim();
  const name = String(body?.name || '').trim();
  const code = String(body?.code || '').trim() || null;

  if (!spaceId || !name) return NextResponse.json({ error: 'spaceId and name are required' }, { status: 400 });

  const space = await prisma.storageSpace.findFirst({ where: withCompany(companyId, { id: spaceId }) });
  if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 404 });

  try {
    const created = await prisma.storageBin.create({
      data: { companyId, spaceId, name, code, active: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Bin already exists or could not be created' }, { status: 409 });
  }
}
