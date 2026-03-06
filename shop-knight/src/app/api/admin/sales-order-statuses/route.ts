import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

const DEFAULTS = ['New', 'In Progress', 'Complete'];

async function ensureDefaults(companyId: string) {
  for (let i = 0; i < DEFAULTS.length; i += 1) {
    const name = DEFAULTS[i];
    await prisma.salesOrderStatus.upsert({
      where: { companyId_name: { companyId, name } },
      update: { active: true, sortOrder: i + 1 },
      create: { companyId, name, active: true, sortOrder: i + 1 },
    });
  }
}

export async function GET() {
  const auth = await requirePermissions(['admin.salesOrderStatuses.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  await ensureDefaults(companyId);
  const statuses = await prisma.salesOrderStatus.findMany({
    where: withCompany(companyId),
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(statuses);
}

export async function POST(req: Request) {
  const auth = await requirePermissions(['admin.salesOrderStatuses.manage']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json();
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const max = await prisma.salesOrderStatus.aggregate({
    where: withCompany(companyId),
    _max: { sortOrder: true },
  });

  try {
    const created = await prisma.salesOrderStatus.create({
      data: {
        companyId,
        name,
        active: body?.active !== undefined ? Boolean(body.active) : true,
        sortOrder: Number(max._max.sortOrder || 0) + 1,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'status already exists' }, { status: 409 });
  }
}
