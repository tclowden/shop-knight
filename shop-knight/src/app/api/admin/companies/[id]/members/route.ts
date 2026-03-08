import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/api-auth';

async function ensureUserHasActiveCompany(userId: string) {
  const memberships = await prisma.userCompany.findMany({
    where: { userId },
    select: { companyId: true },
    orderBy: { companyId: 'asc' },
  });

  const nextActiveCompanyId = memberships[0]?.companyId ?? null;
  await prisma.user.update({ where: { id: userId }, data: { activeCompanyId: nextActiveCompanyId } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { id: companyId } = await params;
  const body = await req.json();
  const userId = String(body?.userId || '').trim();
  const makeActive = body?.makeActive !== false;

  if (!companyId || !userId) {
    return NextResponse.json({ error: 'companyId and userId required' }, { status: 400 });
  }

  const [company, user] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (!company) return NextResponse.json({ error: 'company not found' }, { status: 404 });
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId, companyId } },
    update: {},
    create: { userId, companyId },
  });

  if (makeActive) {
    await prisma.user.update({ where: { id: userId }, data: { activeCompanyId: companyId } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { id: companyId } = await params;
  const body = await req.json();
  const userId = String(body?.userId || '').trim();

  if (!companyId || !userId) {
    return NextResponse.json({ error: 'companyId and userId required' }, { status: 400 });
  }

  const membership = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  if (!membership) return NextResponse.json({ error: 'membership not found' }, { status: 404 });

  await prisma.userCompany.delete({ where: { userId_companyId: { userId, companyId } } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeCompanyId: true } });
  if (user?.activeCompanyId === companyId) {
    await ensureUserHasActiveCompany(userId);
  }

  return NextResponse.json({ ok: true });
}
