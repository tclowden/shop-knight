import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canManageAll, canManageTeam, getManagedUserIds, getPayPeriodLock } from '@/lib/time-access';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = session.user.companyId;
  if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'mine';
  const status = url.searchParams.get('status') || '';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const permissions = session.user.permissions || [];
  let userIds: string[] = [session.user.id];

  if (scope === 'all' && canManageAll(permissions)) {
    const all = await prisma.user.findMany({ where: { activeCompanyId: companyId }, select: { id: true } });
    userIds = all.map((u) => u.id);
  } else if (scope === 'team' && canManageTeam(permissions)) {
    userIds = await getManagedUserIds(companyId, session.user.id);
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      userId: { in: userIds },
      ...(status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}),
      ...(from || to
        ? {
            clockInAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { clockInAt: 'desc' },
    take: 300,
    include: {
      user: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      lastEditedBy: { select: { id: true, name: true } },
      salesOrder: { select: { id: true, orderNumber: true, title: true } },
      quote: { select: { id: true, quoteNumber: true, title: true } },
      job: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const companyId = session.user.companyId;
    if (!companyId) return NextResponse.json({ error: 'No active company selected' }, { status: 400 });

    const permissions = session.user.permissions || [];
    if (!permissions.includes('time.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'clock_in') {
      const open = await prisma.timeEntry.findFirst({ where: { companyId, userId: session.user.id, clockOutAt: null } });
      if (open) return NextResponse.json({ error: 'You already have an open time entry. Clock out first.' }, { status: 400 });

      const lock = await getPayPeriodLock(companyId, new Date());
      if (lock) return NextResponse.json({ error: 'Current pay period is locked. Contact HR Admin.' }, { status: 400 });

      const sourceType = String(body.sourceType || '');
      const sourceId = String(body.sourceId || '');
      if (!['SALES_ORDER', 'QUOTE', 'JOB'].includes(sourceType) || !sourceId) {
        return NextResponse.json({ error: 'sourceType and sourceId are required' }, { status: 400 });
      }

      if (sourceType === 'SALES_ORDER') {
        const so = await prisma.salesOrder.findFirst({ where: { id: sourceId, companyId }, select: { id: true } });
        if (!so) return NextResponse.json({ error: 'Sales order not found in your active company.' }, { status: 400 });
      }
      if (sourceType === 'QUOTE') {
        const quote = await prisma.quote.findFirst({ where: { id: sourceId, companyId }, select: { id: true } });
        if (!quote) return NextResponse.json({ error: 'Quote not found in your active company.' }, { status: 400 });
      }
      if (sourceType === 'JOB') {
        const job = await prisma.job.findFirst({ where: { id: sourceId, companyId }, select: { id: true } });
        if (!job) return NextResponse.json({ error: 'Job not found in your active company.' }, { status: 400 });
      }

      const data: Record<string, unknown> = {
        companyId,
        userId: session.user.id,
        sourceType,
        clockInAt: new Date(),
        notes: typeof body.notes === 'string' ? body.notes : null,
      };

      if (sourceType === 'SALES_ORDER') data.salesOrderId = sourceId;
      if (sourceType === 'QUOTE') data.quoteId = sourceId;
      if (sourceType === 'JOB') data.jobId = sourceId;

      const created = await prisma.timeEntry.create({ data: data as never });
      return NextResponse.json(created, { status: 201 });
    }

    if (action === 'clock_out') {
      const open = await prisma.timeEntry.findFirst({ where: { companyId, userId: session.user.id, clockOutAt: null }, orderBy: { clockInAt: 'desc' } });
      if (!open) return NextResponse.json({ error: 'No open time entry to clock out' }, { status: 400 });

      const lock = await getPayPeriodLock(companyId, open.clockInAt);
      if (lock) return NextResponse.json({ error: 'This pay period is locked. Contact HR Admin.' }, { status: 400 });

      const clockOutAt = new Date();
      const minutesWorked = Math.max(0, Math.round((clockOutAt.getTime() - open.clockInAt.getTime()) / 60000));
      const updated = await prisma.timeEntry.update({
        where: { id: open.id },
        data: { clockOutAt, minutesWorked, status: 'PENDING' },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clock-in failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
