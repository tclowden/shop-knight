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

  const items = await prisma.machine.findMany({
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
  const costPerMinute = toNumber(body?.costPerMinute);
  const setupMinutes = body?.setupMinutes === '' || body?.setupMinutes === undefined ? null : toNumber(body?.setupMinutes);
  const hourlyCapacity = body?.hourlyCapacity === '' || body?.hourlyCapacity === undefined ? null : toNumber(body?.hourlyCapacity);

  if (!name || costPerMinute === null) {
    return NextResponse.json({ error: 'name and costPerMinute are required' }, { status: 400 });
  }

  try {
    const created = await prisma.machine.create({
      data: {
        companyId,
        name,
        costPerMinute,
        setupMinutes,
        hourlyCapacity,
        notes: body?.notes ? String(body.notes) : null,
        active: true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Machine already exists or could not be created' }, { status: 409 });
  }
}
