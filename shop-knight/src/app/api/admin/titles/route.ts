import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requirePermissions, withCompany } from '@/lib/api-auth';

async function authorizeTitles() {
  const primary = await requirePermissions(['admin.titles.manage']);
  if (primary.ok) return primary;
  const fallback = await requirePermissions(['admin.users.manage']);
  if (fallback.ok) return fallback;
  return primary;
}

export async function GET(req: Request) {
  const auth = await authorizeTitles();
  if (!auth.ok) return auth.response;

  const activeCompanyId = getSessionCompanyId(auth.session);
  if (!activeCompanyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const requestedCompanyId = String(searchParams.get('companyId') || '').trim();
  const companyId = requestedCompanyId || activeCompanyId;

  if (companyId !== activeCompanyId) {
    const userId = String((auth.session.user as { id?: string } | undefined)?.id || '');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const membership = await prisma.userCompany.findFirst({ where: { userId, companyId }, select: { userId: true } });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden for requested company' }, { status: 403 });
    }
  }

  const items = await prisma.title.findMany({
    where: withCompany(companyId),
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const auth = await authorizeTitles();
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  try {
    const created = await prisma.title.create({
      data: { companyId, name, active: body?.active === undefined ? true : Boolean(body.active) },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Title already exists or could not be created' }, { status: 409 });
  }
}
