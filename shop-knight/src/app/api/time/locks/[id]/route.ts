import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAll } from '@/lib/time-access';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
  if (!canManageAll(session.user.permissions || [])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const lock = await prisma.payPeriodLock.findUnique({ where: { id } });
  if (!lock || lock.companyId !== companyId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.payPeriodLock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
