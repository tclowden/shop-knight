import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAll } from '@/lib/time-access';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

  const rows = await prisma.payPeriodLock.findMany({
    where: { companyId },
    include: { lockedBy: { select: { id: true, name: true } } },
    orderBy: { startDate: 'desc' },
    take: 20,
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });
  if (!canManageAll(session.user.permissions || [])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const startDate = body?.startDate ? new Date(body.startDate) : null;
  const endDate = body?.endDate ? new Date(body.endDate) : null;
  if (!startDate || !endDate || Number.isNaN(+startDate) || Number.isNaN(+endDate)) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  const created = await prisma.payPeriodLock.create({
    data: {
      companyId,
      startDate,
      endDate,
      note: typeof body?.note === 'string' ? body.note : null,
      lockedById: session.user.id,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
