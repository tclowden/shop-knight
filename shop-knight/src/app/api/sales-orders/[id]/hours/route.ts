import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCompanyId, requireRoles } from '@/lib/api-auth';

function computeEffectiveMinutes(clockInAt: Date, clockOutAt: Date | null, minutesWorked: number | null) {
  if (typeof minutesWorked === 'number' && Number.isFinite(minutesWorked)) return Math.max(0, minutesWorked);
  const end = clockOutAt ?? new Date();
  return Math.max(0, Math.round((end.getTime() - clockInAt.getTime()) / 60000));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'SALES', 'OPERATIONS', 'PURCHASING', 'FINANCE']);
  if (!auth.ok) return auth.response;

  const companyId = getSessionCompanyId(auth.session);
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 });

  const url = new URL(request.url);
  const fromRaw = url.searchParams.get('from') || '';
  const toRaw = url.searchParams.get('to') || '';

  const fromDate = fromRaw ? new Date(`${fromRaw}T00:00:00`) : null;
  if (fromRaw && Number.isNaN(fromDate?.getTime() || NaN)) {
    return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
  }

  const toExclusiveDate = toRaw ? new Date(`${toRaw}T00:00:00`) : null;
  if (toRaw && Number.isNaN(toExclusiveDate?.getTime() || NaN)) {
    return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
  }
  if (toExclusiveDate) toExclusiveDate.setDate(toExclusiveDate.getDate() + 1);

  const { id } = await params;
  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id, companyId },
    select: { id: true, projectManagerId: true },
  });

  if (!salesOrder) return NextResponse.json({ error: 'Sales order not found' }, { status: 404 });

  const sessionUserId = String(auth.session.user.id || '');
  const sessionEmail = String(auth.session.user.email || '').trim().toLowerCase();
  const roles = auth.session.user.roles || (auth.session.user.role ? [auth.session.user.role] : []);
  const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  const isAssignedProjectManagerById = Boolean(salesOrder.projectManagerId && salesOrder.projectManagerId === sessionUserId);

  let isAssignedProjectManagerByEmail = false;
  if (!isAssignedProjectManagerById && salesOrder.projectManagerId && sessionEmail) {
    const pm = await prisma.user.findUnique({ where: { id: salesOrder.projectManagerId }, select: { email: true } });
    isAssignedProjectManagerByEmail = Boolean(pm?.email && pm.email.toLowerCase() === sessionEmail);
  }

  if (!isAdmin && !isAssignedProjectManagerById && !isAssignedProjectManagerByEmail) {
    return NextResponse.json({ error: 'Only the assigned project manager can view this hours summary' }, { status: 403 });
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      salesOrderId: salesOrder.id,
      ...(fromDate || toExclusiveDate
        ? {
            clockInAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toExclusiveDate ? { lt: toExclusiveDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { clockInAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
    take: 500,
  });

  const normalized = entries.map((entry) => {
    const effectiveMinutes = computeEffectiveMinutes(entry.clockInAt, entry.clockOutAt, entry.minutesWorked);
    return {
      id: entry.id,
      userId: entry.userId,
      userName: entry.user?.name || 'Unknown User',
      clockInAt: entry.clockInAt,
      clockOutAt: entry.clockOutAt,
      minutesWorked: effectiveMinutes,
      status: entry.status,
      notes: entry.notes,
    };
  });

  const totalMinutes = normalized.reduce((sum, row) => sum + row.minutesWorked, 0);

  return NextResponse.json({
    totalMinutes,
    entries: normalized,
  });
}
