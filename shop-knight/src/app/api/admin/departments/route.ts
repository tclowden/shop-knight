import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles, withCompany } from '@/lib/api-auth';

export async function GET() {
  const auth = await requireRoles(['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const items = await prisma.department.findMany({
    where: withCompany(companyId),
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
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  try {
    const created = await prisma.department.create({
      data: { companyId, name, active: body?.active === undefined ? true : Boolean(body.active) },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Department already exists or could not be created' }, { status: 409 });
  }
}
