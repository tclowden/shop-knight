import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const companyId = String(body?.companyId || '');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const membership = await prisma.userCompany.findUnique({ where: { userId_companyId: { userId, companyId } } });
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.user.update({ where: { id: userId }, data: { activeCompanyId: companyId } });
  return NextResponse.json({ ok: true });
}
